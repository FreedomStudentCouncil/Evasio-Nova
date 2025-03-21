// ReactMarkdownとRemarkGfmの型宣言
declare module 'react-markdown';
declare module 'remark-gfm';

// SyntaxHighlighterの型宣言
declare module 'react-syntax-highlighter' {
  export const Prism: any;
  export default any;
}

// Prismスタイルの型宣言
declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: any;
  export default any;
}
