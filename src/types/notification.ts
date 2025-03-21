import { Timestamp } from 'firebase/firestore';

// 通知タイプの定義（バッジとトロフィーを追加）
export type NotificationType = 'comment' | 'reply' | 'like' | 'badge' | 'trophy';

// 通知インターフェース
export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  date: Timestamp | Date;
  createdAt?: Timestamp;
  isRead: boolean;
  read?: boolean;
  
  // コメント、返信、いいね共通
  articleId?: string;
  articleTitle?: string;
  senderId?: string;
  senderName?: string;
  content?: string;
  
  // バッジと実績特有
  badgeId?: string;
  badgeName?: string;
  trophyId?: string;
  trophyName?: string;
}

// 通知レスポンスの型定義
export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}
