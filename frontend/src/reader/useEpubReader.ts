import ePub, { type Book as EpubBook, type Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";
import { booksApi } from "../api/books";
import type { TocItem } from "../types";
import { getErrorMessage } from "../components/States";

interface LocationEvent {
  start?: { cfi?: string; percentage?: number };
}

export function useEpubReader(bookId: string | undefined, container: HTMLDivElement | null) {
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const latestRef = useRef({ location: "", percentage: 0 });
  const timerRef = useRef<number | undefined>(undefined);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookId || !container) return;
    let active = true;
    let resizeObserver: ResizeObserver | undefined;
    let resizeTimer: number | undefined;

    async function initialize() {
      try {
        setLoading(true);
        setError("");
        const [response, saved] = await Promise.all([
          fetch(booksApi.fileUrl(bookId!), { credentials: "include" }),
          booksApi.progress(bookId!).catch(() => null),
        ]);
        if (!response.ok) throw new Error(`无法加载书籍文件（${response.status}）`);
        const epub = ePub(await response.arrayBuffer());
        bookRef.current = epub;
        await epub.ready;
        await epub.locations.generate(1200);
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
        await rendition.display(saved?.location || undefined);
        if (!active) return;
        if (saved?.percentage != null) setProgress(saved.percentage / 100);

        const safeResize = () => {
          const next = renditionRef.current as (Rendition & {
            manager?: { resize?: (w: number, h: number) => void };
          }) | null;
          if (!next?.manager?.resize) return;
          const nextWidth = container!.clientWidth;
          const nextHeight = container!.clientHeight;
          if (nextWidth <= 0 || nextHeight <= 0) return;
          try {
            next.resize(nextWidth, nextHeight);
          } catch {
            // epub.js may throw while views are not ready
          }
        };

        resizeObserver = new ResizeObserver(() => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(safeResize, 80);
        });
        resizeObserver.observe(container!);
        setLoading(false);
      } catch (nextError) {
        if (active) {
          setError(getErrorMessage(nextError));
          setLoading(false);
        }
      }
    }

    initialize();
    return () => {
      active = false;
      saveNow();
      window.clearTimeout(timerRef.current);
      window.clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [bookId, container]);

  function onRelocated(location: LocationEvent) {
    const cfi = location.start?.cfi || "";
    const ratio = location.start?.percentage
      ?? (bookRef.current?.locations.percentageFromCfi(cfi) || 0);
    latestRef.current = { location: cfi, percentage: Math.min(100, Math.max(0, ratio * 100)) };
    setProgress(ratio);
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

  return { toc, progress, loading, error, rendition: renditionRef, saveNow };
}
