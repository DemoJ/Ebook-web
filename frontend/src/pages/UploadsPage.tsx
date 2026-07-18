import { Edit3, FileUp, LoaderCircle, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { booksApi, type BookMetadata } from "../api/books";
import { BookCover } from "../components/BookCover";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, getErrorMessage, LoadingState } from "../components/States";
import type { Book } from "../types";

export function UploadsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [editing, setEditing] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    booksApi.uploads()
      .then(setBooks)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function upload(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".epub")) {
      setError("仅支持 EPUB 格式文件");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const book = await booksApi.upload(file);
      setBooks((old) => [book, ...old]);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(book: Book) {
    if (!confirm(`确定永久删除《${book.title}》吗？此操作不可恢复。`)) return;
    try {
      await booksApi.delete(book.id);
      setBooks((old) => old.filter((item) => item.id !== book.id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function save(metadata: BookMetadata) {
    if (!editing) return;
    const updated = await booksApi.update(editing.id, metadata);
    setBooks((old) => old.map((book) => (book.id === updated.id ? updated : book)));
    setEditing(null);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PERSONAL COLLECTION</p>
          <h1>我的上传</h1>
          <p>管理你带进书房的 EPUB 与分享状态。</p>
        </div>
        <button className="button primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <LoaderCircle className="spin" /> : <FileUp />}
          {uploading ? "正在上传" : "上传 EPUB"}
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".epub,application/epub+zip"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </header>
      {error && (
        <div className="inline-error">
          {error}
          <button onClick={() => setError("")}>关闭</button>
        </div>
      )}
      {loading ? (
        <LoadingState />
      ) : error && books.length === 0 ? (
        <ErrorState message={error} retry={load} />
      ) : books.length === 0 ? (
        <EmptyState
          title="还没有上传书籍"
          text="上传 EPUB 文件，系统会自动读取书名、作者和封面。"
          action={<button className="button primary" onClick={() => inputRef.current?.click()}>选择 EPUB</button>}
        />
      ) : (
        <div className="upload-list">
          {books.map((book) => (
            <article className="upload-row" key={book.id}>
              <BookCover book={book} compact />
              <div className="upload-info">
                <h3>{book.title}</h3>
                <p>{book.author || "未知作者"}</p>
                <span>
                  {book.visibility === "shared" ? <><Share2 />已共享</> : "仅自己可见"}
                  {" · "}
                  上传于 {new Date(book.created_at).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <div className="row-actions">
                <button className="button ghost" onClick={() => setEditing(book)}>
                  <Edit3 />编辑
                </button>
                <button className="button ghost danger" onClick={() => remove(book)}>
                  <Trash2 />删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <MetadataModal book={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function MetadataModal({
  book,
  onClose,
  onSave,
}: {
  book: Book;
  onClose: () => void;
  onSave: (value: BookMetadata) => Promise<void>;
}) {
  const [value, setValue] = useState<BookMetadata>({
    title: book.title,
    author: book.author,
    visibility: book.visibility,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(value);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="编辑书籍信息" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label>
          书名
          <input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} required />
        </label>
        <label>
          作者
          <input value={value.author} onChange={(e) => setValue({ ...value, author: e.target.value })} />
        </label>
        <div className="visibility-picker">
          <button
            type="button"
            className={value.visibility === "private" ? "active" : ""}
            onClick={() => setValue({ ...value, visibility: "private" })}
          >
            <b>私人</b>
            <span>仅自己可见</span>
          </button>
          <button
            type="button"
            className={value.visibility === "shared" ? "active" : ""}
            onClick={() => setValue({ ...value, visibility: "shared" })}
          >
            <b>共享</b>
            <span>所有用户可发现</span>
          </button>
        </div>
        <footer className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>取消</button>
          <button className="button primary" disabled={busy}>{busy ? "保存中…" : "保存修改"}</button>
        </footer>
      </form>
    </Modal>
  );
}
