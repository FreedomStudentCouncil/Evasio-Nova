"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logout, getRedirectResult, isAdmin } from '../firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean; // 管理者かどうかのフラグを追加
  isEmailVerified: boolean; // 追加
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>; // 追加: IDトークンを取得するメソッド
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false); // 管理者状態を追加
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // リダイレクト認証結果の処理とユーザー状態監視
  useEffect(() => {
    const processRedirectAndSetupAuth = async () => {
      try {
        // リダイレクト結果を確認（Google認証リダイレクト後）
        await getRedirectResult();
      } catch (error) {
        console.error("リダイレクト認証エラー:", error);
      }

      // 認証状態変更リスナーを設定
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        // メールアドレスベースで管理者判定
        const adminEmail = "egnm9stasshe@gmail.com"; // 指定の管理者メールアドレス
        setIsUserAdmin(currentUser?.email === adminEmail);
        setIsEmailVerified(currentUser?.emailVerified ?? false); // 追加
        setLoading(false);
      });

      return unsubscribe;
    };

    processRedirectAndSetupAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Googleログインエラー:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  };

  // IDトークンを取得するメソッドを追加
  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('トークン取得エラー:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    isAdmin: isUserAdmin, // 管理者フラグを提供
    isEmailVerified, // 追加
    signInWithGoogle,
    signOut,
    getIdToken // 追加したメソッドを公開
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
