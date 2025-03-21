import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, getDocs, doc, getDoc, updateDoc, query, 
  where, writeBatch, setDoc, Timestamp 
} from 'firebase/firestore';
import { db, searchDb } from '../../../../firebase/config';
import { calculateArticleScore } from '../../../../utils/articleScoreCalculator';
import { calculateUserTrophies, getAvailableBadges } from '../../../../utils/trophies';

// 管理者メールアドレス
const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

// 型定義
interface ArticleSummary {
  id: string;
  title: string;
  authorId: string;
  likeCount: number;
  usefulCount: number;
  dislikeCount: number;
  articleScore: number;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const userIdHeader = request.headers.get('user-id');
    if (!userIdHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者権限チェック
    const userSnapshot = await getDoc(doc(db, 'users', userIdHeader));
    if (!userSnapshot.exists() || userSnapshot.data().email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // 処理開始時間
    const startTime = Date.now();

    // 1. 記事スコアの再計算
    const articleResults = await recalculateArticleScores();
    
    // 2. 著者スコアの再計算
    const authorResults = await recalculateAuthorStats();
    
    // 3. トロフィーとバッジの再計算
    const trophyResults = await recalculateTrophiesAndBadges();
    
    // 4. キャッシュの更新時刻を記録
    await setDoc(doc(searchDb, 'system', 'lastUpdated'), {
      timestamp: Date.now(),
      updatedBy: userIdHeader
    });
    
    // 処理時間
    const processingTime = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      articles: articleResults,
      authors: authorResults,
      trophies: trophyResults,
      processingTime: `${processingTime.toFixed(2)}秒`
    });
  } catch (error) {
    console.error('データ再計算エラー:', error);
    return NextResponse.json(
      { error: 'データの再計算中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 記事スコアの再計算
async function recalculateArticleScores() {
  // 記事データを取得
  const articleSummariesRef = collection(searchDb, 'articleSummaries');
  const querySnapshot = await getDocs(articleSummariesRef);
  
  const articles = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ArticleSummary[];

  const batch = writeBatch(searchDb);
  const results = [];
  let processedCount = 0;
  let errorCount = 0;

  // 各記事のスコアを再計算
  for (const article of articles) {
    try {
      // メインDBから詳細な記事データを取得
      const mainArticleRef = doc(db, 'wikiArticles', article.id);
      const mainArticleSnap = await getDoc(mainArticleRef);
      
      if (!mainArticleSnap.exists()) {
        errorCount++;
        continue;
      }
      
      const mainArticleData = mainArticleSnap.data();
      
      // スコアを計算
      const newScore = calculateArticleScore(
        mainArticleData.content,
        article.likeCount || 0,
        article.usefulCount || 0,
        article.dislikeCount || 0
      );
      
      // 検索用DBの記事を更新
      const articleSummaryRef = doc(searchDb, 'articleSummaries', article.id);
      batch.update(articleSummaryRef, { articleScore: newScore });
      
      results.push({
        id: article.id,
        title: article.title || "タイトルなし",
        oldScore: article.articleScore || 0,
        newScore
      });
      
      processedCount++;
    } catch (error) {
      errorCount++;
    }
  }

  // バッチ更新を実行
  await batch.commit();

  return {
    processed: processedCount,
    errors: errorCount,
    results: results.slice(0, 20) // 結果の一部のみ返す
  };
}

// 著者スコアの再計算
async function recalculateAuthorStats() {
  const authorCountsRef = doc(searchDb, 'counts', 'author');
  const authorCountsDoc = await getDoc(authorCountsRef);
  let authorCounts: {[key: string]: any} = {};
  
  if (authorCountsDoc.exists()) {
    authorCounts = authorCountsDoc.data().counts || {};
  }
  
  // すべての著者IDを取得
  const authorsQuery = query(collection(db, 'users'));
  const authorsSnapshot = await getDocs(authorsQuery);
  const authorIds = authorsSnapshot.docs.map(doc => doc.id);

  const updatedAuthors = [];
  
  // 各著者の統計を再計算
  for (const authorId of authorIds) {
    try {
      // 著者の記事を検索
      const authorArticlesQuery = query(
        collection(searchDb, 'articleSummaries'),
        where('authorId', '==', authorId)
      );
      
      const authorArticlesSnapshot = await getDocs(authorArticlesQuery);
      
      if (authorArticlesSnapshot.empty) {
        // 記事がない場合はスキップ
        continue;
      }
      
      let scoreSum = 0;
      let articleCount = 0;
      let likeCount = 0;
      let usefulCount = 0;
      
      authorArticlesSnapshot.forEach(doc => {
        const data = doc.data();
        scoreSum += data.articleScore || 0;
        articleCount++;
        likeCount += data.likeCount || 0;
        usefulCount += data.usefulCount || 0;
      });
      
      // 統計を更新
      authorCounts[authorId] = {
        likeCount,
        usefulCount,
        articleScoreSum: scoreSum,
        articleCount
      };
      
      // 更新された著者を記録
      updatedAuthors.push({
        authorId,
        articles: articleCount,
        totalScore: scoreSum,
        averageScore: articleCount > 0 ? Math.round((scoreSum / articleCount) * 10) / 10 : 0
      });
    } catch (error) {
      console.error(`著者 ${authorId} の統計計算エラー:`, error);
    }
  }
  
  // 著者カウンテータを更新
  await updateDoc(authorCountsRef, {
    counts: authorCounts,
    lastUpdated: Date.now()
  });
  
  return {
    processed: updatedAuthors.length,
    results: updatedAuthors.slice(0, 20) // 結果の一部のみ返す
  };
}

// トロフィーとバッジの再計算
async function recalculateTrophiesAndBadges() {
  // 著者の統計情報を取得
  const authorCountsRef = doc(searchDb, 'counts', 'author');
  const authorCountsDoc = await getDoc(authorCountsRef);
  
  if (!authorCountsDoc.exists()) {
    return { processed: 0, results: [] };
  }
  
  const authorCounts = authorCountsDoc.data().counts || {};
  const authorIds = Object.keys(authorCounts);
  
  const updatedUsers = [];
  const userBatch = writeBatch(db);
  
  // 各ユーザーのトロフィーとバッジを再計算
  for (const authorId of authorIds) {
    try {
      const authorData = authorCounts[authorId];
      
      // ユーザー統計の作成
      const userStats = {
        likeCount: authorData.likeCount || 0,
        usefulCount: authorData.usefulCount || 0,
        articleCount: authorData.articleCount || 0,
        averageScore: authorData.articleCount > 0 
          ? authorData.articleScoreSum / authorData.articleCount 
          : 0,
        totalScore: authorData.articleScoreSum || 0
      };
      
      // トロフィーとバッジを計算
      const earnedTrophies = calculateUserTrophies(userStats);
      const availableBadges = getAvailableBadges(userStats, false);
      
      // ユーザードキュメントを取得
      const userRef = doc(db, 'users', authorId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // トロフィーIDのリストを作成
        const trophyIds = earnedTrophies.map(trophy => trophy.id);
        const badgeIds = availableBadges.map(badge => badge.id);
        
        // ユーザードキュメントを更新
        userBatch.update(userRef, {
          earnedTrophies: trophyIds,
          availableBadges: badgeIds,
          stats: userStats,
          lastUpdated: Timestamp.now()
        });
        
        // 更新されたユーザーを記録
        updatedUsers.push({
          userId: authorId,
          trophyCount: trophyIds.length,
          badgeCount: badgeIds.length,
          stats: {
            articleCount: userStats.articleCount,
            likeCount: userStats.likeCount,
            usefulCount: userStats.usefulCount,
            averageScore: Math.round(userStats.averageScore * 10) / 10
          }
        });
      }
    } catch (error) {
      console.error(`ユーザー ${authorId} のトロフィー計算エラー:`, error);
    }
  }
  
  // バッチ更新を実行
  await userBatch.commit();
  
  // トロフィー再計算の時刻を記録
  await setDoc(doc(searchDb, 'system', 'trophiesLastUpdated'), {
    timestamp: Date.now()
  });
  
  return {
    processed: updatedUsers.length,
    results: updatedUsers.slice(0, 20) // 結果の一部のみ返す
  };
}
