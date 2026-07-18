import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "./auth/RouteGuard";
import { AppShell } from "./layout/AppShell";
import { AdminBooksPage } from "./pages/AdminBooksPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { LoginPage } from "./pages/LoginPage";
import { ReaderPage } from "./pages/ReaderPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SharedLibraryPage } from "./pages/SharedLibraryPage";
import { ShelfPage } from "./pages/ShelfPage";
import { UploadsPage } from "./pages/UploadsPage";

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/reader/:id" element={<ReaderPage />} />
      <Route element={<AppShell />}>
        <Route path="/shelf" element={<ShelfPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/shared" element={<SharedLibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/books" element={<AdminBooksPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/shelf" replace />} />
  </Routes>;
}
