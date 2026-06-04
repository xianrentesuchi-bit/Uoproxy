# UoProxy

Web proxy server. Node.js only, no dependencies.

## 起動方法

```bash
node server.js
```

または

```bash
PORT=3000 node server.js
```

デフォルトポート: **8080**

## ファイル構成

```
uoproxy/
├── server.js          # エントリポイント・HTTPサーバー
├── package.json
├── src/
│   ├── codec.js       # URLエンコード/デコード
│   ├── fetcher.js     # HTTPリクエスト処理
│   ├── proxy.js       # プロキシハンドラー
│   ├── rewriter.js    # HTML/CSS/JS書き換え
│   └── static.js      # 静的ファイル配信
└── public/
    ├── index.html     # UI
    ├── css/
    │   └── main.css
    └── js/
        ├── main.js        # フロントエンドロジック
        └── interceptor.js # ページ内インターセプター
```

## 仕組み

1. ユーザーがURLを入力 → base64urlエンコード → `/uop/<encoded>` へ遷移
2. サーバーがデコードしてターゲットサイトをフェッチ
3. レスポンスのHTML/CSS/JS内のURLをすべてプロキシ経由に書き換え
4. `interceptor.js` をページに注入し、動的なfetch/XHR/location変更もプロキシ経由に
