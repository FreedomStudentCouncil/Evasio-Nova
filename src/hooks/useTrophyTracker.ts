import { useEffect, useRef, useState } from 'react';
import { Trophy, calculateUserTrophies, UserStats, Badge, getAvailableBadges } from '../utils/trophies';
import { sendTrophyNotification, sendBadgeNotification } from '../firebase/notification';

interface UseTrophyTrackerProps {
  userId: string;
  userStats: UserStats;
  isAdmin: boolean;
  isActive: boolean; // トラッキングを有効にするかどうか（自分のプロフィールページのみで有効にするため）
}

interface TrophyTrackerReturn {
  earnedTrophies: Trophy[];
  availableBadges: Badge[];
  newTrophies: Trophy[];
  clearNewTrophies: () => void;
}

// 以前獲得したトロフィーIDをローカルストレージから取得
const getPreviousTrophies = (userId: string): string[] => {
  if (typeof window === 'undefined') return []; // サーバーサイドレンダリング対応
  
  try {
    const stored = localStorage.getItem(`user_trophies_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('トロフィーデータの取得に失敗:', e);
    return [];
  }
};

// 獲得したトロフィーIDをローカルストレージに保存
const saveTrophies = (userId: string, trophyIds: string[]): void => {
  if (typeof window === 'undefined') return; // サーバーサイドレンダリング対応
  
  try {
    localStorage.setItem(`user_trophies_${userId}`, JSON.stringify(trophyIds));
  } catch (e) {
    console.error('トロフィーデータの保存に失敗:', e);
  }
};

export default function useTrophyTracker({
  userId,
  userStats,
  isAdmin,
  isActive = true
}: UseTrophyTrackerProps): TrophyTrackerReturn {
  const [earnedTrophies, setEarnedTrophies] = useState<Trophy[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [newTrophies, setNewTrophies] = useState<Trophy[]>([]);
  const prevTrophyIdsRef = useRef<string[]>([]);
  // トラッキングの実行状態を追跡
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // 条件付き実行をuseEffectの中に移動
    if (!userId || !isActive) {
      // 非アクティブでも空の値を設定する
      setEarnedTrophies([]);
      setAvailableBadges([]);
      return;
    }
    
    // ユーザーの獲得トロフィーを計算
    const trophies = calculateUserTrophies(userStats);
    setEarnedTrophies(trophies);
    
    // 利用可能なバッジを計算
    const badges = getAvailableBadges(userStats, isAdmin);
    setAvailableBadges(badges);
    
    // 新トロフィー通知処理（アクティブな場合のみ実行）
    if (isActive && !hasTrackedRef.current) {
      // 以前に獲得済みのトロフィーIDを取得
      const prevTrophyIds = getPreviousTrophies(userId);
      prevTrophyIdsRef.current = prevTrophyIds;
      
      // 新しく獲得したトロフィーを検出
      const currentTrophyIds = trophies.map(t => t.id);
      const newlyEarnedTrophies = trophies.filter(trophy => !prevTrophyIds.includes(trophy.id));
      
      if (newlyEarnedTrophies.length > 0) {
        setNewTrophies(newlyEarnedTrophies);
        
        // 新しいトロフィーごとに通知を送信
        newlyEarnedTrophies.forEach(async (trophy) => {
          try {
            await sendTrophyNotification(userId, trophy.id, trophy.title);
            console.log(`トロフィー獲得通知を送信: ${trophy.title}`);
          } catch (error) {
            console.error('トロフィー通知の送信に失敗:', error);
          }
        });
        
        // 獲得済みトロフィーIDを更新
        saveTrophies(userId, currentTrophyIds);
      }
      
      // 一度だけ実行したことをマーク
      hasTrackedRef.current = true;
    }
  }, [userId, userStats, isAdmin, isActive]);

  // コンポーネントのアンマウント時やuserIdが変わった時にhasTrackedRefをリセット
  useEffect(() => {
    return () => {
      hasTrackedRef.current = false;
    };
  }, [userId]);

  // 新しいトロフィーリストをクリアする関数
  const clearNewTrophies = () => {
    setNewTrophies([]);
  };

  return {
    earnedTrophies,
    availableBadges,
    newTrophies,
    clearNewTrophies
  };
}
