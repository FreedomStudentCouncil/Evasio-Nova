import { ArticleSummary } from '../firebase/wiki';
import { UserProfile } from '../firebase/user';

const DB_NAME = 'evasioWikiCache';
const STORE_NAME = 'articleSummaries';
const USER_STORE_NAME = 'userProfiles';
const COUNTS_STORE_NAME = 'articleCounts'; // 新しいストア名を追加
const CACHE_VERSION = 3; // バージョン更新

// カスタム有効期限の設定を追加
const CACHE_EXPIRY = {
  ARTICLE_SUMMARIES: 4 * 60 * 60 * 1000,  // 4時間（ミリ秒）
  ARTICLE_COUNTS: 12 * 60 * 60 * 1000     // 12時間（ミリ秒）
};

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
      
      // タイムスタンプを追加
      const summariesWithTimestamp = summaries.map(summary => ({
        ...summary,
        lastUpdated: Date.now()
      }));
      
      const requests = summariesWithTimestamp.map(summary => store.put(summary));

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

      request.onsuccess = () => {
        const summaries = request.result;
        if (summaries && summaries.length > 0 && 
            this.isArticleSummariesValid(summaries[0].lastUpdated)) {
          resolve(summaries);
        } else {
          resolve([]);  // キャッシュが無効な場合は空配列を返す
        }
      };
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

  /**
   * 特定の記事のカウント情報を更新
   * @param articleId 記事ID
   * @param likeCount いいね数
   * @param usefulCount 役に立った数
   * @param articleScore 記事スコア（オプション）
   * @returns 更新が完了したPromise
   */
  async updateArticleCount(
    articleId: string, 
    likeCount: number, 
    usefulCount: number,
    articleScore?: number
  ): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('データベースの初期化に失敗しました');

    try {
      // countsコレクションの更新
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
      
      // カウントを保存
      await this.saveArticleCounts(counts);
      
      // 記事概要のキャッシュも更新（articleScoreも含む）
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(articleId);
      
      getReq.onsuccess = () => {
        const summary = getReq.result;
        if (summary) {
          summary.likeCount = likeCount;
          summary.usefulCount = usefulCount;
          if (articleScore !== undefined) {
            summary.articleScore = articleScore;
          }
          store.put(summary);
        }
      };
      
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('記事カウントの更新に失敗:', error);
      throw error;
    }
  }

  // キャッシュの有効性を確認
  private isCountCacheValid(counts: ArticleCounts): boolean {
    const now = Date.now();
    const cacheAge = now - counts.lastUpdated;
    return cacheAge < CACHE_EXPIRY.ARTICLE_COUNTS;
  }

  // 記事概要キャッシュの有効性を確認（4時間以内）
  private isArticleSummariesValid(timestamp: number): boolean {
    const now = Date.now();
    const cacheAge = now - timestamp;
    return cacheAge < CACHE_EXPIRY.ARTICLE_SUMMARIES;
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

/**
 * キャッシュ管理ユーティリティ
 */

// キャッシュ保存期間（ミリ秒）
const CACHE_DURATION = 60 * 1000; // 1分間

// キャッシュデータの型定義
interface CacheItem<T> {
  value: T;
  timestamp: number;
}

// キャッシュストア
const cacheStore: {
  [key: string]: CacheItem<any>;
} = {};

/**
 * キャッシュにデータを保存
 * @param key キャッシュキー
 * @param value 保存する値
 */
export function setCache<T>(key: string, value: T): void {
  cacheStore[key] = {
    value,
    timestamp: Date.now()
  };
}

/**
 * キャッシュからデータを取得
 * @param key キャッシュキー
 * @returns キャッシュされた値（有効期限切れまたは未キャッシュの場合はnull）
 */
export function getCache<T>(key: string): T | null {
  const item = cacheStore[key];
  
  // キャッシュが存在しない場合はnull
  if (!item) return null;
  
  // 有効期限切れの場合はキャッシュを削除してnull
  const now = Date.now();
  if (now - item.timestamp > CACHE_DURATION) {
    deleteCache(key);
    return null;
  }
  
  return item.value as T;
}

/**
 * キャッシュを削除
 * @param key キャッシュキー
 */
export function deleteCache(key: string): void {
  delete cacheStore[key];
}

/**
 * 特定のパターンに一致するキャッシュをすべて削除
 * @param pattern キャッシュキーのパターン（前方一致）
 */
export function clearCacheByPattern(pattern: string): void {
  Object.keys(cacheStore).forEach(key => {
    if (key.startsWith(pattern)) {
      deleteCache(key);
    }
  });
}

/**
 * すべてのキャッシュを削除
 */
export function clearAllCache(): void {
  Object.keys(cacheStore).forEach(key => {
    deleteCache(key);
  });
}

/**
 * キャッシュ対応の関数を生成する高階関数
 * @param fn 元の関数
 * @param keyPrefix キャッシュキーのプレフィックス
 * @returns キャッシュ対応の新しい関数
 */
export function withCache<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  keyPrefix: string
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    // 引数を使ってキャッシュキーを生成
    const key = `${keyPrefix}:${JSON.stringify(args)}`;
    
    // キャッシュからデータを取得
    const cachedData = getCache<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }
    
    // キャッシュにない場合は関数を実行
    const result = await fn(...args);
    
    // 結果をキャッシュに保存
    setCache(key, result);
    
    return result;
  };
}