import { NextRequest, NextResponse } from 'next/server';
import { 
  collection,
  getDocs,
  doc, 
  getDoc, 
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, searchDb } from '../../../../firebase/config';
import { calculateArticleScore } from '../../../../utils/articleScoreCalculator';
import { auth } from '../../../../firebase/auth';

// 型定義を追加
interface ArticleSummary {
  id: string;
  title: string;
  authorId: string;
  likeCount: number;
  usefulCount: number;
  dislikeCount: number;
  articleScore: number;
  [key: string]: any; // その他のプロパティも受け入れる
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者メールアドレスの確認
    const adminEmail = "egnm9stasshe@gmail.com"; // 指定の管理者メールアドレス
    
    try {
      // Firebase Authの代わりに、ユーザーデータベースからチェック
      const decodedToken = await auth.currentUser?.getIdTokenResult(true);
      
      // メールアドレスで管理者かどうかを判定
      if (!decodedToken || decodedToken.claims.email !== adminEmail) {
        // Firebase Authでメールアドレスが取得できない場合は、Firestoreから取得
        const userRef = request.headers.get('user-id');
        if (!userRef) {
          return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
        }
        
        const userSnapshot = await getDoc(doc(db, 'users', userRef));
        if (!userSnapshot.exists() || userSnapshot.data().email !== adminEmail) {
          return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
        }
      }
    } catch (error) {
      console.error('認証エラー:', error);
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    // 記事データを取得
    const articleSummariesRef = collection(searchDb, 'articleSummaries');
    const querySnapshot = await getDocs(articleSummariesRef);
    
    const articles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArticleSummary[];

    const batch = writeBatch(searchDb);
    const results: Array<{id: string, title: string, oldScore: number, newScore: number}> = [];
    let processedCount = 0;
    let errorCount = 0;

    // 各記事のスコアを再計算
    for (const article of articles) {
      try {
        // メインDBから詳細な記事データを取得
        const mainArticleRef = doc(db, 'wikiArticles', article.id);
        const mainArticleSnap = await getDoc(mainArticleRef);
        
        if (!mainArticleSnap.exists()) {
          console.warn(`記事が見つかりません: ${article.id}`);
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
        console.error(`記事 ${article.id} の処理中にエラー:`, error);
        errorCount++;
      }
    }

    // バッチ更新を実行
    await batch.commit();

    // 著者スコアの再計算
    const authorCountsRef = doc(searchDb, 'counts', 'author');
    const authorCountsDoc = await getDoc(authorCountsRef);
    let authorCounts: {[key: string]: any} = {};
    
    if (authorCountsDoc.exists()) {
      authorCounts = authorCountsDoc.data().counts || {};
    }
    
    // 各著者の記事スコア合計を計算
    for (const article of articles) {
      const authorId = article.authorId;
      if (!authorId) continue;
      
      if (!authorCounts[authorId]) {
        authorCounts[authorId] = {
          likeCount: article.likeCount || 0,
          usefulCount: article.usefulCount || 0,
          articleScoreSum: article.articleScore || 0,
          articleCount: 1
        };
      } else {
        // 著者の全記事を検索してスコア合計を再計算
        const authorArticlesQuery = query(
          collection(searchDb, 'articleSummaries'),
          where('authorId', '==', authorId)
        );
        
        const authorArticlesSnapshot = await getDocs(authorArticlesQuery);
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
        
        authorCounts[authorId] = {
          likeCount,
          usefulCount,
          articleScoreSum: scoreSum,
          articleCount
        };
      }
    }
    
    // 著者カウンテータを更新
    await updateDoc(authorCountsRef, {
      counts: authorCounts,
      lastUpdated: Date.now()
    });

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    console.error('スコア再計算エラー:', error);
    return NextResponse.json(
      { error: 'スコアの再計算中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
