# 🚀 Evasio-Nova

<div align="center">
  <img src="https://via.placeholder.com/800x400?text=Evasio-Nova+Screenshot" alt="Evasio-Nova スクリーンショット" width="800"/>
  
  <p>
    <strong>ネットやデバイス制限環境の中にある諸君に知恵を授けるプラットフォーム</strong>
  </p>

  <p>
    <a href="#デモ">デモを見る</a> •
    <a href="#機能">主な機能</a> •
    <a href="#インストール">インストール手順</a> •
    <a href="#使い方">使い方</a> •
    <a href="#技術スタック">技術スタック</a> •
    <a href="#開発">開発に参加</a>
  </p>

[![Next.js](https://img.shields.io/badge/Next.js-13.0+-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9.0+-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

## 📋 プロジェクト概要

**Evasio-Nova**は、ネット制限やデバイス制限が存在する環境で悩む人々に向けて、実践的な知識と解決策を提供するプラットフォームです。専門家の知識を集約し、あらゆるネット制限の状況に合わせた最適なソリューションを提供することを目指しています。

### 🌟 ビジョン

私たちは、誰もが自由にインターネットにアクセスする権利を持っていると信じています。Evasio-Novaは、不必要に制限された環境から知識へのアクセスを回復するための支援ツールとしての役割を果たします。

## ✨ 機能

### 🔍 クイック診断（evado）

- 制限環境の種類を素早く診断
- ユーザーの状況に最適化された解決策を提案
- 段階的な回避手順の提供

### 📚 Wikiナレッジベース

- 様々な制限環境に対するソリューション集
- 実績ベースの解決法を優先掲載
- コミュニティによる評価システム（「使えた！」「いいね」）

### 🌐 主要コンテンツ

- 学校のISGC制限回避方法
- InterSafeブロック回避テクニック
- 家庭用ペアレンタルコントロール解除法
- ブラウザ拡張機能関連の制限回避策
- 最新プロキシサーバー情報

## 📷 デモ

<div align="center">
  <img src="https://via.placeholder.com/400x250?text=ホーム画面" alt="ホーム画面" width="400"/>
  <img src="https://via.placeholder.com/400x250?text=診断フロー" alt="診断フロー" width="400"/>
  <img src="https://via.placeholder.com/400x250?text=Wiki記事" alt="Wiki記事" width="400"/>
  <img src="https://via.placeholder.com/400x250?text=解決策提案" alt="解決策提案" width="400"/>
</div>

## 🛠️ 技術スタック

- **フロントエンド**:
  - Next.js 16+ (App Router)
  - React 18+
  - TypeScript
  - TailwindCSS
  - Framer Motion（アニメーション）
  - React Icons

- **バックエンド**:
  - Firebase Firestore（データベース）
  - Firebase Authentication（認証）
  - Next.js API Routes

- **インフラ**:
  - Vercel（ホスティング）
  - Firebase（バックエンド）

## 📥 インストール

### 前提条件

- Node.js 16.8.0以上
- npm、yarn、またはpnpm
- Firebaseプロジェクト

### セットアップ手順

1. リポジトリをクローン:

```bash
git clone https://github.com/yourusername/Evasio-Nova.git
cd Evasio-Nova
```

2. 依存関係をインストール:

```bash
npm install
# または
yarn
# または
pnpm install
```

3. 環境変数を設定:

`.env.local`ファイルをプロジェクトルートに作成し、以下の変数を設定:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. 開発サーバーを起動:

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
```

5. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 🚀 使い方

### クイック診断の利用方法

1. トップページから「クイック診断」ボタンをクリック
2. 現在の制限環境に関する質問に答える
3. 診断結果と推奨される解決策を確認
4. 詳細な手順に従って制限を回避

### Wiki記事の閲覧

1. トップページまたはメニューから「Wiki」を選択
2. カテゴリーまたは検索機能で必要な情報を探す
3. 記事ページで詳細な回避方法を確認
4. 「使えた！」「いいね」ボタンでフィードバックを提供

## 📂 プロジェクト構造

```
Evasio-Nova/
├── public/           # 静的ファイル
├── src/              # ソースコード
│   ├── app/          # Next.js Appディレクトリ
│   │   ├── api/      # APIエンドポイント
│   │   ├── evado/    # 診断システム
│   │   ├── wiki/     # Wiki記事関連
│   │   └── page.tsx  # ホームページ
│   ├── components/   # Reactコンポーネント
│   ├── firebase/     # Firebase設定
│   ├── hooks/        # カスタムReactフック
│   ├── lib/          # ユーティリティ関数
│   ├── styles/       # グローバルスタイル
│   └── types/        # TypeScript型定義
├── .env.local        # 環境変数（gitignore対象）
├── next.config.js    # Next.js設定
├── package.json      # 依存関係
├── tailwind.config.js # TailwindCSS設定
└── tsconfig.json     # TypeScript設定
```

## 👥 開発に参加

貢献は大歓迎です！以下の方法で参加できます：

1. イシューを作成（バグ報告、機能リクエスト）
2. プルリクエストの送信
3. Wiki記事の追加・編集
4. フィードバックの提供

開発に参加する前に[CONTRIBUTING.md](./CONTRIBUTING.md)をご覧ください。

## 📄 ライセンス

このプロジェクトは [MIT ライセンス](./LICENSE) のもとで公開されています。

## 🙏 謝辞

- すべての貢献者とコミュニティメンバー
- [Next.js](https://nextjs.org/) チームと [Vercel](https://vercel.com/) 
- I LOVE Render.com!!
- [Firebase](https://firebase.google.com/) チーム
- その他のオープンソースプロジェクトと開発者たち

---

<div align="center">
  <p>🌟 Evasio-Nova - 自由なインターネットアクセスのために 🌟</p>
  <p>
    <a href="https://twitter.com/evasio_nova">Twitter</a> •
    <a href="https://discord.gg/evasio-nova">Discord</a> •
    <a href="mailto:contact@evasio-nova.example.com">お問い合わせ</a>
  </p>
</div>
