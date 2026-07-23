import ePub, { type Book as EpubBook, type Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";
import { booksApi } from "../api/books";
import type { TocItem } from "../types";
import { getErrorMessage } from "../components/States";
import { loadCachedLocations, loadEpubBuffer, saveCachedLocations } from "./epubCache";

interface LocationEvent {
  start?: { cfi?: string; percentage?: number };
}

function yieldToMain() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function useEpubReader(bookId: string | undefined, container: HTMLDivElement | null) {
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(container);
  const latestRef = useRef({ location: "", percentage: 0 });
  const locationsReadyRef = useRef(false);
  const suppressSaveRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  containerRef.current = container;

  function resizeToContainer() {
    const host = containerRef.current;
    const next = renditionRef.current as (Rendition & {
      manager?: { resize?: (w: number, h: number) => void };
    }) | null;
    if (!host || !next?.manager?.resize) return;
    const nextWidth = host.clientWidth;
    const nextHeight = host.clientHeight;
    if (nextWidth <= 0 || nextHeight <= 0) return;
    try {
      next.resize(nextWidth, nextHeight);
    } catch {
      // epub.js may throw while views are not ready
    }
  }

  useEffect(() => {
    if (!bookId || !container) return;
    let active = true;
    let resizeObserver: ResizeObserver | undefined;
    let resizeTimer: number | undefined;
    locationsReadyRef.current = false;
    suppressSaveRef.current = false;
    latestRef.current = { location: "", percentage: 0 };

    function applyProgressFromCfi(epub: EpubBook, cfi: string) {
      if (!cfi) return;
      const ratio = epub.locations.percentageFromCfi(cfi);
      if (typeof ratio !== "number" || Number.isNaN(ratio)) return;
      const percentage = clampPercent(ratio * 100);
      latestRef.current = { location: cfi, percentage };
      setProgress(ratio);
    }

    async function prepareLocations(epub: EpubBook, id: string) {
      await yieldToMain();
      if (!active || bookRef.current !== epub) return;

      try {
        await epub.locations.generate(1200);
        if (!active || bookRef.current !== epub) return;
        const serialized = epub.locations.save();
        if (serialized) await saveCachedLocations(id, serialized);
        if (!active || bookRef.current !== epub) return;
        locationsReadyRef.current = true;
        applyProgressFromCfi(epub, latestRef.current.location);
      } catch {
        // 后台生成失败不影响阅读，进度沿用服务端值
      }
    }

    async function initialize() {
      try {
        setLoading(true);
        setError("");
        const [buffer, saved, cachedLocations] = await Promise.all([
          loadEpubBuffer(bookId!),
          booksApi.progress(bookId!).catch(() => null),
          loadCachedLocations(bookId!),
        ]);
        if (!active) return;

        // 先灌入服务端进度，避免 display 触发的 relocated 把进度写成 0
        if (saved?.location) {
          latestRef.current = {
            location: saved.location,
            percentage: saved.percentage ?? 0,
          };
          if (saved.percentage != null) setProgress(saved.percentage / 100);
        }

        const epub = ePub(buffer);
        bookRef.current = epub;
        await epub.ready;
        if (!active) return;

        // 有缓存则同步加载 locations，二次打开进度立刻准确
        if (cachedLocations) {
          epub.locations.load(cachedLocations);
          locationsReadyRef.current = true;
        }

        const navigation = await epub.loaded.navigation;
        if (!active) return;
        setToc(navigation.toc as TocItem[]);

        const width = Math.max(container!.clientWidth, 1);
        const height = Math.max(container!.clientHeight, 1);
        const rendition = epub.renderTo(container!, {
          width,
          height,
          spread: "none",
          flow: "paginated",
        });
        renditionRef.current = rendition;
        rendition.on("relocated", onRelocated);

        // 首屏 display 期间禁止写库，防止瞬时 0% 覆盖真实进度
        suppressSaveRef.current = true;
        await rendition.display(saved?.location || undefined);
        suppressSaveRef.current = false;
        if (!active) return;

        // display 后若 locations 已就绪，用 CFI 校正百分比
        if (locationsReadyRef.current && latestRef.current.location) {
          applyProgressFromCfi(epub, latestRef.current.location);
        }

        resizeObserver = new ResizeObserver(() => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(resizeToContainer, 80);
        });
        resizeObserver.observe(container!);
        setLoading(false);

        // 无缓存时后台生成，不阻塞首屏
        if (!locationsReadyRef.current) {
          void prepareLocations(epub, bookId!);
        }
      } catch (nextError) {
        suppressSaveRef.current = false;
        if (active) {
          setError(getErrorMessage(nextError));
          setLoading(false);
        }
      }
    }

    initialize();
    return () => {
      active = false;
      suppressSaveRef.current = false;
      saveNow();
      window.clearTimeout(timerRef.current);
      window.clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current = null;
      locationsReadyRef.current = false;
    };
  }, [bookId, container]);

  function onRelocated(location: LocationEvent) {
    const cfi = location.start?.cfi || "";
    if (!cfi) return;

    // locations 未就绪时：只更新 CFI，百分比沿用服务端/上次可信值，绝不采信 epub.js 的 0
    let percentage = latestRef.current.percentage;
    if (locationsReadyRef.current) {
      const ratio =
        typeof location.start?.percentage === "number" && !Number.isNaN(location.start.percentage)
          ? location.start.percentage
          : bookRef.current?.locations.percentageFromCfi(cfi) ?? percentage / 100;
      percentage = clampPercent(ratio * 100);
      setProgress(ratio);
    }

    latestRef.current = { location: cfi, percentage };

    if (suppressSaveRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(saveNow, 1500);
  }

  function saveNow() {
    if (!bookId || !latestRef.current.location) return;
    booksApi.saveProgress(bookId, latestRef.current).catch(() => undefined);
  }

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  });

  return { toc, progress, loading, error, rendition: renditionRef, saveNow, resizeToContainer };
}
