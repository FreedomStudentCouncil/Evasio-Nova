import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  increment,
  limit
} from 'firebase/firestore';
import { db } from './config';
import { Notification, NotificationResponse } from '../types/notification';

const INFO_COLLECTION = 'info';
const NOTIFICATIONS_DOC = 'notifications';
const MAX_NOTIFICATIONS = 20; // 1ユーザーあたりの最大通知数

// デバッグ用のログフラグ
const DEBUG = true;

// 通知を追加
export async function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  if (DEBUG) console.log('通知追加開始:', notification);

  try {
    const notificationsRef = doc(db, INFO_COLLECTION, NOTIFICATIONS_DOC);
    const notificationDoc = await getDoc(notificationsRef);
    
    // 新しい通知オブジェクトを作成
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now(),
      read: false
    };
    
    if (DEBUG) console.log('作成した通知オブジェクト:', newNotification);

    if (!notificationDoc.exists()) {
      // 初めての通知の場合、ドキュメントを新規作成
      if (DEBUG) console.log('通知ドキュメントが存在しないため新規作成します');
      
      await setDoc(notificationsRef, {
        notifications: {
          [notification.userId]: {
            items: [newNotification],
            unreadCount: 1
          }
        }
      });
      
      if (DEBUG) console.log('通知ドキュメントを新規作成しました');
    } else {
      // 既存の通知ドキュメントが存在する場合
      const userData = notificationDoc.data()?.notifications?.[notification.userId];
      
      if (userData) {
        // 既存のユーザーデータがある場合
        if (DEBUG) console.log('既存のユーザー通知データを更新します:', notification.userId);
        
        // 通知配列を取得（存在しない場合は空配列）
        const currentItems = userData.items || [];
        
        // 新しい通知を先頭に追加して、最大件数に制限
        const updatedItems = [newNotification, ...currentItems].slice(0, MAX_NOTIFICATIONS);
        
        await updateDoc(notificationsRef, {
          [`notifications.${notification.userId}.items`]: updatedItems,
          [`notifications.${notification.userId}.unreadCount`]: increment(1)
        });
        
        if (DEBUG) console.log('ユーザーの通知を更新しました。件数:', updatedItems.length);
      } else {
        // ユーザーのデータがまだない場合は新しく作成
        if (DEBUG) console.log('ユーザーの通知データを新規作成します:', notification.userId);
        
        await updateDoc(notificationsRef, {
          [`notifications.${notification.userId}`]: {
            items: [newNotification],
            unreadCount: 1
          }
        });
        
        if (DEBUG) console.log('ユーザーの通知データを作成しました');
      }
    }
  } catch (error) {
    console.error('通知の追加に失敗:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('エラースタック:', error.stack);
    }
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
      if (item.id === notificationId && !item.read) {
        decrementCount = 1;
        return { ...item, read: true };
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
    const newUnreadCount = sortedItems.filter(item => !item.read).length;
    
    await updateDoc(notificationsRef, {
      [`notifications.${userId}.items`]: sortedItems,
      [`notifications.${userId}.unreadCount`]: newUnreadCount
    });
    
    if (DEBUG) console.log(`古い通知を整理しました: ${userId} (${items.length} -> ${sortedItems.length}件)`);
  } catch (error) {
    console.error('古い通知の整理に失敗:', error);
  }
}
