# Fashion Image Generator - プロジェクト仕様書

## プロジェクト概要

### 目的
服装画像と人物画像を組み合わせて、プロフェッショナルなEコマース用ファッション写真を生成するWebアプリケーション。Google Cloud の Vertex AI (Gemini 3 Pro Image Preview) を活用した画像生成技術を使用する。

### 使用技術
- **フロントエンド**: Vite + Vanilla JavaScript (ES Modules)
- **バックエンド**: Express.js (Node.js)
- **AI/ML**: Google Cloud Vertex AI - Gemini 2.5 Flash Image
- **SDK**: `@google-cloud/vertexai`（バックエンド）, `@google/genai`（レガシー参照）
- **認証**: Application Default Credentials (ADC) / OAuth2
- **スタイリング**: CSS3（ダーク/ライトモード対応）

---

## 機能要件

### コア機能
1. **画像アップロード**
   - 服装画像（1枚目）のアップロード
   - 人物画像（2枚目）のアップロード
   - ドラッグ&ドロップ対応
   - ファイル選択ボタン対応
   - 画像プレビュー表示
   - アップロード削除機能

2. **画像生成**
   - Vertex AI を使用した画像合成
   - ストリーミングレスポンス対応
   - ローディング状態表示
   - エラーハンドリング

3. **画像ダウンロード**
   - 生成された画像の表示
   - ダウンロードボタン
   - タイムスタンプ付きファイル名

### 技術仕様

#### 画像アップロード制限
- **対応フォーマット**: JPEG, PNG, GIF, WebP など画像形式全般
- **最大ファイルサイズ**: 10MB
- **検証**: クライアント側でファイルタイプとサイズをチェック

#### API統合
- **アーキテクチャ**: バックエンドプロキシパターン
- **モデル**: `gemini-2.5-flash-image`
- **認証**: Application Default Credentials (ADC)
- **リクエスト形式**:
  - フロントエンド → Express.jsバックエンド（HTTP POST）
  - バックエンド → Vertex AI（gRPC/REST）
  - プロンプトテキスト + 服装画像（Base64） + 人物画像（Base64）
- **レスポンス形式**: PNG画像（Base64エンコード）

#### セキュリティ
✅ **本番環境対応**: この実装は本番環境で使用可能なセキュリティ設計です。
- **バックエンドプロキシ**: Express.jsサーバーでAPI呼び出しを中継
- **ADC認証**: Application Default Credentialsによる安全な認証
- **CORS設定**: 許可されたオリジンのみアクセス可能
- **APIキーの非露出**: クライアントコードに認証情報が含まれない
- **レート制限**: バックエンド側で実装可能
- `.env`ファイルを`.gitignore`に追加

---

## ユーザーインターフェース

### レイアウト構成

```
┌─────────────────────────────────────────┐
│        Fashion Image Generator          │
│   Upload outfit and person images...    │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   📷         │  │   👤         │   │
│  │ Outfit Image │  │ Person Image │   │
│  │ (Drag&Drop)  │  │ (Drag&Drop)  │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │   Generate Fashion Image        │  │
│  └─────────────────────────────────┘  │
│                                         │
│         [Loading state...]             │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │   Generated Image               │  │
│  │   [Download Button]             │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### UI/UXの特徴
- **2カラムアップロードゾーン**: 服装と人物画像を横並びで配置
- **ドラッグ&ドロップ**: 視覚的フィードバック付き
- **プレビュー機能**: アップロード後すぐに画像を確認
- **削除ボタン**: 各画像に×ボタンでクリア可能
- **レスポンシブデザイン**: モバイルでは縦並び表示
- **ダーク/ライトモード**: システム設定に自動対応

---

## アーキテクチャ

### ディレクトリ構造

```
image_generation_demo_vertexAI_web/
├── .env                              # 環境変数（フロントエンド）
├── .gitignore                        # Git除外設定
├── index.html                        # HTMLエントリーポイント
├── package.json                      # 依存関係管理
├── CLAUDE.md                         # プロジェクト仕様書（本ファイル）
├── TODO.md                           # 実装計画書
├── API_INVESTIGATION.md              # API調査レポート
├── OAUTH_AUTHENTICATION_SETUP.md     # OAuth認証設定ガイド
├── public/                           # 静的アセット
│   └── vite.svg
├── server/                           # バックエンドサーバー
│   ├── .env                          # サーバー環境変数
│   ├── index.js                      # Expressサーバーエントリーポイント
│   └── routes/
│       └── imageGeneration.js        # 画像生成APIルート
└── src/                              # フロントエンドソースコード
    ├── main.js                       # アプリケーションエントリーポイント
    ├── style.css                     # グローバルスタイル
    ├── api/
    │   ├── vertexAI.js               # バックエンドAPIクライアント
    │   └── vertexAICode.js           # レガシーコード参照
    ├── components/
    │   └── ImageUploader.js          # 画像アップロードコンポーネント
    └── utils/
        └── fileHelpers.js            # ファイル変換ユーティリティ
```

### モジュール設計

#### 0. `server/index.js` - Expressサーバー
**責務**:
- Expressアプリケーションの初期化
- CORSミドルウェアの設定
- Body parser設定（10MB制限）
- ルーティング設定
- エラーハンドリング
- ヘルスチェックエンドポイント

**主要設定**:
- ポート: 3001（デフォルト）
- CORS: http://localhost:5173（開発時）
- ボディサイズ制限: 10MB

**エンドポイント**:
- `POST /api/generate-image` - 画像生成
- `GET /health` - ヘルスチェック

#### 1. `server/routes/imageGeneration.js` - 画像生成API
**責務**:
- Vertex AI SDKの初期化（ADC認証）
- 画像生成リクエストの処理
- Base64画像の検証
- Vertex AIへのリクエスト送信
- レスポンスからの画像データ抽出
- エラーハンドリング

**主要関数**:
```javascript
router.post('/', async (req, res))
```

**フロー**:
1. リクエストボディからBase64画像を取得
2. 画像の存在を検証
3. Vertex AIモデルを初期化（gemini-2.5-flash-image）
4. プロンプトと画像でリクエスト構築
5. Vertex AIに送信（非ストリーミング）
6. レスポンスから画像データを抽出
7. JSONレスポンスで返す

#### 2. `src/main.js` - メインアプリケーション
**責務**:
- UI レンダリング
- ImageUploader インスタンスの初期化
- イベントハンドラの設定
- 状態管理（生成画像データ）
- ローディング状態の制御

**主要ロジック**:
```javascript
// UI レンダリング → ImageUploader 初期化 → イベント登録
// Generate ボタン: 両画像取得 → API呼び出し → 結果表示
// Download ボタン: Base64 → Data URL → ダウンロード
```

#### 3. `src/api/vertexAI.js` - バックエンドAPIクライアント
**責務**:
- バックエンドAPIへのHTTPリクエスト
- File → Base64変換
- エラーハンドリング

**主要関数**:
```javascript
export async function generateFashionImage(outfitFile, personFile)
```

**フロー**:
1. APIエンドポイントチェック
2. File → Base64変換
3. HTTP POSTリクエスト送信
4. レスポンスのエラーチェック
5. 画像データを返す

**注意**: このモジュールは以前Vertex AI SDKを直接使用していましたが、
現在はバックエンドプロキシへのHTTPクライアントとして機能します。

#### 4. `src/components/ImageUploader.js` - アップロードコンポーネント
**責務**:
- ドラッグ&ドロップ処理
- ファイル選択処理
- ファイル検証（タイプ、サイズ）
- プレビュー表示
- 削除機能

**主要メソッド**:
```javascript
constructor(zoneId, inputId, previewId, placeholderId)
setupEventListeners()     // イベントリスナー登録
handleDrop(e)             // ドロップ処理
handleFileSelect(e)       // ファイル選択処理
validateFile(file)        // ファイル検証
setFile(file)             // ファイル設定
showPreview(file)         // プレビュー表示
clearFile()               // クリア
getFile()                 // ファイル取得
```

#### 5. `src/utils/fileHelpers.js` - ファイルユーティリティ
**責務**:
- File オブジェクトを Base64 に変換
- MIME タイプ取得

**主要関数**:
```javascript
export async function fileToBase64(file)  // Promise<string>
export function getMimeType(file)         // string
```

---

## データフロー

### 画像アップロードフロー
```
ユーザー操作（ドラッグ or クリック）
  ↓
ImageUploader.handleDrop() / handleFileSelect()
  ↓
validateFile() - ファイル検証
  ↓
setFile() - File オブジェクト保存
  ↓
showPreview() - FileReader で Data URL 生成
  ↓
プレビュー表示 & Generateボタン有効化チェック
```

### 画像生成フロー
```
Generateボタン クリック（Frontend）
  ↓
両方のFileオブジェクト取得
  ↓
ローディング表示開始
  ↓
generateFashionImage(outfit, person)（src/api/vertexAI.js）
  ├─ fileToBase64(outfit) → Base64文字列
  ├─ fileToBase64(person) → Base64文字列
  ├─ HTTP POST to http://localhost:3001/api/generate-image
  └─ Request Body: { outfitBase64, outfitMimeType, personBase64, personMimeType }
  ↓
Expressサーバー（server/index.js）
  ├─ CORSチェック
  ├─ Body parser（10MB制限チェック）
  └─ Route to /api/generate-image
  ↓
画像生成ルート（server/routes/imageGeneration.js）
  ├─ Vertex AI初期化（ADC認証）
  ├─ Model: gemini-2.5-flash-image
  ├─ リクエスト構築（プロンプト + 2画像）
  ├─ generationConfig設定
  │   ├─ responseModalities: ["TEXT", "IMAGE"]
  │   ├─ imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
  │   └─ safetySettings: OFF（全カテゴリ）
  ├─ Vertex AIに送信（model.generateContent）
  └─ レスポンスから画像データ抽出
  ↓
Response { imageData: "base64..." } → Frontend
  ↓
Data URL生成して<img>に設定
  ↓
ローディング非表示 & 結果セクション表示
```

### ダウンロードフロー
```
Downloadボタン クリック
  ↓
Base64データから Data URL 生成
  ↓
<a> 要素を動的作成
  ↓
download 属性にタイムスタンプ付きファイル名設定
  ↓
プログラムでクリックイベント発火
  ↓
ブラウザのダウンロード機能でファイル保存
```

---

## 環境設定

### 必要な環境
- **Node.js**: v16以上推奨
- **npm**: v7以上
- **ブラウザ**: モダンブラウザ（Chrome, Firefox, Safari, Edge 最新版）

### セットアップ手順

#### 1. 依存関係のインストール
```bash
# ルートディレクトリで実行
npm install
```

これにより以下がインストールされます:

**フロントエンド**:
- `vite`: 開発サーバー & ビルドツール

**バックエンド**:
- `@google-cloud/vertexai`: Google Vertex AI SDK
- `express`: Webサーバーフレームワーク
- `cors`: CORSミドルウェア
- `dotenv`: 環境変数管理
- `nodemon`: 開発時の自動再起動

**レガシー**:
- `@google/genai`: 参照用（現在は未使用）

#### 2. 環境変数の設定

**2つの`.env`ファイルが必要です:**

**A. ルート`.env`（フロントエンド用）**:
```env
# バックエンドAPIエンドポイント
VITE_API_ENDPOINT=http://localhost:3001/api/generate-image

# Google Cloud設定（バックエンドと共有）
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

**B. `server/.env`（バックエンド用）**:
```env
# Google Cloud設定
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# サーバー設定
PORT=3001
NODE_ENV=development

# CORS設定
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

⚠️ **Google Cloud認証の設定**:
このアプリケーションはApplication Default Credentials（ADC）を使用します。
以下のいずれかの方法で認証を設定してください:

**方法1: gcloud CLIでログイン（開発環境推奨）**
```bash
gcloud auth application-default login
gcloud config set project your-project-id
```

**方法2: サービスアカウントキー（本番環境推奨）**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

詳細は`OAUTH_AUTHENTICATION_SETUP.md`を参照してください。

#### 3. 開発サーバーの起動

**2つのターミナルが必要です:**

**ターミナル1: バックエンドサーバー**
```bash
npm run dev:server
# または nodemon でのホットリロード
# nodemon server/index.js
```

**ターミナル2: フロントエンド開発サーバー**
```bash
npm run dev
```

**アクセス**:
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3001
- ヘルスチェック: http://localhost:3001/health

#### 4. 本番ビルド
```bash
npm run build    # dist/ フォルダにビルド
npm run preview  # ビルド結果をプレビュー
```

---

## Vertex AI 設定詳細

### モデル設定

**バックエンド（`server/routes/imageGeneration.js`）で設定:**

```javascript
const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    maxOutputTokens: 32768,        // 最大トークン数
    temperature: 1,                 // ランダム性（0-2）
    topP: 0.95,                     // サンプリング閾値
  },
  safetySettings: [                // 全カテゴリOFF（開発用）
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
  ]
});

// リクエスト時の設定
const request = {
  contents: [...],
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE'],  // テキスト+画像レスポンス
    imageConfig: {
      aspectRatio: '1:1',           // 正方形（1024x1024推奨）
      imageSize: '1K'               // 1K = 1024px
      // 注意: outputMimeType は非対応（削除済み）
    }
  }
};
```

**変更履歴**:
- ✅ `outputMimeType`パラメーターーを削除（非対応のため）
- ✅ `aspectRatio`を"16:9" → "1:1"に変更（ファッション画像に最適）
- ✅ モデルを`gemini-3-pro-image-preview` → `gemini-2.5-flash-image`に更新

### プロンプト
```
Create professional e-commerce fashion photos.
Place the outfit from the first image onto the model in the second image.
Generate realistic full-body shots of the model wearing the outfit,
adjusting lighting and shadows to match an outdoor environment.
```

---

## エラーハンドリング

### ファイル検証エラー
- **非画像ファイル**: `alert('Please upload an image file')`
- **サイズ超過**: `alert('File size must be less than 10MB')`

### API エラー
- **バックエンド接続失敗**: `alert('Failed to generate image. Please check console and try again.')`
- **認証エラー**: ADC認証失敗 → サーバーログに出力
- **Vertex AIエラー**: バックエンドが詳細なエラーログを出力
- **画像データなし**: `Error: No image data received from Vertex AI`
- **CORSエラー**: 許可されていないオリジンからのアクセス

### コンソールログ
すべてのエラーは `console.error()` でコンソールに出力され、デバッグを容易にします。

---

## 制限事項と注意点

### 現在の制限
1. **API Key のセキュリティ**: クライアント側で露出（プロトタイプのみ許容）
2. **エラーハンドリング**: 最小限（alert とコンソールログのみ）
3. **画像処理**: クライアント側で Base64 変換（大きい画像だとメモリ消費大）
4. **状態管理**: シンプルな変数管理（フレームワークなし）
5. **複数生成**: 履歴管理なし（最新の1枚のみ保持）

### 本番環境への移行時の推奨事項
1. **バックエンドプロキシの実装**
   - Node.js/Express などで API リクエストを中継
   - API Key をサーバー側で管理
   - CORS 設定

2. **画像最適化**
   - アップロード前にクライアント側で画像圧縮
   - Canvas API で リサイズ

3. **エラーハンドリングの強化**
   - Toast 通知システム
   - リトライロジック
   - タイムアウト処理

4. **UX 改善**
   - 生成履歴の保存（LocalStorage or DB）
   - 複数画像の一括生成
   - プログレスバー

5. **セキュリティ強化**
   - レート制限
   - ユーザー認証
   - API Key のローテーション

---

## 開発ワークフロー

### Git ワークフロー
```bash
# .env は .gitignore に含まれるため、コミットされない
git add .
git commit -m "Add fashion image generator"
git push
```

### デバッグ方法
1. **ブラウザのコンソール**: F12 → Console タブ
2. **ネットワークタブ**: API リクエストの確認
3. **console.log()**: 必要に応じて追加

### トラブルシューティング

#### 問題: 生成ボタンが無効のまま
- **原因**: 両方の画像がアップロードされていない
- **解決**: 両方の画像をアップロード

#### 問題: バックエンドに接続できない
- **原因**: バックエンドサーバーが起動していない
- **解決**: `npm run dev:server`でバックエンドを起動

#### 問題: ADC認証エラー
- **原因**: Google Cloud認証が設定されていない
- **解決**: `gcloud auth application-default login`を実行

#### 問題: CORSエラー
- **原因**: フロントエンドのオリジンが許可リストにない
- **解決**: `server/.env`の`ALLOWED_ORIGINS`を確認

#### 問題: ドラッグ&ドロップが動作しない
- **原因**: イベントリスナーが正しく登録されていない
- **解決**: ブラウザのコンソールでエラーを確認

#### 問題: 画像サイズエラー
- **原因**: 10MBを超える画像をアップロード
- **解決**: 画像を圧縮するか、`server/index.js`の`limit`を増やす

#### 問題: 画像が生成されない
- **原因**: Vertex AIのレスポンス構造が変更された可能性、またはバックエンドエラー
- **解決**: バックエンドのコンソールログを確認、データ抽出ロジックを調整

---

## テスト計画

### 手動テスト項目

#### 機能テスト
- [ ] 服装画像をドラッグ&ドロップでアップロード
- [ ] 服装画像をクリックして選択
- [ ] 人物画像をドラッグ&ドロップでアップロード
- [ ] 人物画像をクリックして選択
- [ ] 両方の画像のプレビューが表示される
- [ ] × ボタンで画像をクリア
- [ ] 両画像アップロード後、生成ボタンが有効化
- [ ] 生成ボタンクリックでローディング表示
- [ ] 生成された画像が表示される
- [ ] ダウンロードボタンで画像を保存

#### エラーテスト
- [ ] PDFファイルをアップロード → エラーメッセージ
- [ ] 10MB超のファイルをアップロード → エラーメッセージ
- [ ] API Key なしで実行 → エラーメッセージ
- [ ] 無効な API Key で実行 → エラーメッセージ

#### レスポンシブテスト
- [ ] PC表示（2カラム）
- [ ] タブレット表示
- [ ] モバイル表示（1カラム）

#### ブラウザテスト
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## パフォーマンス考慮事項

### 最適化ポイント
1. **画像プレビュー**: `FileReader.readAsDataURL()` で効率的に表示
2. **Base64 変換**: 生成時のみ実行（アップロード時ではない）
3. **ストリーミングレスポンス**: チャンク単位で処理し、メモリ効率を向上
4. **イベントリスナー**: 一度だけ登録、重複を避ける

### メモリ管理
- 大きな Base64 文字列は変数に保持
- 不要になった画像データは適宜クリア
- Object URLs は `URL.revokeObjectURL()` で解放（必要に応じて）

---

## 今後の拡張案

### 短期的な改善
1. **画像圧縮**: 10MB以下でも圧縮して API コストを削減
2. **プログレスバー**: ストリーミング進捗の可視化
3. **プレビューの改善**: サムネイル表示とフルサイズ表示の切り替え

### 中期的な改善
1. **複数スタイル生成**: 1回のリクエストで複数の画像を生成
2. **履歴機能**: LocalStorage で過去の生成画像を保存
3. **編集機能**: 生成後に明るさ調整などの簡易編集

### 長期的な改善
1. **バックエンド統合**: Node.js/Express でプロキシサーバー構築
2. **ユーザー認証**: Firebase Auth などで認証機能追加
3. **データベース**: 生成履歴をクラウドに保存
4. **商用展開**: サブスクリプションモデル、API制限管理

---

## ライセンスと著作権

### 使用ライブラリ
- **Vite**: MIT License
- **@google/genai**: Google の利用規約に準拠

### プロジェクト
このプロジェクトはプロトタイプ/デモ用途です。商用利用する場合は、Google Cloud の利用規約と料金体系を確認してください。

---

## サポートとリソース

### 公式ドキュメント
- [Vite Documentation](https://vite.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Google Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Vertex AI Node.js SDK](https://cloud.google.com/nodejs/docs/reference/aiplatform/latest)

### プロジェクト内ドキュメント
- `CLAUDE.md`: プロジェクト仕様書（本ファイル）
- `TODO.md`: 実装タスク一覧
- `API_INVESTIGATION.md`: API調査レポート（トラブルシューティング記録）
- `OAUTH_AUTHENTICATION_SETUP.md`: OAuth/ADC認証設定ガイド

### トラブルシューティング
問題が発生した場合:
1. ブラウザのコンソールでエラーを確認（フロントエンド）
2. ターミナルのログを確認（バックエンド）
3. `http://localhost:3001/health`でバックエンドの状態確認
4. `.env`ファイルの環境変数を確認
5. ADC認証を確認: `gcloud auth application-default login`
6. `npm install`を再実行
7. ブラウザのキャッシュをクリア

---

## バージョン履歴

### v1.0.0 (Production-Ready Backend) - 2026-01-26
- ✅ Express.jsバックエンドプロキシの実装
- ✅ Application Default Credentials（ADC）認証
- ✅ @google-cloud/vertexai SDKへの移行
- ✅ gemini-2.5-flash-imageモデルの使用
- ✅ outputMimeTypeパラメーターエラーの修正
- ✅ ストリーミングレスポンス処理の修正
- ✅ 1:1アスペクト比への最適化
- ✅ CORSセキュリティの実装
- ✅ OAuth認証エラーの解決

### v0.0.0 (Initial Prototype) - 2026-01-26（初期設計）
- 基本的な画像アップロード機能
- Vertex AI統合（クライアント側）
- 画像生成とダウンロード機能
- ドラッグ&ドロップ対応
- レスポンシブデザイン

---

## 貢献者

このプロジェクトは Claude Code (Sonnet 4.5) との協働で設計・実装されました。

---

**最終更新日**: 2026-01-26
