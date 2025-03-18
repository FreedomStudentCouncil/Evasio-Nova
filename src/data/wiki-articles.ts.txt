// 静的サイト生成用のWiki記事データ
export const wikiArticles = [
  {
    id: "no-cookie-youtube",
    title: "No-cookie Youtubeの使い方",
    content: `
# No-cookie Youtubeの使い方

ISGCやInterSafeなどのフィルタリングソフトは、一般的なYoutubeの埋め込みや視聴を制限していますが、no-cookieモードを使用することでこの制限を回避できる場合があります。

## no-cookieとは？

Youtubeのno-cookieモードは、プライバシー強化モードとも呼ばれ、クッキーを使用せずにコンテンツを表示します。教育機関などでプライバシー保護のために提供されている機能です。

## 使用方法

1. 通常のYoutubeリンク: \`https://www.youtube.com/watch?v=VIDEO_ID\`
2. no-cookieリンク: \`https://www.youtube-nocookie.com/watch?v=VIDEO_ID\`

リンクの「youtube.com」を「youtube-nocookie.com」に置き換えるだけです。

## 埋め込みの場合

iframe埋め込みの場合は、srcのURLを以下のように変更します：

\`\`\`html
<!-- 通常のYoutube埋め込み -->
<iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>

<!-- no-cookieモード -->
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
\`\`\`

## 注意点

- すべてのフィルタリングソフトでこの方法が有効とは限りません。
- 学校や組織のポリシーに違反する可能性があるため、適切に使用してください。
- ISGCの最新バージョンでは、youtube-nocookie.comもブロックされることがあります。
    `,
    author: "ProxyMaster",
    date: "2023-05-15",
    usefulCount: 342,
    likeCount: 120,
    tags: ["youtube", "proxy", "isgc", "no-cookie"],
    imageUrl: "https://i.imgur.com/K9XNgIe.jpg", // Imgurの画像URL
  },
  // ここに他の記事データを追加
  {
    id: "youtube-proxys",
    title: "Youtube用プロキシ一覧",
    description: "Youtubeを視聴するための最新プロキシサイト一覧と詳細な使用方法",
    content: `
# Youtube用プロキシ一覧

ここにYoutube用プロキシの詳細なコンテンツが入ります。
    `,
    author: "NetFreedom",
    date: "2023-04-22",
    usefulCount: 289,
    likeCount: 95,
    tags: ["youtube", "proxy", "video", "streaming"]
  },
  // 他の記事データ...
];

// Wiki用のタグ一覧を全記事から抽出
export const allWikiTags = Array.from(new Set(wikiArticles.flatMap(article => article.tags || [])));
