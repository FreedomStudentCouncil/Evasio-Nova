import { Timestamp } from 'firebase/firestore';

// 通知タイプの定義
export type NotificationType = 'like' | 'comment' | 'reply' | 'follow' | 'trophy' | 'badge' | 'useful';

// 通知インターフェース
export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  content: string;
  date: Date;
  createdAt?: Timestamp;
  isRead?: boolean;
  read?: boolean; // 後方互換性のため
  senderId?: string;
  senderName?: string;
  articleId?: string;
  articleTitle?: string;
  trophyId?: string;
  badgeId?: string;
}

// 通知レスポンスインターフェース
export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}
