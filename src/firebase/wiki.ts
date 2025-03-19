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
  limit,
  startAfter,
  FieldValue,
  setDoc
} from 'firebase/firestore';
import { db, searchDb } from './config';

// Wiki記事の型定義 - メインDBに保存する完全な記事情報
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
  deleteUrl?: string;
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
}

// コメントの型定義を修正
export interface WikiComment {
  id?: string;
  content: string;
  author: string | null;
  authorId: string | null;
  date: Timestamp | string | FieldValue;
  replyCount?: number;
  likeCount?: number;
}

// 返信コメントの型定義を追加
export interface WikiReply extends WikiComment {
  parentId: string;
}

// タグの型定義を追加
export interface Tag {
  name: string;
  count: number;
  lastUsed: Timestamp | FieldValue;
}

// 記事コレクションへの参照（メインDB）
const articlesRef = collection(db, 'wikiArticles');

// 記事概要コレクションへの参照（検索用DB）
const articleSummariesRef = collection(searchDb, 'articleSummaries');

// タグコレクションへの参照（検索用DB）
const tagsRef = collection(searchDb, 'tags');

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
 * すべての記事概要を取得する（検索用DB）
 * @param sortField ソートフィールド
 * @returns 記事概要一覧
 */
export async function getAllArticleSummaries(sortField: string = 'usefulCount'): Promise<ArticleSummary[]> {
  try {
    const q = query(articleSummariesRef, orderBy(sortField, 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArticleSummary[];
  } catch (error) {
    console.error('記事概要一覧取得エラー:', error);
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
    // 記事概要一覧を検索用DBから取得
    const summaries = await getAllArticleSummaries(sortField);
    const articleIds = summaries.map(summary => summary.id);
    
    // 完全な記事データをメインDBから取得
    const articles: WikiArticle[] = [];
    
    for (const id of articleIds) {
      const article = await getArticleById(id);
      if (article) {
        articles.push(article);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('記事一覧取得エラー:', error);
    throw error;
  }
}

/**
 * タグで記事をフィルタリングする（検索用DBを使用）
 * @param tags タグ配列
 * @returns フィルタリングされた記事一覧
 */
export async function getArticlesByTags(tags: string[]): Promise<ArticleSummary[]> {
  try {
    if (!tags.length) return getAllArticleSummaries();
    
    // Firestoreは配列に対する「すべての要素を含む」クエリをサポートしていないため
    // 最初のタグでフィルタリングした後、クライアント側でさらにフィルタリング
    const q = query(articleSummariesRef, where('tags', 'array-contains', tags[0]));
    const querySnapshot = await getDocs(q);
    
    const articles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArticleSummary[];
    
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
 * 新しい記事を追加する（両方のDBに追加）
 * @param article 記事データ
 * @returns 追加された記事のID
 */
export async function createArticle(article: Omit<WikiArticle, 'id'>): Promise<string> {
  try {
    const now = serverTimestamp();
    let id: string;
    
    // 1. メインDBに完全な記事データを保存（認証済みユーザーによるアクセス）
    try {
      console.log("メインDBに記事を保存中...");
      const docRef = await addDoc(articlesRef, {
        ...article,
        date: article.date || now,
        lastUpdated: now,
        content: article.content
      });
      id = docRef.id;
      console.log("メインDBへの保存完了。ID:", id);
    } catch (mainDbError) {
      console.error("メインDB保存エラー:", mainDbError);
      throw new Error(`メインDBへの書き込みに失敗しました: ${mainDbError instanceof Error ? mainDbError.message : 'Unknown error'}`);
    }
    
    // 2. 検索用DBに記事の概要を保存（認証なしでアクセス可能）
    try {
      console.log("検索用DBに記事概要を保存中...");
      const summaryRef = doc(searchDb, 'articleSummaries', id);
      await setDoc(summaryRef, {
        id,
        title: article.title,
        description: article.description,
        tags: article.tags,
        author: article.author,
        authorId: article.authorId,
        imageUrl: article.imageUrl,
        date: article.date || now,
        lastUpdated: now,
        usefulCount: article.usefulCount || 0,
        likeCount: article.likeCount || 0
      });
      console.log("検索用DBへの保存完了");
    } catch (searchDbError) {
      console.error("検索用DB保存エラー:", searchDbError);
      
      // 検索用DBへの保存に失敗した場合、メインDBの記事を削除して整合性を保つ
      try {
        console.warn("メインDBからの記事を削除して整合性を保ちます...");
        await deleteDoc(doc(db, 'wikiArticles', id));
        console.warn("メインDBからの記事削除完了");
      } catch (cleanupError) {
        console.error("メインDB清掃エラー:", cleanupError);
      }
      
      throw new Error(`検索用DBへの書き込みに失敗しました: ${searchDbError instanceof Error ? searchDbError.message : 'Unknown error'}`);
    }
    
    return id;
  } catch (error) {
    console.error('記事作成エラー:', error);
    throw error;
  }
}

/**
 * 記事を更新する（両方のDBを更新）
 * @param id 記事ID
 * @param updateData 更新内容
 */
export async function updateArticle(id: string, updateData: Partial<WikiArticle>): Promise<void> {
  try {
    const now = serverTimestamp();
    
    // メインDB更新用データを作成（評価カウント以外）
    const mainDbUpdateData: Partial<WikiArticle> = { ...updateData, lastUpdated: now };
    
    // 評価カウントはメインDBから削除
    if ('usefulCount' in mainDbUpdateData) delete mainDbUpdateData.usefulCount;
    if ('likeCount' in mainDbUpdateData) delete mainDbUpdateData.likeCount;
    
    // 1. メインDBの記事を更新
    const docRef = doc(db, 'wikiArticles', id);
    await updateDoc(docRef, mainDbUpdateData);
    
    // 2. 検索用DBの記事概要も更新（関連フィールドのみ）
    const summaryRef = doc(searchDb, 'articleSummaries', id);
    const summaryUpdateData: Partial<ArticleSummary> = { lastUpdated: now };
    
    // 検索用DBに関連するフィールドだけを抽出
    const relevantFields: (keyof ArticleSummary)[] = [
      'title', 'description', 'tags', 'author', 'imageUrl', 'usefulCount', 'likeCount'
    ];
    
    relevantFields.forEach(field => {
      if (field in updateData) {
        summaryUpdateData[field] = updateData[field as keyof WikiArticle] as any;
      }
    });
    
    if (Object.keys(summaryUpdateData).length > 1) { // lastUpdated以外にも更新するフィールドがある場合
      await updateDoc(summaryRef, summaryUpdateData);
    }
  } catch (error) {
    console.error('記事更新エラー:', error);
    throw error;
  }
}

/**
 * 記事を削除する（両方のDBから削除）
 * @param id 記事ID
 */
export async function deleteArticle(id: string): Promise<void> {
  try {
    // 1. メインDBから記事を削除（認証済みユーザーによるアクセスが保証される）
    const docRef = doc(db, 'wikiArticles', id);
    await deleteDoc(docRef);
    
    // 2. 検索用DBからも記事概要を削除
    try {
      const summaryRef = doc(searchDb, 'articleSummaries', id);
      await deleteDoc(summaryRef);
    } catch (searchDbError) {
      console.error('検索用DB削除エラー:', searchDbError);
      // エラーはログに残すが、メインDBからは削除済みなので中断しない
    }
  } catch (error) {
    console.error('記事削除エラー:', error);
    throw error;
  }
}

/**
 * ユーザーが書いた記事の概要を取得する（検索用DB）
 * @param authorId 著者ID
 * @returns ユーザーの記事概要一覧
 */
export async function getUserArticleSummaries(authorId: string): Promise<ArticleSummary[]> {
  try {
    // インデックスが必要なクエリ
    const q = query(
      articleSummariesRef,
      where('authorId', '==', authorId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArticleSummary[];
  } catch (error) {
    console.error('ユーザー記事概要取得エラー:', error);
    
    // 開発環境では、インデックスエラーを特定してガイダンスを表示
    if (error instanceof Error && error.toString().includes('requires an index')) {
      console.warn(
        'Firestoreインデックスが必要です。以下のリンクからインデックスを作成してください:',
        'https://console.firebase.google.com/project/evasio-nova/firestore/indexes'
      );
    }
    
    return [];
  }
}

/**
 * ユーザーが書いた記事（完全なデータ）を取得する
 * @param authorId 著者ID
 * @returns ユーザーの記事一覧
 */
export async function getUserArticles(authorId: string): Promise<WikiArticle[]> {
  try {
    // 概要情報を検索用DBから取得
    const summaries = await getUserArticleSummaries(authorId);
    
    // 完全な記事データをメインDBから取得
    const articles: WikiArticle[] = [];
    
    for (const summary of summaries) {
      const article = await getArticleById(summary.id);
      if (article) {
        articles.push(article);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('ユーザー記事取得エラー:', error);
    return [];
  }
}

/**
 * 「使えた！」カウントを増やす（検索用DBのみ更新）
 * @param id 記事ID
 */
export async function incrementUsefulCount(id: string): Promise<void> {
  try {
    // 検索用DBの記事概要のみ更新
    const summaryRef = doc(searchDb, 'articleSummaries', id);
    await updateDoc(summaryRef, {
      usefulCount: increment(1)
    });
  } catch (error) {
    console.error('「使えた！」カウント更新エラー:', error);
    throw error;
  }
}

/**
 * 「いいね」カウントを増やす（検索用DBのみ更新）
 * @param id 記事ID
 */
export async function incrementLikeCount(id: string): Promise<void> {
  try {
    // 検索用DBの記事概要のみ更新
    const summaryRef = doc(searchDb, 'articleSummaries', id);
    await updateDoc(summaryRef, {
      likeCount: increment(1)
    });
  } catch (error) {
    console.error('「いいね」カウント更新エラー:', error);
    throw error;
  }
}

/**
 * 記事の評価カウントを取得する（検索用DB）
 * @param id 記事ID
 * @returns {usefulCount, likeCount} 形式のオブジェクト
 */
export async function getArticleRatings(id: string): Promise<{usefulCount: number, likeCount: number}> {
  try {
    const summaryRef = doc(searchDb, 'articleSummaries', id);
    const docSnap = await getDoc(summaryRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        usefulCount: data.usefulCount || 0,
        likeCount: data.likeCount || 0
      };
    }
    
    return {
      usefulCount: 0,
      likeCount: 0
    };
  } catch (error) {
    console.error('記事評価取得エラー:', error);
    return {
      usefulCount: 0,
      likeCount: 0
    };
  }
}

/**
 * 記事のコメントを取得する（メインDBから）
 * @param articleId 記事ID
 * @param lastComment 前回の最後のコメント（ページネーション用）
 * @param itemsPerPage 1ページあたりのコメント数
 * @returns コメント一覧
 */
export async function getArticleComments(
  articleId: string, 
  lastComment: WikiComment | null = null, 
  itemsPerPage: number = 10
): Promise<WikiComment[]> {
  try {
    // 記事のサブコレクションとしてのコメントを取得
    const commentsRef = collection(db, 'wikiArticles', articleId, 'comments');
    
    let q = query(
      commentsRef,
      orderBy('date', 'desc'),
      limit(itemsPerPage)
    );
    
    // ページネーション: 前回の最後のコメント以降を取得
    if (lastComment) {
      q = query(
        commentsRef,
        orderBy('date', 'desc'),
        startAfter(lastComment.date),
        limit(itemsPerPage)
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WikiComment[];
  } catch (error) {
    console.error('コメント取得エラー:', error);
    throw error;
  }
}

/**
 * コメントの返信を取得する
 * @param articleId 記事ID
 * @param commentId 親コメントID
 * @param lastReply 前回の最後の返信（ページネーション用）
 * @param itemsPerPage 1ページあたりの返信数
 * @returns 返信一覧
 */
export async function getCommentReplies(
  articleId: string,
  commentId: string, 
  lastReply: WikiReply | null = null, 
  itemsPerPage: number = 5
): Promise<WikiReply[]> {
  try {
    // コメントのサブコレクションとしての返信を取得
    const repliesRef = collection(db, 'wikiArticles', articleId, 'comments', commentId, 'replies');
    
    let q = query(
      repliesRef,
      orderBy('date', 'asc'),
      limit(itemsPerPage)
    );
    
    if (lastReply) {
      q = query(
        repliesRef,
        orderBy('date', 'asc'),
        startAfter(lastReply.date),
        limit(itemsPerPage)
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      parentId: commentId,
      ...doc.data()
    })) as WikiReply[];
  } catch (error) {
    console.error('返信取得エラー:', error);
    throw error;
  }
}

/**
 * 新しいコメントを追加する
 * @param articleId 記事ID
 * @param comment コメントデータ
 * @returns 追加されたコメントのID
 */
export async function addComment(
  articleId: string,
  comment: Omit<WikiComment, 'id'>
): Promise<string> {
  try {
    const commentsRef = collection(db, 'wikiArticles', articleId, 'comments');
    const docRef = await addDoc(commentsRef, {
      ...comment,
      date: serverTimestamp(),
      replyCount: 0,
      likeCount: 0
    });
    
    return docRef.id;
  } catch (error) {
    console.error('コメント追加エラー:', error);
    throw error;
  }
}

/**
 * 返信コメントを追加する
 * @param articleId 記事ID
 * @param commentId 親コメントID
 * @param reply 返信データ
 * @returns 追加された返信のID
 */
export async function addReply(
  articleId: string,
  commentId: string,
  reply: Omit<WikiReply, 'id' | 'parentId'>
): Promise<string> {
  try {
    // トランザクションを使用して、返信の追加と親コメントの返信数更新を一括処理
    const repliesRef = collection(db, 'wikiArticles', articleId, 'comments', commentId, 'replies');
    const commentRef = doc(db, 'wikiArticles', articleId, 'comments', commentId);
    
    const docRef = await addDoc(repliesRef, {
      ...reply,
      date: serverTimestamp(),
      likeCount: 0
    });
    
    // 親コメントの返信カウントを増やす
    await updateDoc(commentRef, {
      replyCount: increment(1)
    });
    
    return docRef.id;
  } catch (error) {
    console.error('返信追加エラー:', error);
    throw error;
  }
}

/**
 * コメントのいいねカウントを増やす
 * @param articleId 記事ID
 * @param commentId コメントID
 * @returns 更新処理のPromise
 */
export async function incrementCommentLikeCount(
  articleId: string,
  commentId: string
): Promise<void> {
  try {
    const commentRef = doc(db, 'wikiArticles', articleId, 'comments', commentId);
    await updateDoc(commentRef, {
      likeCount: increment(1)
    });
  } catch (error) {
    console.error('コメントいいね更新エラー:', error);
    throw error;
  }
}

/**
 * 返信のいいねカウントを増やす
 * @param articleId 記事ID
 * @param commentId 親コメントID
 * @param replyId 返信ID
 * @returns 更新処理のPromise
 */
export async function incrementReplyLikeCount(
  articleId: string,
  commentId: string,
  replyId: string
): Promise<void> {
  try {
    const replyRef = doc(db, 'wikiArticles', articleId, 'comments', commentId, 'replies', replyId);
    await updateDoc(replyRef, {
      likeCount: increment(1)
    });
  } catch (error) {
    console.error('返信いいね更新エラー:', error);
    throw error;
  }
}

/**
 * すべてのタグを取得する
 * @returns タグ一覧
 */
export async function getAllTags(): Promise<Tag[]> {
  try {
    const q = query(tagsRef, orderBy('count', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      name: doc.id,
      ...doc.data()
    })) as Tag[];
  } catch (error) {
    console.error('タグ取得エラー:', error);
    return [];
  }
}

/**
 * タグを更新する（存在しない場合は作成）
 * @param tagNames タグ名の配列
 */
export async function updateTags(tagNames: string[]): Promise<void> {
  try {
    const now = serverTimestamp();
    
    // 各タグに対して更新処理を実行
    const updatePromises = tagNames.map(async (tagName) => {
      const tagRef = doc(searchDb, 'tags', tagName);
      await setDoc(tagRef, {
        count: increment(1),
        lastUsed: now
      }, { merge: true });
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('タグ更新エラー:', error);
    throw error;
  }
}

/**
 * タグの使用回数を減らす
 * @param tagNames タグ名の配列
 */
export async function decrementTags(tagNames: string[]): Promise<void> {
  try {
    const updatePromises = tagNames.map(async (tagName) => {
      const tagRef = doc(searchDb, 'tags', tagName);
      await updateDoc(tagRef, {
        count: increment(-1)
      });
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('タグ更新エラー:', error);
    throw error;
  }
}
