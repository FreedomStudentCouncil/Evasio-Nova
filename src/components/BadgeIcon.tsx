import React from 'react';
import { allBadges } from '../utils/trophies';
import { FiAward } from 'react-icons/fi';

interface BadgeIconProps {
  badgeId: string;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg';
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({ badgeId, size = 'md' }) => {
  const badge = allBadges.find(b => b.id === badgeId);
  
  // バッジが見つからない場合はデフォルトのアイコンを表示
  if (!badge) {
    return <FiAward className="text-yellow-500" />;
  }
  
  const BadgeIcon = badge.icon;
  
  // サイズに基づいてテキストサイズクラスを決定
  const sizeClass = {
    '2xs': 'text-[0.65rem]', // カスタムサイズ (極小)
    'xs': 'text-xs',         // 極小サイズ
    'sm': 'text-sm',         // 小サイズ
    'md': 'text-base',       // 中サイズ (デフォルト)
    'lg': 'text-lg'          // 大サイズ
  }[size];
  
  return (
    <BadgeIcon className={`${badge.color} ${sizeClass}`} />
  );
};
