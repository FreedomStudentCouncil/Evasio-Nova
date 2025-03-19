import { ArticleSummary } from '../firebase/wiki';
import { UserProfile } from '../firebase/user';

const DB_NAME = 'evasioWikiCache';
const STORE_NAME = 'articleSummaries';
const USER_STORE_NAME = 'userProfiles';
const COUNTS_STORE_NAME = 'articleCounts'; // 新しいストア名を追加
const CACHE_VERSION = 3; // バージョン更新

// カウントデータの型定義
export interface ArticleCounts {
  id: string; // ドキュメントID (常に "article")
  counts: {
    [articleId: string]: {
      likeCount: number;
      usefulCount: number;
    }
  };
  lastUpdated: number; // タイムスタンプ（ミリ秒）
}

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
        if (!db.objectStoreNames.contains(COUNTS_STORE_NAME)) {
          db.createObjectStore(COUNTS_STORE_NAME, { keyPath: 'id' });
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

  // 記事カウント情報を保存
  async saveArticleCounts(counts: ArticleCounts): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(COUNTS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(COUNTS_STORE_NAME);
      
      // lastUpdatedを現在時刻で更新
      const updatedCounts = {
        ...counts,
        lastUpdated: Date.now()
      };
      
      const request = store.put(updatedCounts);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 記事カウント情報を取得
  async getArticleCounts(): Promise<ArticleCounts | null> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(COUNTS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(COUNTS_STORE_NAME);
      const request = store.get('article'); // 固定ID

      request.onsuccess = () => {
        const result = request.result as ArticleCounts | undefined;
        
        // キャッシュが存在し、有効期限内かチェック（12時間 = 12 * 60 * 60 * 1000ミリ秒）
        if (result && this.isCountCacheValid(result)) {
          resolve(result);
        } else {
          resolve(null); // キャッシュなしまたは期限切れ
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 特定の記事のカウント情報を更新
  async updateArticleCount(articleId: string, likeCount: number, usefulCount: number): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    try {
      // 現在のカウント情報を取得
      let counts = await this.getArticleCounts();
      
      if (!counts) {
        // 新規作成
        counts = {
          id: 'article',
          counts: {},
          lastUpdated: Date.now()
        };
      }
      
      // 特定の記事のカウントを更新
      counts.counts[articleId] = {
        likeCount,
        usefulCount
      };
      
      // 保存
      await this.saveArticleCounts(counts);
    } catch (error) {
      console.error('記事カウントの更新に失敗:', error);
      throw error;
    }
  }

  // キャッシュの有効性を確認（12時間以内）
  private isCountCacheValid(counts: ArticleCounts): boolean {
    const now = Date.now();
    const cacheAge = now - counts.lastUpdated;
    const maxCacheAge = 12 * 60 * 60 * 1000; // 12時間（ミリ秒）
    
    return cacheAge < maxCacheAge;
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, USER_STORE_NAME, COUNTS_STORE_NAME], 'readwrite');
      const articleStore = transaction.objectStore(STORE_NAME);
      const userStore = transaction.objectStore(USER_STORE_NAME);
      const countsStore = transaction.objectStore(COUNTS_STORE_NAME);
      
      const articleRequest = articleStore.clear();
      const userRequest = userStore.clear();
      const countsRequest = countsStore.clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// シングルトンインスタンスをエクスポート
export const cacheManager = new CacheManager();