import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/config';

const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // ユーザー情報の取得（adminAuthがない場合用の代替手段）
    const userIdHeader = request.headers.get('user-id');
    if (!userIdHeader) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 401 });
    }

    try {
      // 管理者権限チェック
      const userSnapshot = await getDoc(doc(db, 'users', userIdHeader));
      if (!userSnapshot.exists() || userSnapshot.data().email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
      }

      // 処理開始時間
      const startTime = Date.now();

      // キャッシュをクリアするためのフラグをDBに設定
      await setDoc(doc(db, 'info', 'cacheStatus'), {
        clearCache: true,
        timestamp: Date.now(),
        clearedBy: userIdHeader
      }, { merge: true });

      // 処理時間
      const processingTime = (Date.now() - startTime) / 1000;

      return NextResponse.json({
        success: true,
        message: 'キャッシュのクリアを要求しました',
        processingTime: `${processingTime.toFixed(2)}秒`
      });
    } catch (dbError) {
      console.error('データベース更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースの更新に失敗しました。権限を確認してください。' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('キャッシュクリアエラー:', error);
    return NextResponse.json(
      { error: '認証エラーまたは権限エラーが発生しました' },
      { status: 401 }
    );
  }
}
