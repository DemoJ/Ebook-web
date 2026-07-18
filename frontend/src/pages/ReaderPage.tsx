import { ArrowLeft, ChevronLeft, ChevronRight, List, Moon, Settings2, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { booksApi } from "../api/books";
import { ErrorState, getErrorMessage, LoadingState } from "../components/States";
import { useEpubReader } from "../reader/useEpubReader";
import type { Book, TocItem } from "../types";

export function ReaderPage() {
  const { id } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [panel, setPanel] = useState<"toc" | "settings" | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontSize, setFontSize] = useState(100);
  const [metaError, setMetaError] = useState("");
  const reader = useEpubReader(id, container);

  useEffect(() => {
    if (!id) return;
    booksApi.get(id).then(setBook).catch((e) => setMetaError(getErrorMessage(e)));
  }, [id]);

  useEffect(() => {
    const rendition = reader.rendition.current;
    if (!rendition) return;
    rendition.themes.register("light", {
      body: { color: "#2b2924", background: "#fbfaf6" },
      "p, li": { "line-height": "1.8" },
      a: { color: "#9a4e33" },
    });
    rendition.themes.register("dark", {
      body: { color: "#d8d3c8", background: "#1b1d1b" },
      "p, li": { "line-height": "1.8" },
      a: { color: "#d99672" },
    });
    rendition.themes.select(theme);
    rendition.themes.fontSize(`${fontSize}%`);
  }, [theme, fontSize, reader.loading]);

  function display(href: string) {
    reader.rendition.current?.display(href);
    setPanel(null);
  }

  const error = metaError || reader.error;
  const percent = Math.round(reader.progress * 100);

  return (
    <main className={`reader-page ${theme}`}>
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
          <button className="icon-button" onClick={() => setPanel(panel === "toc" ? null : "toc")} title="目录">
            <List />
          </button>
          <button
            className="icon-button"
            onClick={() => setPanel(panel === "settings" ? null : "settings")}
            title="阅读设置"
          >
            <Settings2 />
          </button>
        </div>
      </header>
      <div className="reader-progress">
        <i style={{ width: `${percent}%` }} />
      </div>
      <section className="reader-stage">
        <button className="reader-nav prev" onClick={() => reader.rendition.current?.prev()} aria-label="上一页">
          <ChevronLeft />
        </button>
        <div ref={setContainer} className="epub-container" />
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
        <button className="reader-nav next" onClick={() => reader.rendition.current?.next()} aria-label="下一页">
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
        <button onClick={() => reader.rendition.current?.prev()}>
          <ChevronLeft />上一页
        </button>
        <span>{percent}%</span>
        <button onClick={() => reader.rendition.current?.next()}>
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
