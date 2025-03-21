import { collection, doc, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { NotificationType, Notification, NotificationResponse } from '../types/notification';
import { getDoc } from 'firebase/firestore';
const INFO_COLLECTION = 'info';
const NOTIFICATIONS_DOC = 'notifications';
const MAX_NOTIFICATIONS = 20; // 1ユーザーあたりの最大通知数

// デバッグ用のログフラグ
const DEBUG = true;

// 通知を追加
export async function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'read'>): Promise<string> {
  try {
    const notificationRef = collection(db, 'notifications');
    
    const notificationData = {
      ...notification,
      isRead: false,
      read: false, // 後方互換性のため
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(notificationRef, notificationData);
    return docRef.id;
  } catch (error) {
    console.error('通知の追加に失敗しました:', error);
    throw error;
  }
}

// 既存の関数...

// トロフィー獲得通知を送信する関数
export async function sendTrophyNotification(userId: string, trophyId: string, trophyTitle: string) {
  return addNotification({
    userId,
    type: 'trophy',
    content: `新しいトロフィー「${trophyTitle}」を獲得しました！`,
    date: new Date(),
    trophyId
  });
}

// バッジ獲得通知を送信する関数
export async function sendBadgeNotification(userId: string, badgeId: string, badgeTitle: string) {
  return addNotification({
    userId,
    type: 'badge',
    content: `新しいバッジ「${badgeTitle}」を獲得しました！`,
    date: new Date(),
    badgeId
  });
}

// 残りの既存の関数...

// ユーザーの通知を取得
export async function getUserNotifications(userId: string): Promise<NotificationResponse> {
  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    if (!notificationDoc.exists()) {
      return { notifications: [], unreadCount: 0 };
    }

    const userData = notificationDoc.data()?.notifications?.[userId];
    if (!userData) {
      return { notifications: [], unreadCount: 0 };
    }

    const notifications = userData.items || [];
    // 日付の新しい順にソート
    notifications.sort((a: Notification, b: Notification) => {
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    });

    return {
      notifications: notifications,
      unreadCount: userData.unreadCount || 0
    };
  } catch (error) {
    console.error('通知の取得に失敗:', error);
    return { notifications: [], unreadCount: 0 };
  }
}

// 通知を既読にする
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    if (!notificationDoc.exists()) return;

    const userData = notificationDoc.data()?.notifications?.[userId];
    if (!userData) return;

    const items = userData.items || [];
    let decrementCount = 0;

    const updatedItems = items.map((item: Notification) => {
      if (item.id === notificationId && !(item.isRead || item.read)) {
        decrementCount = 1;
        return { ...item, isRead: true, read: true };
      }
      return item;
    });

    await updateDoc(notificationsRef, {
      [`notifications.${userId}.items`]: updatedItems,
      [`notifications.${userId}.unreadCount`]: Math.max(0, (userData.unreadCount || 0) - decrementCount)
    });
    
    if (DEBUG) console.log(`通知を既読にしました: ${notificationId}`);
  } catch (error) {
    console.error('通知の既読化に失敗:', error);
    throw error;
  }
}

// すべての通知を既読にする
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    if (!notificationDoc.exists()) return;

    const userData = notificationDoc.data()?.notifications?.[userId];
    if (!userData) return;

    const updatedItems = (userData.items || []).map((item: Notification) => ({
      ...item,
      isRead: true,
      read: true
    }));

    await updateDoc(notificationsRef, {
      [`notifications.${userId}.items`]: updatedItems,
      [`notifications.${userId}.unreadCount`]: 0
    });
    
    if (DEBUG) console.log(`すべての通知を既読にしました: ${userId}`);
  } catch (error) {
    console.error('全通知の既読化に失敗:', error);
    throw error;
  }
}

// 古い通知を削除（20件を超える場合）
export async function pruneOldNotifications(userId: string): Promise<void> {
  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    if (!notificationDoc.exists()) return;

    const userData = notificationDoc.data()?.notifications?.[userId];
    if (!userData) return;

    const items = userData.items || [];
    
    if (items.length <= MAX_NOTIFICATIONS) return;
    
    // 日付でソートして最新MAX_NOTIFICATIONS件を保持
    const sortedItems = [...items].sort((a, b) => {
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    }).slice(0, MAX_NOTIFICATIONS);
    
    // 未読カウントを再計算
    const newUnreadCount = sortedItems.filter(item => !(item.isRead || item.read)).length;
    
    await updateDoc(notificationsRef, {
      [`notifications.${userId}.items`]: sortedItems,
      [`notifications.${userId}.unreadCount`]: newUnreadCount
    });
    
    if (DEBUG) console.log(`古い通知を整理しました: ${userId} (${items.length} -> ${sortedItems.length}件)`);
  } catch (error) {
    console.error('古い通知の整理に失敗:', error);
  }
}

/**
 * ユーザーの未読通知数を取得する
 * @param userId ユーザーID
 * @returns 未読通知数
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    if (!notificationDoc.exists()) return 0;
    
    const userData = notificationDoc.data()?.notifications?.[userId];
    if (!userData) return 0;
    
    return userData.unreadCount || 0;
  } catch (error) {
    console.error('未読通知数取得エラー:', error);
    return 0;
  }
}
