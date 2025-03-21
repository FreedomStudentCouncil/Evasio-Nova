'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiBell, FiCheck, FiAward, FiInfo } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../firebase/notification';
import { Notification } from '../../types/notification';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchNotifications = async () => {
      try {
        console.log('通知を取得中...');
        const { notifications, unreadCount } = await getUserNotifications(user.uid);
        console.log(`取得完了: ${notifications.length}件、未読: ${unreadCount}件`);
        setNotifications(notifications);
      } catch (error) {
        console.error('通知の取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, router]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      await markNotificationAsRead(user.uid, notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('通知の既読化に失敗:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('全通知の既読化に失敗:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-24">
        <div className="text-center py-8">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <FiBell className="mr-2" />
            通知
          </h1>
          {notifications.some(n => !n.read) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              すべて既読にする
            </motion.button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            通知はありません
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg transition-colors ${
                  notification.read ? 'bg-white/5' : 'bg-blue-500/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  {notification.type === 'trophy' || notification.type === 'badge' ? (
                    // トロフィーやバッジの通知の場合
                    <div className="flex-1">
                      <div className="mb-2 flex items-center">
                        {notification.type === 'trophy' && <FiAward className="text-yellow-400 mr-2" />}
                        {notification.type === 'badge' && <FiInfo className="text-blue-400 mr-2" />}
                        <div className="font-medium">
                          {notification.type === 'trophy' && `トロフィー「${notification.trophyName}」を獲得しました！`}
                          {notification.type === 'badge' && `バッジ「${notification.badgeName}」を設定しました`}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300">
                        おめでとうございます！プロフィールページで確認できます。
                      </div>
                    </div>
                  ) : (
                    // 記事関連の通知の場合
                    <Link href={`/wiki/article?id=${notification.articleId}`} className="flex-1">
                      <div className="mb-2">
                        <div className="font-medium">
                          {notification.senderName}さんが
                          {notification.type === 'comment' && 'コメントを投稿しました'}
                          {notification.type === 'reply' && '返信しました'}
                          {notification.type === 'like' && 'いいねしました'}
                        </div>
                        <div className="text-sm text-gray-400">
                          記事: {notification.articleTitle}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">{notification.content}</p>
                    </Link>
                  )}

                  {!notification.read && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMarkAsRead(notification.id || '')}
                      className="ml-4 p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <FiCheck />
                    </motion.button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
