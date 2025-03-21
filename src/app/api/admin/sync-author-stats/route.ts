import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import { synchronizeAllAuthorStats } from '../../../../utils/authorStatsSynchronizer';

const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const userIdHeader = request.headers.get('user-id');
    if (!userIdHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者権限チェック
    const userSnapshot = await getDoc(doc(db, 'users', userIdHeader));
    if (!userSnapshot.exists() || userSnapshot.data().email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // 処理開始時間
    const startTime = Date.now();

    // すべての著者スコアを同期
    const { processed, errors } = await synchronizeAllAuthorStats();
    
    // 処理時間
    const processingTime = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      message: '著者スコアの同期が完了しました',
      processed,
      errors,
      processingTime: `${processingTime.toFixed(2)}秒`
    });
  } catch (error) {
    console.error('著者スコア同期エラー:', error);
    return NextResponse.json(
      { error: '著者スコアの同期中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
