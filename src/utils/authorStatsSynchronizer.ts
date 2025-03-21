import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, searchDb } from '../firebase/config';

/**
 * すべての著者のスコアを再計算して同期する
 * 定期的な実行や大規模なデータ変更後に呼び出すことを想定
 */
export async function synchronizeAllAuthorStats(): Promise<{
  processed: number;
  errors: number;
}> {
  try {
    // すべての著者IDを取得
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const authorIds = usersSnapshot.docs.map(doc => doc.id);
    
    let processed = 0;
    let errors = 0;
    
    // 著者ごとの統計情報を保持するオブジェクト
    const authorStats: Record<string, {
      likeCount: number;
      usefulCount: number;
      articleScoreSum: number;
      articleCount: number;
    }> = {};
    
    // 各著者のスコアを計算
    for (const authorId of authorIds) {
      try {
        // 著者の記事を取得
        const articlesQuery = query(
          collection(searchDb, 'articleSummaries'),
          where('authorId', '==', authorId)
        );
        const articlesSnapshot = await getDocs(articlesQuery);
        
        if (articlesSnapshot.empty) continue;
        
        // スコアを集計
        let scoreSum = 0;
        let articleCount = 0;
        let likeCount = 0;
        let usefulCount = 0;
        
        articlesSnapshot.forEach(doc => {
          const data = doc.data();
          scoreSum += data.articleScore || 0;
          articleCount++;
          likeCount += data.likeCount || 0;
          usefulCount += data.usefulCount || 0;
        });
        
        // 著者統計を保存
        authorStats[authorId] = {
          likeCount,
          usefulCount,
          articleScoreSum: scoreSum,
          articleCount
        };
        
        processed++;
      } catch (err) {
        console.error(`著者 ${authorId} の統計計算エラー:`, err);
        errors++;
      }
    }
    
    // 著者統計をまとめてDBに保存
    await setDoc(doc(searchDb, 'counts', 'author'), {
      counts: authorStats,
      lastUpdated: Date.now()
    });
    
    return { processed, errors };
  } catch (error) {
    console.error('著者統計同期エラー:', error);
    throw error;
  }
}

/**
 * 特定の著者のスコアを同期する
 * 特定の著者の記事が更新されたときに呼び出すことを想定
 */
export async function synchronizeAuthorStats(authorId: string): Promise<boolean> {
  try {
    // 著者の記事を取得
    const articlesQuery = query(
      collection(searchDb, 'articleSummaries'),
      where('authorId', '==', authorId)
    );
    const articlesSnapshot = await getDocs(articlesQuery);
    
    // スコアを集計
    let scoreSum = 0;
    let articleCount = 0;
    let likeCount = 0;
    let usefulCount = 0;
    
    articlesSnapshot.forEach(doc => {
      const data = doc.data();
      scoreSum += data.articleScore || 0;
      articleCount++;
      likeCount += data.likeCount || 0;
      usefulCount += data.usefulCount || 0;
    });
    
    // 著者統計を取得して更新
    const authorCountsRef = doc(searchDb, 'counts', 'author');
    const authorCountsDoc = await getDoc(authorCountsRef);
    
    const authorCounts = authorCountsDoc.exists() 
      ? authorCountsDoc.data().counts || {} 
      : {};
    
    authorCounts[authorId] = {
      likeCount,
      usefulCount,
      articleScoreSum: scoreSum,
      articleCount
    };
    
    await setDoc(authorCountsRef, {
      counts: authorCounts,
      lastUpdated: Date.now()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error(`著者 ${authorId} の統計同期エラー:`, error);
    return false;
  }
}
