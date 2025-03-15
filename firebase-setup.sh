#!/bin/bash

# Firebase CLIがインストールされているか確認
if ! command -v firebase &> /dev/null; then
  echo "Firebase CLIをインストールしています..."
  npm install -g firebase-tools
fi

# ログイン
echo "Firebaseにログインしてください..."
firebase login

# 承認ドメインを追加
echo "承認ドメインを追加しています..."
firebase auth:domain:add evodsia-nova.onrender.com
firebase auth:domain:add localhost

echo "セットアップ完了！"
echo "注意: Firebase Consoleでも以下を確認してください:"
echo "https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/settings"
echo "- Authorized domainsに 'evodsia-nova.onrender.com' と 'localhost' が含まれていること"
echo "- 'OAuth redirect domains' に 'evodsia-nova.onrender.com' が含まれていること"
