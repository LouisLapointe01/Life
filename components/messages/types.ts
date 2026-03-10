export type Conversation = {
  id: string;
  other_user: { id: string; full_name: string; avatar_url: string | null };
  last_message: { content: string; created_at: string; sender_id: string | null } | null;
  unread_count: number;
  is_favorite?: boolean;
  favorite_position?: number | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender: { full_name: string; avatar_url: string | null } | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
};

export type UserResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  has_account: boolean;
};
