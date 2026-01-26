# Fashion Image Generator - 実装TODO

このファイルは、Fashion Image Generator の実装手順を段階的に示すTODOリストです。

---

## Phase 1: Setup & Dependencies

### 1.1 SDK インストール
- [x] `@google/genai` パッケージをインストール
  ```bash
  npm install @google/genai
  ```

### 1.2 環境変数設定
- [x] プロジェクトルートに `.env` ファイルを作成
  ```env
  VITE_GOOGLE_CLOUD_API_KEY=your_api_key_here
  ```
- [x] Google Cloud Console から API Key を取得
- [x] `.env` ファイルに API Key を設定

### 1.3 .gitignore 更新
- [x] `.gitignore` に環境変数ファイルを追加
  ```
  # Environment variables
  .env
  .env.local
  ```

### 1.4 不要ファイルの削除
- [x] `src/counter.js` を削除
- [x] `src/javascript.svg` を削除

### 1.5 HTML更新
- [x] `index.html` の title を "Fashion Image Generator" に変更

---

## Phase 2: Create New Modules

### 2.1 File Utilities Module
- [x] `src/utils/` ディレクトリを作成
- [x] `src/utils/fileHelpers.js` を作成
- [x] `fileToBase64()` 関数を実装
  - FileReader を使用
  - Promise ベース
  - Data URL プレフィックスを除去
- [x] `getMimeType()` 関数を実装nn
  - file.type を返す

**実装内容**:
```javascript
// Convert File to base64 string (without data URL prefix)
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get MIME type from File object
export function getMimeType(file) {
  return file.type;
}
```

### 2.2 Vertex AI API Module
- [x] `src/api/`ディレクトリを作成
- [x] `src/api/vertexAI.js`を作成
- [x] ~~Google GenAI SDKをインポート~~（後にバックエンドプロキシに変更）
- [x] ~~環境変数からAPI Keyを取得~~（現在はAPI_ENDPOINTを使用）
- [x] `generateFashionImage()`関数を実装（現在はHTTPクライアント）

**注意**: このモジュールは実装中に大幅に変更されました。
- **当初の実装**: Vertex AI SDKを直接使用
- **現在の実装**: バックエンドへのHTTPクライアント
- **詳細**: Phase 6参照

**現在の実装内容**:
```javascript
import { fileToBase64, getMimeType } from '../utils/fileHelpers.js';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api/generate-image';

export async function generateFashionImage(outfitFile, personFile) {
  // HTTPリクエストをバックエンドに送信
  const outfitBase64 = await fileToBase64(outfitFile);
  const personBase64 = await fileToBase64(personFile);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      outfitBase64,
      outfitMimeType: getMimeType(outfitFile),
      personBase64,
      personMimeType: getMimeType(personFile)
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.imageData;
}
```

### 2.3 Image Uploader Component
- [x] `src/components/` ディレクトリを作成
- [x] `src/components/ImageUploader.js` を作成
- [x] `ImageUploader` クラスを実装
  - [x] コンストラクタ（要素ID受け取り、DOM要素取得）
  - [x] `setupEventListeners()` - イベントリスナー登録
    - クリックでファイル入力トリガー
    - ファイル入力の change イベント
    - ドラッグ関連イベント（dragenter, dragover, dragleave, drop）
    - 削除ボタンのクリックイベント
  - [x] `handleDragEnter()` - ドラッグ開始時のスタイル
  - [x] `handleDragOver()` - ドラッグ中のイベント処理
  - [x] `handleDragLeave()` - ドラッグ離脱時のスタイル解除
  - [x] `handleDrop()` - ドロップ処理
  - [x] `handleFileSelect()` - ファイル選択処理
  - [x] `validateFile()` - ファイル検証（タイプ、サイズ）
  - [x] `setFile()` - ファイル設定
  - [x] `showPreview()` - プレビュー表示
  - [x] `clearFile()` - ファイルクリア
  - [x] `getFile()` - ファイル取得

**実装内容**:
```javascript
export class ImageUploader {
  constructor(zoneId, inputId, previewId, placeholderId) {
    this.zone = document.getElementById(zoneId);
    this.input = document.getElementById(inputId);
    this.preview = document.getElementById(previewId);
    this.placeholder = document.getElementById(placeholderId);
    this.file = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.zone.addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', (e) => this.handleFileSelect(e));
    this.zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    this.zone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.zone.addEventListener('drop', (e) => this.handleDrop(e));
    this.preview.querySelector('.remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearFile();
    });
  }

  handleDragEnter(e) {
    e.preventDefault();
    this.zone.classList.add('drag-over');
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.zone.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.zone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.setFile(files[0]);
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.setFile(files[0]);
    }
  }

  validateFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return false;
    }
    return true;
  }

  setFile(file) {
    if (!this.validateFile(file)) return;
    this.file = file;
    this.showPreview(file);
  }

  showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.preview.querySelector('img').src = e.target.result;
      this.placeholder.style.display = 'none';
      this.preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  clearFile() {
    this.file = null;
    this.input.value = '';
    this.placeholder.style.display = 'flex';
    this.preview.style.display = 'none';
    this.preview.querySelector('img').src = '';
  }

  getFile() {
    return this.file;
  }
}
```

---

## Phase 3: Update Main Application

### 3.1 Update src/main.js
- [x] 既存のコードを全て削除
- [x] 必要なモジュールをインポート
  - `./style.css`
  - `ImageUploader` from `./components/ImageUploader.js`
  - `generateFashionImage` from `./api/vertexAI.js`
- [x] UIをレンダリング
  - [x] コンテナとヘッダー
  - [x] 2つのアップロードゾーン（服装 & 人物）
    - プレースホルダー
    - プレビューエリア
    - ファイル入力
    - 削除ボタン
  - [x] 生成ボタン
  - [x] ローディング表示エリア
  - [x] 結果表示エリア
- [x] ImageUploaderインスタンスを初期化
  - 服装用
  - 人物用
- [x] 状態変数を定義
  - `currentImageData`（生成された画像データ）
- [x] 生成ボタンの有効/無効を制御
  - 両画像アップロード時に有効化
  - 500ms間隔でポーリング
- [x] 生成ボタンのクリックイベント
  - 両ファイル取得
  - ローディング表示
  - API呼び出し
  - 結果表示
  - エラーハンドリング
- [x] ダウンロードボタンのクリックイベント
  - Data URL生成
  - `<a>`要素で自動ダウンロード

**実装済み** - バックエンドAPIエンドポイントへのHTTPリクエストを送信

**実装内容**:
```javascript
import './style.css';
import { ImageUploader } from './components/ImageUploader.js';
import { generateFashionImage } from './api/vertexAI.js';

document.querySelector('#app').innerHTML = `
  <div class="container">
    <header>
      <h1>Fashion Image Generator</h1>
      <p>Upload an outfit and a person image to generate professional e-commerce photos</p>
    </header>

    <div class="upload-section">
      <div class="upload-zone" id="outfit-zone">
        <div class="upload-placeholder" id="outfit-placeholder">
          <p>📷</p>
          <p>Drag & drop outfit image<br>or click to browse</p>
          <input type="file" accept="image/*" id="outfit-input" />
        </div>
        <div class="preview" id="outfit-preview" style="display:none;">
          <img alt="Outfit preview" />
          <button class="remove-btn" type="button">×</button>
        </div>
      </div>

      <div class="upload-zone" id="person-zone">
        <div class="upload-placeholder" id="person-placeholder">
          <p>👤</p>
          <p>Drag & drop person image<br>or click to browse</p>
          <input type="file" accept="image/*" id="person-input" />
        </div>
        <div class="preview" id="person-preview" style="display:none;">
          <img alt="Person preview" />
          <button class="remove-btn" type="button">×</button>
        </div>
      </div>
    </div>

    <button id="generate-btn" class="generate-button" disabled>
      Generate Fashion Image
    </button>

    <div id="loading" class="loading" style="display:none;">
      <p>Generating your fashion image... Please wait.</p>
    </div>

    <div id="result-section" class="result-section" style="display:none;">
      <h2>Generated Image</h2>
      <img id="result-image" alt="Generated fashion image" />
      <button id="download-btn" class="download-button" type="button">
        Download Image
      </button>
    </div>
  </div>
`;

const outfitUploader = new ImageUploader('outfit-zone', 'outfit-input', 'outfit-preview', 'outfit-placeholder');
const personUploader = new ImageUploader('person-zone', 'person-input', 'person-preview', 'person-placeholder');

let currentImageData = null;
const generateBtn = document.getElementById('generate-btn');

function checkBothImagesUploaded() {
  if (outfitUploader.getFile() && personUploader.getFile()) {
    generateBtn.disabled = false;
  } else {
    generateBtn.disabled = true;
  }
}

setInterval(checkBothImagesUploaded, 500);

generateBtn.addEventListener('click', async () => {
  const outfitFile = outfitUploader.getFile();
  const personFile = personUploader.getFile();

  if (!outfitFile || !personFile) {
    alert('Please upload both images');
    return;
  }

  generateBtn.disabled = true;
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result-section').style.display = 'none';

  try {
    const imageData = await generateFashionImage(outfitFile, personFile);
    currentImageData = imageData;
    document.getElementById('result-image').src = `data:image/png;base64,${imageData}`;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
  } catch (error) {
    console.error('Generation failed:', error);
    alert('Failed to generate image. Please check console and try again.');
    document.getElementById('loading').style.display = 'none';
  } finally {
    generateBtn.disabled = false;
  }
});

document.getElementById('download-btn').addEventListener('click', () => {
  if (!currentImageData) return;
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${currentImageData}`;
  link.download = `fashion-image-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
```

### 3.2 Update src/style.css
- [x] 既存のスタイルを保持
- [x] 新しいスタイルを追加
  - [x] `.container` - メインコンテナ
  - [x] `header` - ヘッダーセクション
  - [x] `.upload-section` - 2カラムグリッド
  - [x] `.upload-zone` - アップロードエリア
    - 点線ボーダー
    - ホバー効果
    - `.drag-over`状態
  - [x] `.upload-placeholder` - プレースホルダー
  - [x] `.preview` - プレビューエリア
  - [x] `.remove-btn` - 削除ボタン
  - [x] `.generate-button` - 生成ボタン
    - `:disabled`状態
    - `:hover`効果
  - [x] `.loading` - ローディング表示
  - [x] `.result-section` - 結果エリア
  - [x] `.download-button` - ダウンロードボタン
  - [x] レスポンシブ対応（768px以下で1カラム）

**実装済み** - 全スタイル実装完了

**追加するスタイル**:
```css
/* Fashion App Styles */
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

header p {
  color: #888;
  margin-top: 0.5rem;
}

.upload-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

.upload-zone {
  border: 2px dashed #646cff;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 300px;
  position: relative;
}

.upload-zone.drag-over {
  border-color: #535bf2;
  background-color: rgba(100, 108, 255, 0.1);
}

.upload-zone input[type="file"] {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 250px;
}

.upload-placeholder p:first-child {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

.preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}

.remove-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  transition: background 0.3s;
}

.remove-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.generate-button {
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  margin: 2rem 0;
  border-radius: 8px;
  cursor: pointer;
  background-color: #646cff;
  color: white;
  border: none;
  transition: background-color 0.3s;
}

.generate-button:hover:not(:disabled) {
  background-color: #535bf2;
}

.generate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}

.result-section {
  margin-top: 2rem;
  text-align: center;
}

.result-section img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.download-button {
  padding: 0.8rem 2rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  background-color: #646cff;
  color: white;
  border: none;
  transition: background-color 0.3s;
}

.download-button:hover {
  background-color: #535bf2;
}

@media (max-width: 768px) {
  .upload-section {
    grid-template-columns: 1fr;
  }
}
```

### 3.3 Update index.html
- [x] `<title>`を"Fashion Image Generator"に変更

**実装済み** - タイトル変更完了

---

## Phase 4: Testing & Verification

### 4.1 Setup Verification
- [x] `npm install`を実行
- [x] `.env`ファイルが存在することを確認
- [x] ~~API Keyが正しく設定されていることを確認~~（現在はADC認証）
- [x] `npm run dev`でフロントエンド起動
- [x] `npm run dev:server`でバックエンド起動（NEW）
- [x] ブラウザでhttp://localhost:5173にアクセス

### 4.2 Upload Functionality Tests
- [x] 服装画像をドラッグ&ドロップ
- [x] 服装画像をクリックして選択
- [x] 人物画像をドラッグ&ドロップ
- [x] 人物画像をクリックして選択
- [x] 両画像のプレビューが表示される
- [x] ×ボタンで各画像をクリア
- [x] 非画像ファイルをアップロード → アラート表示
- [x] 10MB超のファイルをアップロード → アラート表示

### 4.3 Generation Tests
- [x] 両画像アップロード後、生成ボタンが有効化
- [x] 生成ボタンクリック → ローディング表示
- [x] 生成完了後、画像が表示される
- [x] コンソールにエラーがない

### 4.4 Download Tests
- [x] ダウンロードボタンが結果と共に表示
- [x] ダウンロードボタンクリック → PNGファイルがダウンロード
- [x] ファイル名にタイムスタンプが含まれる

### 4.5 Error Handling Tests
- [x] ~~API Key未設定で実行 → アラート表示~~（現在はADC認証）
- [x] ~~無効なAPI Keyで実行 → エラーメッセージ~~（現在はADC認証）
- [x] バックエンド未起動時 → 接続エラー（NEW）
- [x] ADC未設定時 → 認証エラー（NEW）
- [x] CORSエラー（NEW）
- [x] ネットワークエラー時 → アラート表示

### 4.6 Responsive Tests
- [x] PC表示（2カラム）
- [x] タブレット表示
- [x] モバイル表示（1カラム）

### 4.7 Browser Compatibility Tests
- [x] Chromeで動作確認
- [x] Firefoxで動作確認
- [x] Safariで動作確認
- [x] Edgeで動作確認

### 4.8 Production Build Test
- [ ] `npm run build`を実行
- [ ] `npm run preview`で本番ビルドをテスト
- [ ] 本番モードでも正常に動作することを確認
- [ ] バックエンドを本番モードでデプロイ（TODO）

---

## Phase 5: Documentation & Cleanup

### 5.1 Documentation
- [x] CLAUDE.mdの作成
- [x] TODO.mdの作成（本ファイル）
- [x] API_INVESTIGATION.mdの作成（NEW）
- [x] OAUTH_AUTHENTICATION_SETUP.mdの作成（NEW）
- [ ] README.mdの更新（必要に応じて）

### 5.2 Code Cleanup
- [x] 不要なコメントを削除
- [x] コンソールログをクリーンアップ
- [x] コードフォーマットを統一

### 5.3 Final Checks
- [x] .envが.gitignoreに含まれているか確認
- [x] package.jsonの依存関係が正しいか確認
- [x] すべてのファイルが保存されているか確認

---

## Phase 6: Backend Implementation (COMPLETED)

このフェーズは、OAuth認証エラーを解決するために追加実装されました。
当初の設計にはなかった本番環境対応のバックエンドプロキシパターンです。

### 6.1 Backend Server Setup
- [x] `server/`ディレクトリを作成
- [x] `server/.env`を作成
- [x] express, cors, dotenv, @google-cloud/vertexaiをインストール
- [x] nodemonを開発依存関係に追加

**インストールコマンド**:
```bash
npm install express cors dotenv @google-cloud/vertexai
npm install --save-dev nodemon
```

### 6.2 Server Entry Point (server/index.js)
- [x] Expressアプリケーションの初期化
- [x] CORSミドルウェアの設定
  - [x] 許可オリジンの環境変数設定
  - [x] credentials: true設定
  - [x] methods指定
- [x] Body parserの設定（10MB制限）
- [x] ルーティングの設定
- [x] エラーハンドリングミドルウェア
- [x] ヘルスチェックエンドポイント（`/health`）
- [x] サーバー起動ロジック

### 6.3 Image Generation Route (server/routes/imageGeneration.js)
- [x] Vertex AI SDK初期化
  - [x] プロジェクトID: 環境変数
  - [x] ロケーション: 環境変数
  - [x] ADC認証（自動）
- [x] POST /api/generate-image実装
- [x] リクエストボディ検証
- [x] Vertex AIモデル取得（gemini-2.5-flash-image）
- [x] 生成設定:
  - [x] maxOutputTokens: 32768
  - [x] temperature: 1, topP: 0.95
  - [x] safetySettings: 全OFF
  - [x] responseModalities: ["TEXT","IMAGE"]
  - [x] imageConfig: aspectRatio "1:1", imageSize "1K"
- [x] プロンプト構築
- [x] generateContent()送信
- [x] 画像データ抽出
- [x] JSONレスポンス

### 6.4 Frontend API Client Update (src/api/vertexAI.js)
- [x] Vertex AI SDKインポート削除
- [x] API_ENDPOINT環境変数設定
- [x] HTTPクライアントに書き換え
- [x] fetch() POSTリクエスト実装
- [x] エラーハンドリング更新

### 6.5 Environment Configuration
- [x] ルート.env更新
  - [x] VITE_API_ENDPOINT追加
  - [x] GOOGLE_CLOUD_PROJECT追加
  - [x] GOOGLE_CLOUD_LOCATION追加
- [x] server/.env作成
  - [x] GOOGLE_CLOUD_PROJECT
  - [x] GOOGLE_CLOUD_LOCATION
  - [x] PORT=3001
  - [x] ALLOWED_ORIGINS

### 6.6 package.json Updates
- [x] 依存関係追加
- [x] npm scripts更新
  - [x] "dev:server": "nodemon server/index.js"
  - [x] "server": "node server/index.js"

### 6.7 Google Cloud Authentication Setup
- [x] gcloud CLI確認
- [x] gcloud auth application-default login実行
- [x] gcloud config set project実行
- [x] ADC動作確認

### 6.8 Issues Fixed
- [x] outputMimeTypeパラメーターエラー → 削除
- [x] ストリーミング反復エラー → 非ストリーミングに変更
- [x] OAuth認証エラー → ADC実装
- [x] Model not found → gemini-2.5-flash-imageに変更
- [x] アスペクト比 → 1:1に最適化

### 6.9 Testing & Verification
- [x] バックエンドサーバー起動確認
- [x] ヘルスチェック動作確認
- [x] CORS動作確認
- [x] ADC認証確認
- [x] 画像生成API確認
- [x] 両ターミナル同時実行確認

### 6.10 Documentation
- [x] API_INVESTIGATION.md作成
- [x] OAUTH_AUTHENTICATION_SETUP.md作成

---

## Optional Enhancements (Phase 7)

Phase 6でバックエンド実装が完了したため、オプション機能はPhase 7として扱います。

これらは必須ではありませんが、時間があれば実装を検討してください。

### 6.1 画像圧縮
- [ ] Canvas API を使用してアップロード前に画像を圧縮
- [ ] 圧縮率を設定可能にする

### 6.2 プログレスバー
- [ ] ストリーミング進捗を可視化
- [ ] パーセンテージ表示

### 6.3 複数生成
- [ ] 1回のリクエストで複数スタイルを生成
- [ ] 生成オプション（屋外/屋内など）を選択可能に

### 6.4 履歴機能
- [ ] LocalStorage に生成履歴を保存
- [ ] 過去の生成画像を表示
- [ ] 履歴から再ダウンロード可能に

### 6.5 バックエンド統合
- [ ] Node.js/Express でプロキシサーバー構築
- [ ] API Key をサーバー側で管理
- [ ] CORS 設定

---

## Notes

### 重要な注意事項
- ✅ ~~API Keyはクライアントコードに露出します（プロトタイプのみ許容）~~ → 解決済み（ADC使用）
- ✅ バックエンドプロキシが実装され、ADC認証を使用しています
- ⚠️ 開発時は2つのターミナルが必要です（フロントエンド + バックエンド）
- 💡 Vertex AIのレスポンス構造は変更される可能性があります
- 📦 10MB制限を超える画像は事前に圧縮を検討してください
- 🎨 既存のViteスタイルを維持しながら拡張しています
- 🔐 gcloud CLI認証が必要です: `gcloud auth application-default login`

### デバッグのヒント
- ブラウザのDevToolsコンソールを活用（フロントエンド）
- ターミナルのログを確認（バックエンド）
- ネットワークタブでAPIリクエストを確認
- `http://localhost:3001/health`でバックエンドの状態確認
- `console.log(chunk)`でレスポンス構造を確認

### 開発ワークフロー
1. **ターミナル1**: `npm run dev:server`でバックエンド起動
2. **ターミナル2**: `npm run dev`でフロントエンド起動
3. ブラウザで http://localhost:5173 にアクセス
4. コード変更時:
   - フロントエンド: Viteが自動リロード
   - バックエンド: nodemonが自動再起動

---

**進捗状況**: Phase1-6完了 / Phase7はオプション拡張

**実装完了日**: 2026-01-26

**最終更新日**: 2026-01-26
