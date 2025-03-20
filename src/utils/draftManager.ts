/**
 * Wiki記事の下書き管理用ユーティリティ
 */

// 下書き記事の型定義
export interface DraftArticle {
  title: string;
  content: string;
  description: string;
  tags: string[];
  images: StoredImage[];
  lastModified: number;
}

export interface StoredImage {
  url: string;
  id: string;
  deleteUrl: string;
}

class DraftManager {
  private readonly DB_NAME = 'wikiDrafts';
  private readonly STORE_NAME = 'drafts';
  private readonly VERSION = 1;
  private db: IDBDatabase | null = null;

  /**
   * IndexedDBに接続
   */
  async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      
      request.onerror = () => {
        console.error('IndexedDBの接続に失敗しました', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  /**
   * 下書きを保存
   * @param draft 下書きデータ
   * @param key 保存キー（デフォルトは'current'）
   */
  async saveDraft(draft: DraftArticle, key: string = 'current'): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // lastModifiedを更新
      const updatedDraft = {
        ...draft,
        lastModified: Date.now()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(updatedDraft, key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('下書きの保存に失敗しました', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('下書き保存エラー:', error);
      throw error;
    }
  }

  /**
   * 下書きを取得
   * @param key 取得キー（デフォルトは'current'）
   */
  async getDraft(key: string = 'current'): Promise<DraftArticle | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.error('下書きの取得に失敗しました', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('下書き取得エラー:', error);
      return null;
    }
  }

  /**
   * 下書きを削除
   * @param key 削除キー（デフォルトは'current'）
   */
  async deleteDraft(key: string = 'current'): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('下書きの削除に失敗しました', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('下書き削除エラー:', error);
      throw error;
    }
  }

  /**
   * 下書きが存在するか確認
   * @param key 確認キー（デフォルトは'current'）
   */
  async hasDraft(key: string = 'current'): Promise<boolean> {
    const draft = await this.getDraft(key);
    return draft !== null;
  }
}

// シングルトンインスタンスをエクスポート
export const draftManager = new DraftManager();
