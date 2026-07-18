import type { Book, User } from "../types";
import { queryString, request } from "./client";

export const adminApi = {
  users: (q = "") => request<User[]>(`/admin/users${queryString({ q })}`),
  createUser: (data: { username: string; password: string; is_admin?: boolean }) =>
    request<User>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  setActive: (id: number, isActive: boolean) =>
    request<User>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    }),
  resetPassword: (id: number, password: string) =>
    request<void>(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password: password }),
    }),
  books: (q = "") => request<Book[]>(`/admin/books${queryString({ q })}`),
  takeDown: (id: number) => request<Book>(`/admin/books/${id}/take-down`, { method: "POST" }),
  restore: (id: number) => request<Book>(`/admin/books/${id}/restore`, { method: "POST" }),
};
