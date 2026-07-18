import type { Book, ReadingProgress } from "../types";
import { queryString, request } from "./client";

export interface BookMetadata {
  title: string;
  author: string;
  visibility: "private" | "shared";
}

export const booksApi = {
  shelf: (q = "") => request<Book[]>(`/books/shelf${queryString({ q })}`),
  uploads: (q = "") => request<Book[]>(`/books/mine${queryString({ q })}`),
  shared: (q = "") => request<Book[]>(`/books/shared${queryString({ q })}`),
  get: (id: number | string) => request<Book>(`/books/${id}`),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<Book>("/books", { method: "POST", body });
  },
  update: (id: number | string, metadata: Partial<BookMetadata>) =>
    request<Book>(`/books/${id}`, { method: "PUT", body: JSON.stringify(metadata) }),
  delete: (id: number | string) => request<void>(`/books/${id}`, { method: "DELETE" }),
  addToShelf: (id: number | string) => request<void>(`/books/${id}/shelf`, { method: "POST" }),
  removeFromShelf: (id: number | string) => request<void>(`/books/${id}/shelf`, { method: "DELETE" }),
  fileUrl: (id: number | string) => `/api/books/${id}/file`,
  coverUrl: (id: number | string) => `/api/books/${id}/cover`,
  progress: (id: number | string) => request<ReadingProgress>(`/books/${id}/progress`),
  saveProgress: (
    id: number | string,
    progress: { location: string; percentage: number; chapter?: string | null },
  ) => request<ReadingProgress>(`/books/${id}/progress`, {
    method: "PUT",
    body: JSON.stringify(progress),
  }),
};
