import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from './config';
import { Notification, NotificationResponse } from '../types/notification';

const INFO_COLLECTION = 'info';
const NOTIFICATIONS_DOC = 'notifications';

// 通知を追加
export async function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now(),
      read: false
    };

    if (!notificationDoc.exists()) {
      // 初めての通知の場合、ドキュメントを作成
      await setDoc(notificationsRef, {
        notifications: {
          [notification.userId]: {
            items: [newNotification],
            unreadCount: 1
          }
        }
      });
    } else {
      // 既存の通知に追加
      const userData = notificationDoc.data()?.notifications?.[notification.userId];
      if (userData) {
        await updateDoc(notificationsRef, {
          [`notifications.${notification.userId}.items`]: arrayUnion(newNotification),
          [`notifications.${notification.userId}.unreadCount`]: increment(1)
        });
      } else {
        await updateDoc(notificationsRef, {
          [`notifications.${notification.userId}`]: {
            items: [newNotification],
            unreadCount: 1
          }
        });
      }
    }
  } catch (error) {
    console.error('通知の追加に失敗:', error);
    throw error;
  }
}

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

    return {
      notifications: userData.items || [],
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

    const updatedItems = userData.items.map((item: Notification) => {
      if (item.id === notificationId && !item.read) {
        return { ...item, read: true };
      }
      return item;
    });

    await updateDoc(notificationsRef, {
      [`notifications.${userId}.items`]: updatedItems,
      [`notifications.${userId}.unreadCount`]: Math.max(0, userData.unreadCount - 1)
    });
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

    const updatedItems = userData.items.map((item: Notification) => ({
      ...item,
      read: true
    }));

    await updateDoc(notificationsRef, {
      [`notifications.${userId}.items`]: updatedItems,
      [`notifications.${userId}.unreadCount`]: 0
    });
  } catch (error) {
    console.error('全通知の既読化に失敗:', error);
    throw error;
  }
}
