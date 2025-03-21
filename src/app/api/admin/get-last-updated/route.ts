import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db, searchDb } from '../../../../firebase/config';

const ADMIN_EMAIL = "egnm9stasshe@gmail.com";

export async function GET(request: NextRequest) {
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

    // 各データの最終更新時刻を取得
    const [articlesDoc, trophiesDoc, otherDoc] = await Promise.all([
      getDoc(doc(searchDb, 'system', 'lastUpdated')),
      getDoc(doc(searchDb, 'system', 'trophiesLastUpdated')),
      getDoc(doc(searchDb, 'system', 'otherLastUpdated'))
    ]);

    const lastUpdated = {
      articles: articlesDoc.exists() 
        ? new Date(articlesDoc.data().timestamp).toLocaleString('ja-JP') 
        : '未計算',
      trophies: trophiesDoc.exists() 
        ? new Date(trophiesDoc.data().timestamp).toLocaleString('ja-JP') 
        : '未計算',
      other: otherDoc.exists() 
        ? new Date(otherDoc.data().timestamp).toLocaleString('ja-JP') 
        : '未計算'
    };

    return NextResponse.json({ 
      lastUpdated,
      success: true 
    });
  } catch (error) {
    console.error('最終更新時刻取得エラー:', error);
    return NextResponse.json(
      { error: '最終更新時刻の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
