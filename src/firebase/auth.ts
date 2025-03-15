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
      // ログインを強制する
      prompt: 'select_account'
    });
    
    // ドメインチェックを回避するため、ポップアップではなくリダイレクトを使用する場合は以下のコメントを外す
    // import { signInWithRedirect } from 'firebase/auth';
    // return signInWithRedirect(auth, provider);
    
    const userCredential = await signInWithPopup(auth, provider);
    
    // ユーザープロフィールをFirestoreに作成/更新
    if (userCredential.user) {
      await createOrUpdateUserProfile(userCredential.user);
    }
    
    return userCredential;
  } catch (error: any) {
    console.error('Googleログインエラー:', error);
    
    // エラー内容の詳細をログに出力
    if (error.code === 'auth/unauthorized-domain') {
      console.error('未承認ドメインエラー: Firebase Consoleで現在のドメインを承認してください。');
      console.error('現在のオリジン:', window.location.origin);
    }
    
    throw error;
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
