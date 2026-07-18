export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  is_superuser: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ReadingProgress {
  book_id: number;
  location: string;
  percentage: number;
  chapter?: string | null;
  updated_at: string;
}

export interface Book {
  id: number;
  owner_id: number;
  owner_name?: string | null;
  title: string;
  author: string;
  visibility: "private" | "shared";
  status: "active" | "taken_down";
  original_filename: string;
  has_cover: boolean;
  cover_url?: string | null;
  in_shelf?: boolean | null;
  progress?: ReadingProgress | null;
  created_at: string;
  updated_at: string;
}

export interface TocItem {
  id?: string;
  label: string;
  href: string;
  subitems?: TocItem[];
}
