import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { db, searchDb } from '../../../../firebase/config';
import { calculateArticleScore } from '../../../../utils/articleScoreCalculator';

const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const userIdHeader = request.headers.get('user-id');
    if (!userIdHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者権限チェック
    const userDoc = await getDoc(doc(db, 'users', userIdHeader));
    if (!userDoc.exists() || userDoc.data().email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // リクエストボディからデータ取得
    const requestData = await request.json();
    const { limit = 100 } = requestData; // デフォルトは100件

    // 処理開始時間
    const startTime = Date.now();

    // 全記事のスコアを再計算
    const processedCount = await recalculateAllScores(limit);

    // 処理時間
    const processingTime = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      processedCount,
      message: `${processedCount}件の記事スコアを再計算しました`,
      processingTime: `${processingTime.toFixed(2)}秒`
    });
  } catch (error) {
    console.error('スコア再計算エラー:', error);
    return NextResponse.json(
      { error: 'スコアの再計算中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 全記事のスコアを再計算する関数
async function recalculateAllScores(limit: number): Promise<number> {
  // searchDBの記事サマリーを取得
  const articlesQuery = query(collection(searchDb, 'articleSummaries'));
  const articleSnapshot = await getDocs(articlesQuery);
  
  let processedCount = 0;
  const batchSize = 500; // 一度に処理する最大数
  let batch = writeBatch(searchDb);
  let batchCount = 0;
  
  for (const docSnapshot of articleSnapshot.docs) {
    if (processedCount >= limit) break;
    
    const articleData = docSnapshot.data();
    const articleId = docSnapshot.id;
    
    if (!articleId) continue; // IDがない場合はスキップ
    
    // スコアを計算
    const score = calculateArticleScore(
      articleData.content || '',
      articleData.likeCount || 0,
      articleData.usefulCount || 0,
      articleData.dislikeCount || 0
    );
    
    // スコアを更新
    batch.update(doc(searchDb, 'articleSummaries', articleId), {
      articleScore: score
    });
    
    batchCount++;
    processedCount++;
    
    // バッチが一定サイズになったらコミット
    if (batchCount >= batchSize) {
      await batch.commit();
      batch = writeBatch(searchDb);
      batchCount = 0;
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
  }
  
  // 最後の更新日時を記録
  await updateDoc(doc(searchDb, 'system', 'lastUpdated'), {
    timestamp: Date.now()
  });
  
  return processedCount;
}
