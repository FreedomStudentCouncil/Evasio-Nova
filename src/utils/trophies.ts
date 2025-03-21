import { 
  FiBookOpen, FiAward, FiThumbsUp, FiHeart, FiStar, FiTrendingUp, 
  FiHash, FiCoffee, FiZap, FiTarget, FiCode, FiClipboard, FiBook,
  FiTool, FiFeather, FiPenTool, FiCpu, FiActivity, FiDatabase, FiUsers,
  FiLayers, FiGlobe, FiShield, FiBriefcase
} from 'react-icons/fi';
import {
  HiOutlineBadgeCheck, HiOutlineChatAlt, HiOutlineChartBar, HiOutlineHeart,
  HiOutlineFire, HiOutlineLightningBolt, HiOutlineStar, HiOutlineSun,
  HiOutlineSparkles, HiOutlineGlobeAlt, HiOutlineAcademicCap
} from 'react-icons/hi';
import { IconType } from 'react-icons';

// トロフィーの定義
export interface Trophy {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  color: string;
  condition: (stats: UserStats) => boolean;
  level?: number; // オプションの難易度レベル (1-5)
}

// ユーザーの統計情報
export interface UserStats {
  likeCount: number;
  usefulCount: number;
  articleCount: number;
  averageScore: number;
  totalScore: number;
}

// 全トロフィー一覧
export const allTrophies: Trophy[] = [
  // 記事数関連のトロフィー
  {
    id: 'first-article',
    title: '最初の一歩',
    description: '初めての記事を投稿しました',
    icon: FiBookOpen,
    color: 'text-blue-400',
    condition: (stats) => stats.articleCount >= 1,
    level: 1
  },
  {
    id: 'prolific-author',
    title: '多作の著者',
    description: '5つ以上の記事を投稿しました',
    icon: FiBook,
    color: 'text-indigo-400',
    condition: (stats) => stats.articleCount >= 5,
    level: 2
  },
  {
    id: 'expert-contributor',
    title: 'エキスパート投稿者',
    description: '10つ以上の記事を投稿しました',
    icon: HiOutlineAcademicCap,
    color: 'text-purple-400',
    condition: (stats) => stats.articleCount >= 10,
    level: 3
  },
  {
    id: 'authority',
    title: '権威ある投稿者',
    description: '20つ以上の記事を投稿しました',
    icon: FiAward, // HiOutlineTrophyはインポートされていないため修正
    color: 'text-amber-500',
    condition: (stats) => stats.articleCount >= 20,
    level: 4
  },
  
  // いいね関連のトロフィー
  {
    id: 'first-likes',
    title: '初めての「いいね」',
    description: '累計10いいねを獲得しました',
    icon: FiThumbsUp,
    color: 'text-pink-400',
    condition: (stats) => stats.likeCount >= 10,
    level: 1
  },
  {
    id: 'popular-author',
    title: '人気の著者',
    description: '累計50いいねを獲得しました',
    icon: FiHeart,
    color: 'text-pink-500',
    condition: (stats) => stats.likeCount >= 50,
    level: 2
  },
  {
    id: 'like-superstar',
    title: 'いいねスーパースター',
    description: '累計100いいねを獲得しました',
    icon: HiOutlineHeart,
    color: 'text-pink-600',
    condition: (stats) => stats.likeCount >= 100,
    level: 3
  },
  {
    id: 'like-legend',
    title: 'いいねレジェンド',
    description: '累計200いいねを獲得しました',
    icon: HiOutlineFire,
    color: 'text-red-500',
    condition: (stats) => stats.likeCount >= 200,
    level: 4
  },
  
  // 使えた！関連のトロフィー
  {
    id: 'first-useful',
    title: '初めての「使えた！」',
    description: '累計5「使えた！」を獲得しました',
    icon: FiTarget,
    color: 'text-green-400',
    condition: (stats) => stats.usefulCount >= 5,
    level: 1
  },
  {
    id: 'helpful-author',
    title: '役立つ著者',
    description: '累計25「使えた！」を獲得しました',
    icon: FiClipboard,
    color: 'text-green-500',
    condition: (stats) => stats.usefulCount >= 25,
    level: 2
  },
  {
    id: 'useful-superstar',
    title: '有用性スーパースター',
    description: '累計50「使えた！」を獲得しました',
    icon: FiZap,
    color: 'text-green-600',
    condition: (stats) => stats.usefulCount >= 50,
    level: 3
  },
  {
    id: 'useful-legend',
    title: '有用性レジェンド',
    description: '累計100「使えた！」を獲得しました',
    icon: HiOutlineLightningBolt,
    color: 'text-emerald-500',
    condition: (stats) => stats.usefulCount >= 100,
    level: 4
  },
  
  // 品質関連のトロフィー
  {
    id: 'quality-content',
    title: '高品質コンテンツ',
    description: '平均評価値が3.5以上です',
    icon: FiStar,
    color: 'text-yellow-400',
    condition: (stats) => stats.averageScore >= 3.5 && stats.articleCount >= 2,
    level: 1
  },
  {
    id: 'high-quality',
    title: '優れた品質',
    description: '平均評価値が4.0以上です',
    icon: HiOutlineStar,
    color: 'text-yellow-500',
    condition: (stats) => stats.averageScore >= 4.0 && stats.articleCount >= 3,
    level: 2
  },
  {
    id: 'quality-expert',
    title: '品質エキスパート',
    description: '平均評価値が4.5以上です',
    icon: FiAward,
    color: 'text-yellow-600',
    condition: (stats) => stats.averageScore >= 4.5 && stats.articleCount >= 5,
    level: 3
  },
  {
    id: 'quality-legend',
    title: '品質レジェンド',
    description: '平均評価値が4.8以上です',
    icon: HiOutlineSparkles,
    color: 'text-amber-600',
    condition: (stats) => stats.averageScore >= 4.8 && stats.articleCount >= 5,
    level: 4
  },
  
  // 特殊カテゴリのトロフィー
  {
    id: 'rising-star',
    title: '急上昇の星',
    description: '評価値とコンテンツ数のバランスが優れています',
    icon: FiTrendingUp,
    color: 'text-cyan-400',
    condition: (stats) => stats.averageScore >= 4.0 && stats.articleCount >= 3 && stats.likeCount >= 15,
    level: 2
  },
  {
    id: 'tech-guru',
    title: 'テクノロジーグル',
    description: '記事数、いいね、使えた！がすべて一定数以上',
    icon: FiCpu,
    color: 'text-violet-500',
    condition: (stats) => 
      stats.articleCount >= 7 && 
      stats.likeCount >= 30 && 
      stats.usefulCount >= 20,
    level: 3
  },
  {
    id: 'community-pillar',
    title: 'コミュニティの柱',
    description: '多くの記事と高い評価を獲得しています',
    icon: FiUsers,
    color: 'text-blue-600',
    condition: (stats) => 
      stats.articleCount >= 10 && 
      stats.likeCount >= 50 && 
      stats.usefulCount >= 40 && 
      stats.averageScore >= 4.0,
    level: 4
  },
  {
    id: 'wiki-master',
    title: 'Wikiマスター',
    description: 'すべての面で卓越したウィキ貢献者',
    icon: HiOutlineGlobeAlt,
    color: 'text-indigo-500',
    condition: (stats) => 
      stats.articleCount >= 15 && 
      stats.likeCount >= 75 && 
      stats.usefulCount >= 50 && 
      stats.averageScore >= 4.5,
    level: 5
  }
];

// 特定のユーザーが獲得したトロフィーを計算
export function calculateUserTrophies(stats: UserStats): Trophy[] {
  return allTrophies.filter(trophy => trophy.condition(stats));
}

// バッジの定義
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: IconType;
  color: string;
  requiresAdmin?: boolean;
  trophyRequirement?: string; // 特定のトロフィーID
}

// 全バッジ一覧
export const allBadges: Badge[] = [
  {
    id: 'admin',
    name: '管理者',
    description: 'Evasio-Nova管理者のバッジ',
    icon: FiShield,
    color: 'text-indigo-500',
    requiresAdmin: true
  },
  {
    id: 'expert',
    name: 'エキスパート',
    description: '品質エキスパートトロフィー獲得者',
    icon: HiOutlineBadgeCheck,
    color: 'text-yellow-500',
    trophyRequirement: 'quality-expert'
  },
  {
    id: 'helpful',
    name: '有用性王',
    description: '有用性スーパースタートロフィー獲得者',
    icon: HiOutlineLightningBolt,
    color: 'text-green-500',
    trophyRequirement: 'useful-superstar'
  },
  {
    id: 'popular',
    name: '人気者',
    description: 'いいねスーパースタートロフィー獲得者',
    icon: HiOutlineHeart,
    color: 'text-pink-500',
    trophyRequirement: 'like-superstar'
  },
  {
    id: 'researcher',
    name: '研究者',
    description: 'エキスパート投稿者トロフィー獲得者',
    icon: HiOutlineAcademicCap,
    color: 'text-purple-500',
    trophyRequirement: 'expert-contributor'
  },
  {
    id: 'guru',
    name: 'グル',
    description: 'テクノロジーグルトロフィー獲得者',
    icon: FiCpu,
    color: 'text-violet-500',
    trophyRequirement: 'tech-guru'
  },
  {
    id: 'master',
    name: 'マスター',
    description: 'Wikiマスタートロフィー獲得者',
    icon: HiOutlineGlobeAlt,
    color: 'text-indigo-500',
    trophyRequirement: 'wiki-master'
  }
];

// ユーザーが選択できるバッジをフィルタリング
export function getAvailableBadges(stats: UserStats, isAdmin: boolean): Badge[] {
  // 獲得したトロフィーのIDリスト
  const earnedTrophyIds = calculateUserTrophies(stats).map(t => t.id);
  
  return allBadges.filter(badge => {
    // 管理者バッジは管理者のみ
    if (badge.requiresAdmin) return isAdmin;
    
    // トロフィー要件があるバッジはそのトロフィーを獲得している必要がある
    if (badge.trophyRequirement) {
      return earnedTrophyIds.includes(badge.trophyRequirement);
    }
    
    // その他のバッジ（要件なし）
    return true;
  });
}
