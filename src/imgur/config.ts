// Imgur API設定
export const imgurConfig = {
  clientId: process.env.NEXT_PUBLIC_IMGUR_CLIENT_ID,
  apiUrl: 'https://api.imgur.com/3'
};

// アップロード設定のデフォルト値
export const defaultUploadSettings = {
  album: process.env.NEXT_PUBLIC_IMGUR_ALBUM_ID || undefined,
  title: 'Evasio-Nova Image',
  description: 'Uploaded from Evasio-Nova'
};
