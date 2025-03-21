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

// 記事概要の型定義
export interface ArticleSummary {
  id: string;
  title: string;
  description?: string;
  content?: string;
  tags?: string[];
  author?: string;
  authorId?: string;
  imageUrl?: string | null;
  date?: any;
  lastUpdated?: any;
  likeCount: number;
  usefulCount: number;
  dislikeCount: number;
  articleScore: number;
  viewCount?: number;
  [key: string]: any; // インデックスシグネチャを追加（任意のプロパティを許可）
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

// 記事スコア計算結果の型定義
export interface ArticleScoreResult {
  id: string;
  title: string;
  oldScore: number;
  newScore: number;
}

// 著者スコア結果の型定義
export interface AuthorStatsResult {
  authorId: string;
  articles: number;
  totalScore: number;
  averageScore: number;
}

// トロフィー計算結果の型定義
export interface TrophyResult {
  userId: string;
  trophyCount: number;
  badgeCount: number;
  stats: {
    articleCount: number;
    likeCount: number;
    usefulCount: number;
    averageScore: number;
  };
}

// リビルドインデックス結果の型定義
export interface RebuildIndexResult {
  success: boolean;
  processedArticles: number;
  processedTags: number;
  message?: string;
  processingTime?: string;
}

// 再計算結果の型定義
export interface RecalculationResult {
  processed: number;
  errors: number;
  success?: boolean;
  results?: Array<ArticleScoreResult | TrophyResult | AuthorStatsResult>;
}