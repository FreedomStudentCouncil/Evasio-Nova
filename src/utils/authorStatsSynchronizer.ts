import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, searchDb } from '../firebase/config';

/**
 * すべての著者のスコアを同期する
 * @returns 処理結果（処理件数とエラー件数）
 */
export async function synchronizeAllAuthorStats() {
  const authorStats: { [authorId: string]: any } = {};
  let processed = 0;
  let errors = 0;

  try {
    // 全記事を取得
    const articleQuery = collection(searchDb, 'articleSummaries');
    const articleSnapshot = await getDocs(articleQuery);

    // 著者ごとに記事を集計
    articleSnapshot.forEach(doc => {
      try {
        const article = doc.data();
        const authorId = article.authorId;

        if (!authorId) {
          errors++;
          return;
        }

        // 著者の統計を初期化（未登録の場合）
        if (!authorStats[authorId]) {
          authorStats[authorId] = {
            articleCount: 0,
            articleScoreSum: 0,
            likeCount: 0,
            usefulCount: 0
          };
        }

        // 統計を更新
        authorStats[authorId].articleCount++;
        authorStats[authorId].articleScoreSum += article.articleScore || 0;
        authorStats[authorId].likeCount += article.likeCount || 0;
        authorStats[authorId].usefulCount += article.usefulCount || 0;

        processed++;
      } catch (err) {
        errors++;
      }
    });

    // 著者スコアをFirestoreに保存
    await setDoc(doc(searchDb, 'counts', 'author'), {
      counts: authorStats,
      lastUpdated: Date.now()
    });

    return { processed, errors };
  } catch (error) {
    console.error('著者スコア同期エラー:', error);
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
