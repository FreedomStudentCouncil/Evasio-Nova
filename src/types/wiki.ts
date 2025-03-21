import { Timestamp, FieldValue } from 'firebase/firestore';

// Wiki記事の型定義 - メインDBに保存する完全な記事情報
export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  date: any; // Timestamp | string | null
  lastUpdated?: any; // Timestamp | string | null
  tags?: string[];
  imageUrl?: string;
  imageId?: string;
  deleteUrl?: string;
  description?: string;
  likeCount?: number;
  usefulCount?: number;
  dislikeCount?: number;
  articleScore?: number;
}

// 検索用DB用の記事概要型定義
export interface ArticleSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  author: string;
  authorId: string;
  imageUrl?: string;
  date: Timestamp | string;
  lastUpdated?: Timestamp | FieldValue;
  usefulCount: number;
  likeCount: number;
  dislikeCount?: number;
  articleScore?: number; // 記事スコアを追加
}

// コメントの型定義
export interface WikiComment {
  id?: string;
  content: string;
  author: string | null;
  authorId: string | null;
  date: Timestamp | string | FieldValue;
  replyCount?: number;
  likeCount?: number;
}

// 返信コメントの型定義
export interface WikiReply extends WikiComment {
  parentId: string;
}

// タグの型定義
export interface Tag {
  name: string;
  count: number;
  lastUsed: Timestamp | FieldValue;
}

// 著者の統計情報型定義
export interface AuthorStats {
  likeCount: number;
  usefulCount: number;
  articleScoreSum: number;
  articleCount: number;
  averageScore?: number;
}

// 記事再計算の結果型定義
export interface RecalculationResult {
  success: boolean;
  processed: number;
  errors: number;
  results: Array<{
    id: string;
    title: string;
    oldScore: number;
    newScore: number;
  }>;
}