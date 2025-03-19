import { ArticleSummary } from '../firebase/wiki';
import { UserProfile } from '../firebase/user';

const DB_NAME = 'evasioWikiCache';
const STORE_NAME = 'articleSummaries';
const USER_STORE_NAME = 'userProfiles';
const CACHE_VERSION = 2;

export class CacheManager {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, CACHE_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
          db.createObjectStore(USER_STORE_NAME, { keyPath: 'uid' });
        }
      };
    });
  }

  async saveArticleSummaries(summaries: ArticleSummary[]): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const requests = summaries.map(summary => store.put(summary));

      Promise.all(requests.map(req => 
        new Promise<void>((resolve, reject) => {
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
      ))
      .then(() => resolve())
      .catch(reject);
    });
  }

  async getArticleSummaries(): Promise<ArticleSummary[]> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(USER_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(USER_STORE_NAME);
      const request = store.put(profile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(USER_STORE_NAME, 'readonly');
      const store = transaction.objectStore(USER_STORE_NAME);
      const request = store.get(uid);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, USER_STORE_NAME], 'readwrite');
      const articleStore = transaction.objectStore(STORE_NAME);
      const userStore = transaction.objectStore(USER_STORE_NAME);
      
      const articleRequest = articleStore.clear();
      const userRequest = userStore.clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// シングルトンインスタンスをエクスポート
export const cacheManager = new CacheManager(); 