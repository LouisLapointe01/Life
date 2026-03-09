export type UserFolder = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type UserFile = {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  file_type: "pdf" | "image" | "document" | "other";
  mime_type: string | null;
  size_bytes: number;
  category: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
};
