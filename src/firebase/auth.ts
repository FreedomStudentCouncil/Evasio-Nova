import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User,
  UserCredential
} from 'firebase/auth';
import { createOrUpdateUserProfile } from './user';

// authインスタンスを取得
const auth = getAuth();

/**
 * メールとパスワードでログインする
 * @param email メールアドレス
 * @param password パスワード
 * @returns ユーザー認証情報
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // ログイン時にユーザープロフィールを更新
    if (userCredential.user) {
      await createOrUpdateUserProfile(userCredential.user);
    }
    return userCredential;
  } catch (error) {
    console.error('メールログインエラー:', error);
    throw error;
  }
}

/**
 * メールとパスワードで新規登録する
 * @param email メールアドレス
 * @param password パスワード
 * @param displayName 表示名（任意）
 * @returns ユーザー認証情報
 */
export async function registerWithEmail(
  email: string, 
  password: string, 
  displayName?: string
): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 表示名を設定
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // ユーザープロフィールをFirestoreに作成
    if (userCredential.user) {
      await createOrUpdateUserProfile(userCredential.user);
    }
    
    return userCredential;
  } catch (error) {
    console.error('メール登録エラー:', error);
    throw error;
  }
}

/**
 * Googleでログインする
 * @returns ユーザー認証情報
 */
export async function loginWithGoogle(): Promise<UserCredential> {
  try {
    const provider = new GoogleAuthProvider();
    
    // カスタムパラメータの設定
    provider.setCustomParameters({
      // アカウント選択を常に表示
      prompt: 'select_account',
      // 承認済みドメイン設定
      hosted_domain: 'evodsia-nova.onrender.com'
    });
    
    // 本番環境ではリダイレクトを使用（ポップアップはブロックされることがある）
    if (process.env.NODE_ENV === 'production') {
      // リダイレクト認証をインポート
      const { signInWithRedirect } = await import('firebase/auth');
      // リダイレクト認証を開始
      await signInWithRedirect(auth, provider);
      // リダイレクト後に戻ってくるため、ここには到達しない
      throw new Error('リダイレクト後のコードが実行されています');
    } else {
      // 開発環境ではポップアップを使用
      const userCredential = await signInWithPopup(auth, provider);
      
      // ユーザープロフィールをFirestoreに作成/更新
      if (userCredential.user) {
        await createOrUpdateUserProfile(userCredential.user);
      }
      
      return userCredential;
    }
  } catch (error: any) {
    console.error('Googleログインエラー:', error);
    
    // エラー内容の詳細をログに出力
    if (error.code === 'auth/unauthorized-domain') {
      console.error('未承認ドメインエラー: Firebase Consoleで現在のドメインを承認してください。');
      console.error('承認が必要なドメイン:', window.location.origin);
      console.error('対応方法: Firebase Console > Authentication > Settings > Authorized domains に以下を追加:');
      console.error('- localhost');
      console.error('- evodsia-nova.onrender.com');
    }
    
    throw error;
  }
}

/**
 * リダイレクト認証の結果を処理する
 * ページロード時に一度だけ呼び出す必要がある
 */
export async function getRedirectResult(): Promise<UserCredential | null> {
  try {
    const { getRedirectResult: getFirebaseRedirectResult } = await import('firebase/auth');
    const result = await getFirebaseRedirectResult(auth);
    
    if (result && result.user) {
      await createOrUpdateUserProfile(result.user);
    }
    
    return result;
  } catch (error) {
    console.error('リダイレクト結果の取得エラー:', error);
    return null;
  }
}

/**
 * ログアウトする
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
}

/**
 * パスワードリセットメールを送信する
 * @param email メールアドレス
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('パスワードリセットエラー:', error);
    throw error;
  }
}

/**
 * 現在のユーザープロフィールを更新する
 * @param displayName 表示名
 * @param photoURL プロフィール画像URL
 */
export async function updateUserProfile(
  displayName?: string | null,
  photoURL?: string | null
): Promise<void> {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('ユーザーがログインしていません');
  }
  
  try {
    const updateData: { displayName?: string | null; photoURL?: string | null } = {};
    
    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    
    await updateProfile(currentUser, updateData);
    
    // Firestoreのユーザープロファイルも更新
    await createOrUpdateUserProfile(currentUser);
  } catch (error) {
    console.error('プロフィール更新エラー:', error);
    throw error;
  }
}

export { auth };
