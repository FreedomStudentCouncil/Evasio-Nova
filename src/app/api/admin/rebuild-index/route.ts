import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, searchDb } from '../../../../firebase/config';
import { calculateArticleScore } from '../../../../utils/articleScoreCalculator';
import { Timestamp } from 'firebase/firestore';
const ADMIN_EMAIL = "egnm9stasshe@gmail.com";
export const dynamic = "force-static";
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

    // 検索インデックスの再構築
    const { processedArticles, processedTags } = await rebuildSearchIndex();
    
    // 処理完了時間記録
    await setDoc(doc(searchDb, 'system', 'indexLastRebuilt'), {
      timestamp: Date.now(),
      rebuiltBy: userIdHeader
    });
    
    // その他のシステムデータも更新
    await setDoc(doc(searchDb, 'system', 'otherLastUpdated'), {
      timestamp: Date.now()
    });

    // 処理時間
    const processingTime = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      processedArticles,
      processedTags,
      message: 'インデックスの再構築が完了しました',
      processingTime: `${processingTime.toFixed(2)}秒`
    });
  } catch (error) {
    console.error('インデックス再構築エラー:', error);
    return NextResponse.json(
      { error: 'インデックスの再構築中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 検索インデックスを再構築する関数
async function rebuildSearchIndex() {
  let processedArticles = 0;
  let processedTags = 0;
  
  // 1. 記事概要のインデックスを再構築
  const articlesRef = collection(db, 'wikiArticles');
  const articleSnapshot = await getDocs(articlesRef);
  
  // バッチ処理用
  let batch = writeBatch(searchDb);
  let batchCount = 0;
  
  // タグカウントを集計するオブジェクト
  const tagCounts: { [tagName: string]: number } = {};
  
  // 各記事を処理
  for (const docSnapshot of articleSnapshot.docs) {
    const articleData = docSnapshot.data();
    const articleId = docSnapshot.id;
    
    // IDが存在しない場合はスキップ
    if (!articleId) continue;
    
    // 記事スコアを計算
    const score = calculateArticleScore(
      articleData.content || '',
      articleData.likeCount || 0,
      articleData.usefulCount || 0,
      articleData.dislikeCount || 0
    );
    
    // 記事概要を作成
    const summaryRef = doc(searchDb, 'articleSummaries', articleId);
    batch.set(summaryRef, {
      id: articleId,
      title: articleData.title || '',
      description: articleData.description || '',
      tags: articleData.tags || [],
      author: articleData.author || '',
      authorId: articleData.authorId || '',
      imageUrl: articleData.imageUrl || null,
      date: articleData.date || Timestamp.now(),
      lastUpdated: articleData.lastUpdated || Timestamp.now(),
      usefulCount: articleData.usefulCount || 0,
      likeCount: articleData.likeCount || 0,
      dislikeCount: articleData.dislikeCount || 0,
      articleScore: score
    });
    
    // タグカウントを更新
    if (Array.isArray(articleData.tags)) {
      articleData.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
    
    processedArticles++;
    batchCount++;
    
    // 500件ごとにバッチコミット
    if (batchCount >= 500) {
      await batch.commit();
      batch = writeBatch(searchDb);
      batchCount = 0;
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
  }
  
  // 2. タグのインデックスを再構築
  batch = writeBatch(searchDb);
  batchCount = 0;
  
  // 各タグを処理
  for (const [tagName, count] of Object.entries(tagCounts)) {
    const tagRef = doc(searchDb, 'tags', tagName);
    batch.set(tagRef, {
      count,
      lastUsed: Timestamp.now()
    });
    
    processedTags++;
    batchCount++;
    
    // 500件ごとにバッチコミット
    if (batchCount >= 500) {
      await batch.commit();
      batch = writeBatch(searchDb);
      batchCount = 0;
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
  }
  
  return { processedArticles, processedTags };
}
