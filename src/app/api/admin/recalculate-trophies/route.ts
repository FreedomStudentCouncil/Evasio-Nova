import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, getDocs, doc, getDoc, query, 
  where, writeBatch, setDoc, Timestamp 
} from 'firebase/firestore';
import { db, searchDb } from '../../../../firebase/config';
import { calculateUserTrophies, getAvailableBadges } from '../../../../utils/trophies';
export const dynamic = "force-static";
// 管理者メールアドレス
const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

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

    // トロフィーとバッジの再計算
    const { processed, results } = await recalculateTrophiesAndBadges();
    
    // 処理時間
    const processingTime = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      processed,
      results,
      processingTime: `${processingTime.toFixed(2)}秒`
    });
  } catch (error) {
    console.error('トロフィー再計算エラー:', error);
    return NextResponse.json(
      { error: 'トロフィーの再計算中にエラーが発生しました' },
      { status: 500 }
    );
  }
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
        // 現在のトロフィーとバッジを取得
        const currentUserData = userSnap.data();
        const currentTrophies = currentUserData.earnedTrophies || [];
        const currentBadges = currentUserData.availableBadges || [];
        
        // トロフィーIDのリストを作成
        const trophyIds = earnedTrophies.map(trophy => trophy.id);
        const badgeIds = availableBadges.map(badge => badge.id);
        
        // 新しく獲得したトロフィーを特定
        const newTrophies = trophyIds.filter(id => !currentTrophies.includes(id));
        const newBadges = badgeIds.filter(id => !currentBadges.includes(id));
        
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
          newTrophies,
          newBadges,
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
    results: updatedUsers
  };
}
