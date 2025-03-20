import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  UserCredential,
  signInWithRedirect,
  getRedirectResult as firebaseGetRedirectResult,
  sendEmailVerification,
  applyActionCode,
  User  // User を import
} from 'firebase/auth';
import { createOrUpdateUserProfile } from './user';
import { auth } from './config';

// Googleプロバイダーのインスタンス
const googleProvider = new GoogleAuthProvider();

// 管理者のメールアドレスリスト
// 環境変数から取得するのがベストですが、ここでは直接記述します
const ADMIN_EMAILS = [
  'egnm9stasshe@gmail.com',
  'admin@evasio-nova.com',
  // 必要に応じて管理者メールアドレスを追加
];

/**
 * ユーザーが管理者かどうかを判定する
 * @param email ユーザーのメールアドレス
 * @returns 管理者の場合true、それ以外はfalse
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * メールとパスワードでログインする
 * @param email メールアドレス
 * @param password パスワード
 * @returns ユーザー認証情報
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // メール認証が完了していない場合は警告を設定するが、ログインは許可
    if (userCredential.user && !userCredential.user.emailVerified) {
      console.warn('Email not verified');
      // 認証メールを再送信
      await resendVerificationEmail(userCredential.user);
    }
    
    // ログイン時にユーザープロフィールを更新
    await createOrUpdateUserProfile(userCredential.user);
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
    
    // 確認メールを送信
    if (userCredential.user) {
      const actionCodeSettings = {
        url: process.env.NEXT_PUBLIC_APP_URL ? 
          `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${email}` : 
          'http://localhost:3000/login',
        handleCodeInApp: false,
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);
    }
    
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
 * 確認メールを再送信
 */
export async function resendVerificationEmail(user: User): Promise<void> {
  try {
    const actionCodeSettings = {
      url: process.env.NEXT_PUBLIC_APP_URL ? 
        `${process.env.NEXT_PUBLIC_APP_URL}/wiki/user?id=${user.uid}` : // プロフィールページに直接リダイレクト
        'http://localhost:3000/wiki/user?id=' + user.uid,
      handleCodeInApp: false,
    };
    await sendEmailVerification(user, actionCodeSettings);
  } catch (error) {
    console.error('確認メール再送信エラー:', error);
    throw error;
  }
}

/**
 * メール認証を完了する
 * @param code 認証コード
 */
export async function verifyEmail(code: string): Promise<void> {
  try {
    await applyActionCode(auth, code);
  } catch (error) {
    console.error('メール認証エラー:', error);
    throw error;
  }
}

/**
 * Googleでログインする（ポップアップ）
 * @returns ユーザー認証情報
 */
export async function loginWithGoogle(): Promise<UserCredential> {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    
    // ユーザープロフィールをFirestoreに作成/更新
    if (userCredential.user) {
      await createOrUpdateUserProfile(userCredential.user);
    }
    
    return userCredential;
  } catch (error: unknown) {
    console.error('Googleログインエラー:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'auth/unauthorized-domain') {
        console.error('承認が必要なドメイン:', window.location.origin);
        console.error('Firebase Console で以下の設定が必要:');
        console.error('1. Authentication > Settings > Authorized domains:');
        console.error('   - evasio-nova.onrender.com を追加');
        console.error('2. Authentication > Sign-in method > Google:');
        console.error('   - Web SDK configuration の承認済みドメインに');
        console.error('   - evasio-nova.onrender.com を追加');
      }
    }
    
    throw error;
  }
}

/**
 * Googleでログインする（リダイレクト）
 */
export async function loginWithGoogleRedirect(): Promise<void> {
  try {
    // リダイレクトURLを設定
    googleProvider.setCustomParameters({
      redirect_uri: process.env.NEXT_PUBLIC_APP_URL || 'https://evasio-nova.onrender.com'
    });
    
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error('Googleリダイレクトログインエラー:', error);
    throw error;
  }
}

/**
 * リダイレクト認証の結果を処理する
 * ページロード時に一度だけ呼び出す必要がある
 */
export async function getRedirectResult(): Promise<UserCredential | null> {
  try {
    const result = await firebaseGetRedirectResult(auth);
    
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
    const actionCodeSettings = {
      url: process.env.NEXT_PUBLIC_APP_URL ? 
        `${process.env.NEXT_PUBLIC_APP_URL}/login` : 
        'http://localhost:3000/login',
      handleCodeInApp: false
    };
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
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
