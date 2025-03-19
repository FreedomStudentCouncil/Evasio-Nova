import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// メインデータベース（ユーザー情報、コメントなど）の設定
const mainFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 検索用データベース（記事概要、タグなど）の設定
const searchFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_SEARCH_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_SEARCH_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_SEARCH_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_SEARCH_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SEARCH_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_SEARCH_APP_ID,
};

// メインFirebase初期化
let mainApp: FirebaseApp;
let searchApp: FirebaseApp;

// サーバーサイドレンダリング対応
if (!getApps().length || getApps().length < 2) {
  // メインアプリとDBの初期化
  mainApp = initializeApp(mainFirebaseConfig);
  
  // 検索用アプリとDBの初期化
  // 2つ目のFirebaseアプリには名前を付ける必要があります
  searchApp = initializeApp(searchFirebaseConfig, 'search-app');
} else {
  mainApp = getApps()[0];
  searchApp = getApps()[1];
}

// メインアプリのサービス初期化
const db: Firestore = getFirestore(mainApp);
const storage = getStorage(mainApp); // ストレージ初期化を復元
const auth = getAuth(mainApp);

// 検索用アプリのサービス初期化
let _searchDb: Firestore | null = null;

export function getSearchDb(): Firestore {
  if (!_searchDb) {
    _searchDb = getFirestore(searchApp);
  }
  return _searchDb;
}

const searchDb: Firestore = getSearchDb();

export { mainApp, searchApp, db, searchDb, storage, auth };
