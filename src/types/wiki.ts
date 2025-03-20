import { Timestamp, FieldValue } from 'firebase/firestore';

export interface ArticleSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  author: string;
  authorId: string;
  imageUrl?: string;
  date: Timestamp | string;
  lastUpdated?: Timestamp | string;
  usefulCount: number;
  likeCount: number;
  dislikeCount?: number; // 管理者のみが見える低評価カウント
}

// WikiArticleインターフェースも追加
export interface WikiArticle {
  id?: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  author: string;
  authorId: string;
  imageUrl?: string;
  imageId?: string;
  date: Timestamp | string;
  lastUpdated?: Timestamp | FieldValue;
  usefulCount: number;
  likeCount: number;
  dislikeCount?: number; // 管理者のみが見える低評価カウント
  deleteUrl?: string;
}