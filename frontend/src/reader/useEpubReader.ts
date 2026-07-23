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

export function useEpubReader(bookId: string | undefined, container: HTMLDivElement | null) {
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(container);
  const latestRef = useRef({ location: "", percentage: 0 });
  const locationsReadyRef = useRef(false);
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

    async function prepareLocations(epub: EpubBook, id: string) {
      await yieldToMain();
      if (!active || bookRef.current !== epub) return;

      const cached = await loadCachedLocations(id);
      if (!active || bookRef.current !== epub) return;

      if (cached) {
        epub.locations.load(cached);
      } else {
        await epub.locations.generate(1200);
        if (!active || bookRef.current !== epub) return;
        const serialized = epub.locations.save();
        if (serialized) await saveCachedLocations(id, serialized);
      }

      if (!active || bookRef.current !== epub) return;
      locationsReadyRef.current = true;

      const cfi = latestRef.current.location;
      if (!cfi) return;
      const ratio = epub.locations.percentageFromCfi(cfi) || 0;
      latestRef.current = {
        location: cfi,
        percentage: Math.min(100, Math.max(0, ratio * 100)),
      };
      setProgress(ratio);
    }

    async function initialize() {
      try {
        setLoading(true);
        setError("");
        const [buffer, saved] = await Promise.all([
          loadEpubBuffer(bookId!),
          booksApi.progress(bookId!).catch(() => null),
        ]);
        if (!active) return;

        const epub = ePub(buffer);
        bookRef.current = epub;
        await epub.ready;
        if (!active) return;

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
        if (saved?.percentage != null) {
          setProgress(saved.percentage / 100);
          if (saved.location) {
            latestRef.current = {
              location: saved.location,
              percentage: saved.percentage,
            };
          }
        }

        resizeObserver = new ResizeObserver(() => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(resizeToContainer, 80);
        });
        resizeObserver.observe(container!);
        setLoading(false);

        void prepareLocations(epub, bookId!);
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
      locationsReadyRef.current = false;
    };
  }, [bookId, container]);

  function onRelocated(location: LocationEvent) {
    const cfi = location.start?.cfi || "";
    let ratio = location.start?.percentage;
    if (ratio == null && locationsReadyRef.current) {
      ratio = bookRef.current?.locations.percentageFromCfi(cfi) || 0;
    }
    if (ratio == null) {
      ratio = latestRef.current.percentage / 100;
    }
    latestRef.current = {
      location: cfi,
      percentage: Math.min(100, Math.max(0, ratio * 100)),
    };
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

  return { toc, progress, loading, error, rendition: renditionRef, saveNow, resizeToContainer };
}
