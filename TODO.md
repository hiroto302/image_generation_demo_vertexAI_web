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
- [ ] `src/utils/` ディレクトリを作成
- [ ] `src/utils/fileHelpers.js` を作成
- [ ] `fileToBase64()` 関数を実装
  - FileReader を使用
  - Promise ベース
  - Data URL プレフィックスを除去
- [ ] `getMimeType()` 関数を実装
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
- [ ] `src/api/` ディレクトリを作成
- [ ] `src/api/vertexAI.js` を作成
- [ ] Google GenAI SDK をインポート
- [ ] 環境変数から API Key を取得
- [ ] `generateFashionImage()` 関数を実装
  - API Key チェック
  - GoogleGenAI 初期化
  - generationConfig 設定
  - File → Base64 変換
  - メッセージ構築
  - ストリーミングリクエスト送信
  - レスポンスから画像データ抽出
  - エラーハンドリング

**実装内容**:
```javascript
import { GoogleGenAI } from '@google/genai';
import { fileToBase64, getMimeType } from '../utils/fileHelpers.js';

const API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;

export async function generateFashionImage(outfitFile, personFile) {
  // WARNING: API key is exposed in client code. Use backend proxy for production.
  if (!API_KEY) {
    throw new Error('API key not configured');
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = 'gemini-3-pro-image-preview';

  const generationConfig = {
    maxOutputTokens: 32768,
    temperature: 1,
    topP: 0.95,
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "1:1",
      imageSize: "1K",
      outputMimeType: "image/png",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
    ],
  };

  const outfitBase64 = await fileToBase64(outfitFile);
  const personBase64 = await fileToBase64(personFile);

  const message = [
    { text: `Create professional e-commerce fashion photos. Place the outfit from the first image onto the model in the second image. Generate realistic full-body shots of the model wearing the outfit, adjusting lighting and shadows to match an outdoor environment.` },
    { inlineData: { mimeType: getMimeType(outfitFile), data: outfitBase64 } },
    { inlineData: { mimeType: getMimeType(personFile), data: personBase64 } }
  ];

  const chat = ai.chats.create({ model, config: generationConfig });
  const response = await chat.sendMessageStream({ message });

  let imageData = null;
  for await (const chunk of response.stream) {
    if (chunk.candidates?.[0]?.content?.parts) {
      for (const part of chunk.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
        }
      }
    }
  }

  if (!imageData) {
    throw new Error('No image data received from API');
  }

  return imageData;
}
```

### 2.3 Image Uploader Component
- [ ] `src/components/` ディレクトリを作成
- [ ] `src/components/ImageUploader.js` を作成
- [ ] `ImageUploader` クラスを実装
  - [ ] コンストラクタ（要素ID受け取り、DOM要素取得）
  - [ ] `setupEventListeners()` - イベントリスナー登録
    - クリックでファイル入力トリガー
    - ファイル入力の change イベント
    - ドラッグ関連イベント（dragenter, dragover, dragleave, drop）
    - 削除ボタンのクリックイベント
  - [ ] `handleDragEnter()` - ドラッグ開始時のスタイル
  - [ ] `handleDragOver()` - ドラッグ中のイベント処理
  - [ ] `handleDragLeave()` - ドラッグ離脱時のスタイル解除
  - [ ] `handleDrop()` - ドロップ処理
  - [ ] `handleFileSelect()` - ファイル選択処理
  - [ ] `validateFile()` - ファイル検証（タイプ、サイズ）
  - [ ] `setFile()` - ファイル設定
  - [ ] `showPreview()` - プレビュー表示
  - [ ] `clearFile()` - ファイルクリア
  - [ ] `getFile()` - ファイル取得

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
- [ ] 既存のコードを全て削除
- [ ] 必要なモジュールをインポート
  - `./style.css`
  - `ImageUploader` from `./components/ImageUploader.js`
  - `generateFashionImage` from `./api/vertexAI.js`
- [ ] UI をレンダリング
  - [ ] コンテナとヘッダー
  - [ ] 2つのアップロードゾーン（服装 & 人物）
    - プレースホルダー
    - プレビューエリア
    - ファイル入力
    - 削除ボタン
  - [ ] 生成ボタン
  - [ ] ローディング表示エリア
  - [ ] 結果表示エリア
- [ ] ImageUploader インスタンスを初期化
  - 服装用
  - 人物用
- [ ] 状態変数を定義
  - `currentImageData` (生成された画像データ)
- [ ] 生成ボタンの有効/無効を制御
  - 両画像アップロード時に有効化
  - 500ms 間隔でポーリング
- [ ] 生成ボタンのクリックイベント
  - 両ファイル取得
  - ローディング表示
  - API 呼び出し
  - 結果表示
  - エラーハンドリング
- [ ] ダウンロードボタンのクリックイベント
  - Data URL 生成
  - `<a>` 要素で自動ダウンロード

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
- [ ] 既存のスタイルを保持
- [ ] 新しいスタイルを追加
  - [ ] `.container` - メインコンテナ
  - [ ] `header` - ヘッダーセクション
  - [ ] `.upload-section` - 2カラムグリッド
  - [ ] `.upload-zone` - アップロードエリア
    - 点線ボーダー
    - ホバー効果
    - `.drag-over` 状態
  - [ ] `.upload-placeholder` - プレースホルダー
  - [ ] `.preview` - プレビューエリア
  - [ ] `.remove-btn` - 削除ボタン
  - [ ] `.generate-button` - 生成ボタン
    - `:disabled` 状態
    - `:hover` 効果
  - [ ] `.loading` - ローディング表示
  - [ ] `.result-section` - 結果エリア
  - [ ] `.download-button` - ダウンロードボタン
  - [ ] レスポンシブ対応（768px以下で1カラム）

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
- [ ] `<title>` を "Fashion Image Generator" に変更

---

## Phase 4: Testing & Verification

### 4.1 Setup Verification
- [ ] `npm install` を実行
- [ ] `.env` ファイルが存在することを確認
- [ ] API Key が正しく設定されていることを確認
- [ ] `npm run dev` で開発サーバーを起動
- [ ] ブラウザで http://localhost:5173 にアクセス

### 4.2 Upload Functionality Tests
- [ ] 服装画像をドラッグ&ドロップ
- [ ] 服装画像をクリックして選択
- [ ] 人物画像をドラッグ&ドロップ
- [ ] 人物画像をクリックして選択
- [ ] 両画像のプレビューが表示される
- [ ] × ボタンで各画像をクリア
- [ ] 非画像ファイルをアップロード → アラート表示
- [ ] 10MB超のファイルをアップロード → アラート表示

### 4.3 Generation Tests
- [ ] 両画像アップロード後、生成ボタンが有効化
- [ ] 生成ボタンクリック → ローディング表示
- [ ] 生成完了後、画像が表示される
- [ ] コンソールにエラーがない

### 4.4 Download Tests
- [ ] ダウンロードボタンが結果と共に表示
- [ ] ダウンロードボタンクリック → PNG ファイルがダウンロード
- [ ] ファイル名にタイムスタンプが含まれる

### 4.5 Error Handling Tests
- [ ] API Key 未設定で実行 → アラート表示
- [ ] 無効な API Key で実行 → エラーメッセージ
- [ ] ネットワークエラー時 → アラート表示

### 4.6 Responsive Tests
- [ ] PC 表示（2カラム）
- [ ] タブレット表示
- [ ] モバイル表示（1カラム）

### 4.7 Browser Compatibility Tests
- [ ] Chrome で動作確認
- [ ] Firefox で動作確認
- [ ] Safari で動作確認
- [ ] Edge で動作確認

### 4.8 Production Build Test
- [ ] `npm run build` を実行
- [ ] `npm run preview` で本番ビルドをテスト
- [ ] 本番モードでも正常に動作することを確認

---

## Phase 5: Documentation & Cleanup

### 5.1 Documentation
- [x] CLAUDE.md の作成（完了）
- [x] TODO.md の作成（本ファイル）
- [ ] README.md の更新（必要に応じて）

### 5.2 Code Cleanup
- [ ] 不要なコメントを削除
- [ ] コンソールログをクリーンアップ
- [ ] コードフォーマットを統一

### 5.3 Final Checks
- [ ] .env が .gitignore に含まれているか確認
- [ ] package.json の依存関係が正しいか確認
- [ ] すべてのファイルが保存されているか確認

---

## Optional Enhancements (Phase 6)

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
- ⚠️ API Key はクライアントコードに露出します（プロトタイプのみ許容）
- 💡 Vertex AI のレスポンス構造が変更される可能性があります
- 📦 10MB 制限を超える画像は事前に圧縮を検討してください
- 🎨 既存の Vite スタイルを維持しながら拡張します

### デバッグのヒント
- ブラウザの DevTools コンソールを活用
- ネットワークタブで API リクエストを確認
- `console.log(chunk)` でレスポンス構造を確認

---

**進捗状況**: 0/45 タスク完了

**最終更新日**: 2026-01-26
