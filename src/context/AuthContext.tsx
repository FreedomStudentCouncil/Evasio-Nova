"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logout as firebaseLogout, getRedirectResult } from '../firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      await firebaseLogout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut
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
