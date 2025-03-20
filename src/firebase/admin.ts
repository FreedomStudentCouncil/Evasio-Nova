import { User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, searchDb } from './config';
import { isAdmin } from './auth';
// WikiArticleインポート先を修正
import { WikiArticle } from '../firebase/wiki';

/**
 * 管理者専用: 特定ユーザーの権限を確認する
 * @param user 確認するユーザー
 * @returns 管理者の場合はtrue、それ以外はfalse
 */
export function checkAdminPermission(user: User | null): boolean {
  if (!user) return false;
  return isAdmin(user.email);
}

/**
 * 管理者専用: 低評価の多い記事一覧を取得する
 * @param limit 取得する記事数の上限
 * @returns 低評価の多い記事一覧
 */
export async function getHighlyDislikedArticles(limitCount: number = 10): Promise<WikiArticle[]> {
  try {
    // 検索用DBから低評価の多い記事を取得
    const q = query(
      collection(searchDb, 'articleSummaries'),
      where('dislikeCount', '>', 0),
      orderBy('dislikeCount', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const articleIds = querySnapshot.docs.map(doc => doc.id);
    
    // メインDBから完全な記事データを取得
    const articles: WikiArticle[] = [];
    
    for (const id of articleIds) {
      const articleRef = doc(db, 'wikiArticles', id);
      const articleSnap = await getDoc(articleRef);
      
      if (articleSnap.exists()) {
        articles.push({ id: articleSnap.id, ...articleSnap.data() } as WikiArticle);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('低評価記事の取得に失敗:', error);
    return [];
  }
}

/**
 * 管理者専用: 記事を非表示設定にする（将来的な実装のための骨組み）
 * @param articleId 記事ID
 * @param reason 非表示にする理由
 */
export async function hideArticle(articleId: string, reason: string): Promise<void> {
  try {
    // メインDBとサブDBの両方を更新
    const mainRef = doc(db, 'wikiArticles', articleId);
    const searchRef = doc(searchDb, 'articleSummaries', articleId);
    
    await updateDoc(mainRef, {
      isHidden: true,
      hiddenReason: reason,
      hiddenAt: new Date()
    });
    
    await updateDoc(searchRef, {
      isHidden: true
    });
    
  } catch (error) {
    console.error('記事の非表示設定に失敗:', error);
    throw error;
  }
}

/**
 * 管理者専用: コメントを削除する
 * @param articleId 記事ID
 * @param commentId コメントID
 */
export async function deleteComment(articleId: string, commentId: string): Promise<void> {
  try {
    const commentRef = doc(db, 'wikiArticles', articleId, 'comments', commentId);
    await deleteDoc(commentRef);
  } catch (error) {
    console.error('コメントの削除に失敗:', error);
    throw error;
  }
}

/**
 * 管理者専用: 低評価をリセットする
 * @param articleId 記事ID
 */
export async function resetDislikeCount(articleId: string): Promise<void> {
  try {
    const summaryRef = doc(searchDb, 'articleSummaries', articleId);
    
    await updateDoc(summaryRef, {
      dislikeCount: 0
    });
    
    // カウントコレクションも更新
    const countsRef = doc(searchDb, 'counts', 'article');
    const countsSnap = await getDoc(countsRef);
    
    if (countsSnap.exists()) {
      const data = countsSnap.data();
      const counts = data.counts || {};
      
      if (counts[articleId]) {
        counts[articleId].dislikeCount = 0;
        
        await updateDoc(countsRef, {
          counts,
          lastUpdated: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('低評価のリセットに失敗:', error);
    throw error;
  }
}
