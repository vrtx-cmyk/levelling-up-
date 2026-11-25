export type UserStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  status: UserStatus;
  reference_code: string;
  created_at: string;
  updated_at?: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  rib: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  screenshot_path: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  bank_account_id?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  // Joined relations
  profile?: Profile;
  bank_account?: BankAccount;
}

export type VideoSource = 'bunny' | 'youtube' | 'vimeo' | 'storage';

export interface Video {
  id: string;
  title: string;
  description: string;
  video_path: string;
  video_url?: string | null;
  video_source?: VideoSource;
  thumbnail_path?: string | null;
  duration?: string;
  is_published: boolean;
  is_free_preview?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PublicVideo {
  id: string;
  title: string;
  description: string;
  thumbnail_path?: string | null;
  duration?: string;
  is_published: boolean;
  is_free_preview?: boolean;
  created_at: string;
}

export interface Settings {
  id?: number;
  rib: string;
  account_holder: string;
  bank_name?: string;
  price: number;
  contact_whatsapp?: string;
  contact_email?: string;
  updated_at?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}
