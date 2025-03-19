import { Timestamp } from 'firebase/firestore';

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
} 