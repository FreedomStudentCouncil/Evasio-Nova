import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, searchDb } from '../firebase/config';
import { isAdmin } from '../firebase/auth';
const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

/**
 * 最終更新時刻を取得する関数（クライアントサイド用）
 */
export async function getLastUpdated(userId: string): Promise<{
  success: boolean;
  lastUpdated?: {
    articles: string;
    trophies: string;
    other: string;
  };
  error?: string;
}> {
  try {
    // 管理者権限チェック
    const userSnapshot = await getDoc(doc(db, 'users', userId));
    if (!userSnapshot.exists() || userSnapshot.data().email !== ADMIN_EMAIL) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 各データの最終更新時刻を取得
    const [articlesDoc, trophiesDoc, otherDoc] = await Promise.all([
      getDoc(doc(searchDb, 'system', 'lastUpdated')),
      getDoc(doc(searchDb, 'system', 'trophiesLastUpdated')),
      getDoc(doc(searchDb, 'system', 'otherLastUpdated'))
    ]);

    const lastUpdated = {
      articles: articlesDoc.exists() 
        ? new Date(articlesDoc.data().timestamp).toLocaleString('ja-JP') 
        : '未計算',
      trophies: trophiesDoc.exists() 
        ? new Date(trophiesDoc.data().timestamp).toLocaleString('ja-JP') 
        : '未計算',
      other: otherDoc.exists() 
        ? new Date(otherDoc.data().timestamp).toLocaleString('ja-JP') 
        : '未計算'
    };

    return { 
      success: true,
      lastUpdated
    };
  } catch (error) {
    console.error('最終更新時刻取得エラー:', error);
    return { 
      success: false, 
      error: '最終更新時刻の取得中にエラーが発生しました' 
    };
  }
}
