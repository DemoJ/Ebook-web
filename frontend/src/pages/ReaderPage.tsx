import { ArrowLeft, ChevronLeft, ChevronRight, List, Moon, Settings2, Sun, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import { booksApi } from "../api/books";
import { useAuth } from "../auth/AuthContext";
import { ErrorState, getErrorMessage, LoadingState } from "../components/States";
import { useEpubReader } from "../reader/useEpubReader";
import type { Book, TocItem } from "../types";

export function ReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [panel, setPanel] = useState<"toc" | "settings" | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => loadReaderSettings(user?.id).theme);
  const [fontSize, setFontSize] = useState(() => loadReaderSettings(user?.id).fontSize);
  const [metaError, setMetaError] = useState("");
  const [chromeVisible, setChromeVisible] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);
  const reader = useEpubReader(id, container);

  useEffect(() => {
    saveReaderSettings(user?.id, { theme, fontSize });
  }, [fontSize, theme, user?.id]);

  useEffect(() => {
    if (!id) return;
    booksApi.get(id).then(setBook).catch((e) => setMetaError(getErrorMessage(e)));
  }, [id]);

  useEffect(() => {
    const rendition = reader.rendition.current;
    if (!rendition || reader.loading) return;
    rendition.themes.register("light", {
      body: {
        color: "#2b2924",
        background: "#fbfaf6",
        "font-size": "18px",
        "line-height": "1.85",
      },
      "p, li, div": { "line-height": "1.85" },
      a: { color: "#9a4e33" },
    });
    rendition.themes.register("dark", {
      body: {
        color: "#c8cdd3",
        background: "#1a1c1f",
        "font-size": "18px",
        "line-height": "1.85",
      },
      "p, li, div": { "line-height": "1.85" },
      a: { color: "#8ab4f8" },
    });
  }, [reader.loading]);

  useEffect(() => {
    const rendition = reader.rendition.current;
    if (!rendition || reader.loading) return;
    const colors = theme === "dark"
      ? { background: "#1a1c1f", text: "#c8cdd3" }
      : { background: "#fbfaf6", text: "#2b2924" };

    rendition.themes.select(theme);
    rendition.themes.override("background", colors.background, true);
    rendition.themes.override("background-color", colors.background, true);
    rendition.themes.override("color", colors.text, true);
    rendition.themes.fontSize(`${fontSize}%`);
  }, [theme, fontSize, reader.loading]);

  useEffect(() => {
    if (reader.loading) return;
    const frame = window.requestAnimationFrame(() => {
      reader.resizeToContainer();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chromeVisible, panel, reader.loading, reader.resizeToContainer]);

  useEffect(() => {
    if (reader.loading) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        reader.rendition.current?.next();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        reader.rendition.current?.prev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reader.loading]);

  function display(href: string) {
    reader.rendition.current?.display(href);
    setPanel(null);
  }

  function prevPage(event?: { currentTarget?: HTMLElement }) {
    event?.currentTarget?.blur();
    reader.rendition.current?.prev();
  }

  function nextPage(event?: { currentTarget?: HTMLElement }) {
    event?.currentTarget?.blur();
    reader.rendition.current?.next();
  }

  function onTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    suppressTapRef.current = false;
  }

  function onTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    event.preventDefault();
    suppressTapRef.current = true;
    if (deltaX < 0) nextPage();
    else prevPage();
  }

  function onTapZoneClick(
    event: ReactMouseEvent<HTMLButtonElement>,
    action: (event: ReactMouseEvent<HTMLButtonElement>) => void,
  ) {
    if (suppressTapRef.current) {
      suppressTapRef.current = false;
      event.preventDefault();
      return;
    }
    action(event);
  }

  function toggleChrome() {
    if (panel) {
      setPanel(null);
      return;
    }
    setChromeVisible((value) => !value);
  }

  function openPanel(next: "toc" | "settings") {
    setChromeVisible(true);
    setPanel((current) => (current === next ? null : next));
  }

  const error = metaError || reader.error;
  const percent = Math.round(reader.progress * 100);
  const chromeOpen = chromeVisible || !!panel;

  return (
    <main className={`reader-page ${theme} ${chromeOpen ? "chrome-open" : "chrome-hidden"}`}>
      <header className="reader-header">
        <Link to="/shelf" onClick={reader.saveNow} className="reader-back">
          <ArrowLeft />书架
        </Link>
        <div className="reader-title">
          <b>{book?.title || "正在打开…"}</b>
          <span>{book?.author}</span>
        </div>
        <div className="reader-tools">
          <span className="reader-percent">{percent}%</span>
          <button className="icon-button" onClick={() => openPanel("toc")} title="目录">
            <List />
          </button>
          <button className="icon-button" onClick={() => openPanel("settings")} title="阅读设置">
            <Settings2 />
          </button>
        </div>
      </header>
      <div className="reader-progress">
        <i style={{ width: `${percent}%` }} />
      </div>
      <section className="reader-stage">
        <button
          type="button"
          className="reader-nav prev"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => prevPage(e)}
          aria-label="上一页"
        >
          <ChevronLeft />
        </button>
        <div ref={setContainer} className="epub-container" />
        <div
          className="reader-tap-zones"
          aria-hidden={!chromeOpen}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button type="button" className="tap-zone left" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={(e) => onTapZoneClick(e, prevPage)} aria-label="上一页" />
          <button type="button" className="tap-zone mid" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={(e) => onTapZoneClick(e, toggleChrome)} aria-label="显示或隐藏菜单" />
          <button type="button" className="tap-zone right" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={(e) => onTapZoneClick(e, nextPage)} aria-label="下一页" />
        </div>
        {reader.loading && (
          <div className="reader-overlay">
            <LoadingState label="正在铺开书页…" />
          </div>
        )}
        {error && (
          <div className="reader-overlay">
            <ErrorState message={error} />
          </div>
        )}
        <button
          type="button"
          className="reader-nav next"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => nextPage(e)}
          aria-label="下一页"
        >
          <ChevronRight />
        </button>
      </section>
      {panel && (
        <aside className="reader-panel">
          <header>
            <h2>{panel === "toc" ? "目录" : "阅读设置"}</h2>
            <button className="icon-button" onClick={() => setPanel(null)}>
              <X />
            </button>
          </header>
          {panel === "toc" ? (
            <nav className="toc-list">
              {reader.toc.length ? (
                reader.toc.map((item) => (
                  <TocEntry key={item.id || item.href} item={item} display={display} />
                ))
              ) : (
                <p>此书没有目录</p>
              )}
            </nav>
          ) : (
            <div className="reader-settings">
              <label>
                字号 <span>{fontSize}%</span>
              </label>
              <input
                type="range"
                min="80"
                max="160"
                step="10"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <label>页面主题</label>
              <div className="theme-options">
                <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
                  <Sun />浅色
                </button>
                <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
                  <Moon />深色
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
      <footer className="reader-footer">
        <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={(e) => prevPage(e)}>
          <ChevronLeft />上一页
        </button>
        <span>{percent}%</span>
        <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={(e) => nextPage(e)}>
          下一页<ChevronRight />
        </button>
      </footer>
    </main>
  );
}

function TocEntry({ item, display }: { item: TocItem; display: (href: string) => void }) {
  return (
    <div className="toc-entry">
      <button onClick={() => display(item.href)}>{item.label.trim()}</button>
      {item.subitems?.map((child) => (
        <TocEntry key={child.id || child.href} item={child} display={display} />
      ))}
    </div>
  );
}

type ReaderSettings = { theme: "light" | "dark"; fontSize: number };

function loadReaderSettings(userId?: number): ReaderSettings {
  const defaultFontSize = typeof window !== "undefined"
    && window.matchMedia("(min-width: 701px)").matches ? 120 : 100;
  const defaults = { theme: "light" as const, fontSize: defaultFontSize };
  if (!userId || typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(`leafread:reader-settings:${userId}`);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      theme: saved.theme === "dark" ? "dark" : "light",
      fontSize: typeof saved.fontSize === "number" && saved.fontSize >= 80 && saved.fontSize <= 160
        ? saved.fontSize
        : defaultFontSize,
    };
  } catch {
    return defaults;
  }
}

function saveReaderSettings(userId: number | undefined, settings: ReaderSettings) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`leafread:reader-settings:${userId}`, JSON.stringify(settings));
  } catch {
    // Private browsing or disabled storage should not affect reading.
  }
}
