import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  increment,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions
} from 'firebase/firestore';
import { db } from './config';

// Wiki記事の型定義
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
  lastUpdated?: Timestamp;
  usefulCount: number;
  likeCount: number;
}

// 記事コレクションへの参照
const articlesRef = collection(db, 'wikiArticles');

/**
 * 記事IDから記事データを取得する
 * @param id 記事ID
 * @returns 記事データ
 */
export async function getArticleById(id: string): Promise<WikiArticle | null> {
  try {
    const docRef = doc(db, 'wikiArticles', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as WikiArticle;
    }
    
    return null;
  } catch (error) {
    console.error('記事取得エラー:', error);
    throw error;
  }
}

/**
 * すべての記事を取得する
 * @param sortField ソートフィールド
 * @returns 記事一覧
 */
export async function getAllArticles(sortField: string = 'usefulCount'): Promise<WikiArticle[]> {
  try {
    const q = query(articlesRef, orderBy(sortField, 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WikiArticle[];
  } catch (error) {
    console.error('記事一覧取得エラー:', error);
    throw error;
  }
}

/**
 * タグで記事をフィルタリングする
 * @param tags タグ配列
 * @returns フィルタリングされた記事一覧
 */
export async function getArticlesByTags(tags: string[]): Promise<WikiArticle[]> {
  try {
    if (!tags.length) return getAllArticles();
    
    // Firestoreは配列に対する「すべての要素を含む」クエリをサポートしていないため
    // 最初のタグでフィルタリングした後、クライアント側でさらにフィルタリング
    const q = query(articlesRef, where('tags', 'array-contains', tags[0]));
    const querySnapshot = await getDocs(q);
    
    const articles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WikiArticle[];
    
    // 残りのタグでフィルタリング
    if (tags.length > 1) {
      return articles.filter(article => 
        tags.every(tag => article.tags.includes(tag))
      );
    }
    
    return articles;
  } catch (error) {
    console.error('タグによる記事取得エラー:', error);
    throw error;
  }
}

/**
 * 新しい記事を追加する
 * @param article 記事データ
 * @returns 追加された記事のID
 */
export async function createArticle(article: Omit<WikiArticle, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(articlesRef, {
      ...article,
      date: article.date || serverTimestamp(),
      lastUpdated: serverTimestamp(),
      usefulCount: article.usefulCount || 0,
      likeCount: article.likeCount || 0
    });
    
    return docRef.id;
  } catch (error) {
    console.error('記事作成エラー:', error);
    throw error;
  }
}

/**
 * 記事を更新する
 * @param id 記事ID
 * @param updateData 更新内容
 */
export async function updateArticle(id: string, updateData: Partial<WikiArticle>): Promise<void> {
  try {
    const docRef = doc(db, 'wikiArticles', id);
    await updateDoc(docRef, {
      ...updateData,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('記事更新エラー:', error);
    throw error;
  }
}

/**
 * 記事を削除する
 * @param id 記事ID
 */
export async function deleteArticle(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'wikiArticles', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('記事削除エラー:', error);
    throw error;
  }
}

/**
 * ユーザーが書いた記事を取得する
 * @param authorId 著者ID
 * @returns ユーザーの記事一覧
 */
export async function getUserArticles(authorId: string): Promise<WikiArticle[]> {
  try {
    const q = query(articlesRef, where('authorId', '==', authorId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WikiArticle[];
  } catch (error) {
    console.error('ユーザー記事取得エラー:', error);
    throw error;
  }
}

/**
 * 「使えた！」カウントを増やす
 * @param id 記事ID
 * @returns 更新後の記事データ
 */
export async function incrementUsefulCount(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'wikiArticles', id);
    await updateDoc(docRef, {
      usefulCount: increment(1)
    });
  } catch (error) {
    console.error('「使えた！」カウント更新エラー:', error);
    throw error;
  }
}

/**
 * 「いいね」カウントを増やす
 * @param id 記事ID
 * @returns 更新後の記事データ
 */
export async function incrementLikeCount(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'wikiArticles', id);
    await updateDoc(docRef, {
      likeCount: increment(1)
    });
  } catch (error) {
    console.error('「いいね」カウント更新エラー:', error);
    throw error;
  }
}
