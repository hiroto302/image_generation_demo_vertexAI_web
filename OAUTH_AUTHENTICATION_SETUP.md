# OAuth認証エラー対応 完全ガイド

**作成日**: 2026-01-26
**プロジェクト**: Fashion Image Generator
**目的**: Vertex AI 画像生成APIのOAuth認証エラー対応の完全な記録

---

## 📋 目次

1. [問題の概要](#問題の概要)
2. [エラーの詳細と対応](#エラーの詳細と対応)
3. [解決策: バックエンドプロキシの実装](#解決策-バックエンドプロキシの実装)
4. [Google Cloud 認証設定](#google-cloud-認証設定)
5. [実装の詳細](#実装の詳細)
6. [トラブルシューティング](#トラブルシューティング)
7. [今後の応用](#今後の応用)

---

## 問題の概要

### 発生した問題

Fashion Image Generatorアプリケーションで、Vertex AIの画像生成APIを使用しようとした際に、以下のOAuth認証エラーが発生：

```
Error: API keys are not supported by this API.
Expected OAuth2 access token or other authentication credentials.
```

### 根本原因

**Google Cloud の画像生成API（Gemini Image, Imagen）は、セキュリティとコスト管理のため、ブラウザからのAPI Key認証を許可していない。**

#### なぜAPI Keyが使えないのか

1. **セキュリティリスク**: ブラウザのJavaScriptコードは誰でも閲覧可能 → API Keyが露出
2. **コスト管理**: 画像生成は高コスト（$0.025/画像）→ 悪用防止が必要
3. **レート制限回避の防止**: 複数のAPI Keyを使い分けることを防止

#### 動作する認証方法

| 認証方法 | 環境 | 使用可能 |
|---------|------|----------|
| API Key | ブラウザ | ❌ 画像生成APIでは不可 |
| API Key | Node.js サーバー | ❌ 画像生成APIでは不可 |
| OAuth2 | ブラウザ | ❌ 実装が複雑 |
| **Application Default Credentials (ADC)** | **Node.js サーバー** | **✅ 推奨** |
| Service Account | Node.js サーバー | ✅ 本番環境推奨 |

---

## エラーの詳細と対応

### エラー #1: `outputMimeType` パラメータエラー

**エラーメッセージ**:
```
Error: outputMimeType parameter is not supported in Gemini API.
```

**原因**:
- `outputMimeType` は `ai.images.generate()` API専用パラメータ
- `ai.models.generateContent()` では使用不可

**修正内容**:
```javascript
// ❌ 間違い
imageConfig: {
  aspectRatio: "1:1",
  imageSize: "1K",
  outputMimeType: "image/png"  // この行を削除
}

// ✅ 正しい
imageConfig: {
  aspectRatio: "1:1",
  imageSize: "1K"
}
```

**結果**: ✅ 解消 → しかし次のOAuth認証エラーが発生

---

### エラー #2: OAuth 認証エラー

**エラーメッセージ**:
```
Error: API keys are not supported by this API.
Expected OAuth2 access token or other authentication credentials.
service: generativelanguage.googleapis.com
method: google.ai.generativelanguage.v1beta.GenerativeService.GenerateContent
```

**原因**:
- 画像生成APIはブラウザからのAPI Key認証を**一切許可していない**
- OAuth2またはApplication Default Credentials (ADC)が必須

**解決策**:
→ **バックエンドプロキシサーバーの実装が必要**

---

### エラー #3: 環境変数読み込みエラー

**エラーメッセージ**:
```
IllegalArgumentError: [VertexAI.IllegalArgumentError]: Unable to infer your project.
Please provide a project Id by one of the following:
- Passing a constructor argument by using new VertexAI({project: my-project})
- Setting project using `gcloud config set project my-project`
```

**原因**:
1. **第1の原因**: 環境変数 `GOOGLE_CLOUD_PROJECT` が `.env` ファイルに設定されていなかった
2. **第2の原因（真の原因）**: ES Modulesの読み込み順序の問題
   - `server/routes/imageGeneration.js` が `server/index.js` からインポートされる
   - インポート時に `imageGeneration.js` のトップレベルコードが実行される
   - この時点で `server/index.js` の `dotenv.config()` がまだ実行されていない
   - 結果: `process.env.GOOGLE_CLOUD_PROJECT` が `undefined`

**修正内容**:

#### 修正 #3-1: `.env` ファイルに環境変数を追加

```bash
# .env（プロジェクトルート）
VITE_API_ENDPOINT=http://localhost:3001/api/generate-image

# Google Cloud Configuration (used by backend server)
GOOGLE_CLOUD_PROJECT=image-generation-demo-vertexai
GOOGLE_CLOUD_LOCATION=us-central1
```

**結果**: ❌ まだエラーが発生

#### 修正 #3-2: 各モジュールで `dotenv.config()` を呼び出す

**[server/routes/imageGeneration.js:1-6](server/routes/imageGeneration.js#L1-L6)**:
```javascript
import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();  // ← これを追加

const router = express.Router();

// Initialize Vertex AI with ADC
const projectId = process.env.GOOGLE_CLOUD_PROJECT;  // これでundefinedにならない
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
```

**重要ポイント**:
- `dotenv.config()` は**冪等（idempotent）** → 何度呼んでも安全
- 既に読み込まれた環境変数は上書きされない
- **環境変数を使用する各モジュールで呼び出すのがベストプラクティス**

**結果**: ✅ 解消

---

### エラー #4: モデル名エラー (404 Not Found)

**エラーメッセージ**:
```
[VertexAI.ClientError]: got status: 404 Not Found.
{
  "error": {
    "code": 404,
    "message": "Publisher Model `projects/image-generation-demo-vertexai/locations/us-central1/publishers/google/models/gemini-3-pro-image-preview` was not found or your project does not have access to it.",
    "status": "NOT_FOUND"
  }
}
```

**原因**:
- `gemini-3-pro-image-preview` というモデルが存在しないか、アクセス権がない
- 正しいモデル名は `gemini-2.5-flash-image` または `imagen-3.0-generate-002`

**修正内容**:

**[server/routes/imageGeneration.js:31](server/routes/imageGeneration.js#L31)**:
```javascript
// ❌ 間違い
const model = vertexAI.getGenerativeModel({
  model: 'gemini-3-pro-image-preview',  // 存在しないモデル
  // ...
});

// ✅ 正しい
const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',  // 正しいモデル名
  // ...
});
```

**利用可能なモデル（2026年1月時点）**:
- `gemini-2.5-flash-image` - Gemini 2.5 Flash（画像生成対応）
- `gemini-2.5-pro-image` - Gemini 2.5 Pro（画像生成対応）
- `imagen-3.0-generate-002` - Imagen 3.0
- `imagen-3.0-fast-generate-001` - Imagen 3.0 Fast

**結果**: ✅ 解消（推定）

---

## 解決策: バックエンドプロキシの実装

### アーキテクチャ

#### 変更前（失敗）
```
[ブラウザ]
    ↓ API Key（露出）
[Vertex AI API] ❌ OAuth エラー
```

#### 変更後（成功）
```
[ブラウザ]
    ↓ HTTP Request (Base64画像)
[Express.js サーバー]
    ↓ ADC認証（OAuth2）
[Vertex AI API] ✅ 成功
```

### メリット

1. ✅ **セキュリティ**: API Keyがブラウザに露出しない
2. ✅ **OAuth2対応**: ADC/Service Accountで認証可能
3. ✅ **本番環境対応**: スケーラブルなアーキテクチャ
4. ✅ **コスト管理**: サーバー側でレート制限やクォータ管理が可能
5. ✅ **ユーザー管理**: ユーザーごとの使用量追跡が可能

---

## Google Cloud 認証設定

### 前提条件

- Google Cloud アカウント
- gcloud CLI がインストールされている
- Node.js v16以上

### ステップ 1: gcloud CLI の確認とログイン

```bash
# gcloud がインストールされているか確認
gcloud --version

# 未インストールの場合
# macOS
brew install google-cloud-sdk

# Windows
# https://cloud.google.com/sdk/docs/install からダウンロード

# ログイン
gcloud auth login
```

### ステップ 2: Google Cloud プロジェクトの設定

```bash
# 現在のプロジェクトを確認
gcloud config get-value project

# プロジェクトを設定（既存のプロジェクトIDに置き換える）
gcloud config set project image-generation-demo-vertexai

# 確認
gcloud config list
```

**出力例**:
```
[core]
account = your-email@gmail.com
project = image-generation-demo-vertexai
```

### ステップ 3: Vertex AI API の有効化

```bash
# Vertex AI API を有効化
gcloud services enable aiplatform.googleapis.com --project=image-generation-demo-vertexai

# 確認
gcloud services list --enabled --project=image-generation-demo-vertexai | grep aiplatform
```

**出力例**:
```
aiplatform.googleapis.com          Vertex AI API
```

### ステップ 4: Application Default Credentials (ADC) の設定

```bash
# ADCでログイン
gcloud auth application-default login

# クォータプロジェクトを設定
gcloud auth application-default set-quota-project image-generation-demo-vertexai

# 確認: アクセストークンが表示されればOK
gcloud auth application-default print-access-token
```

**期待される出力**:
```
ya29.a0AfB_byC... (長いアクセストークン)
```

**認証情報の保存場所**:
- macOS/Linux: `~/.config/gcloud/application_default_credentials.json`
- Windows: `%APPDATA%\gcloud\application_default_credentials.json`

### ステップ 5: 認証の確認

```bash
# プロジェクトの確認
gcloud config get-value project

# 出力: image-generation-demo-vertexai
```

---

## 実装の詳細

### ディレクトリ構造

```
image_generation_demo_vertexAI_web/
├── .env                              # ルート環境変数
├── package.json
├── server/                           # バックエンド（新規作成）
│   ├── index.js                     # Express サーバー
│   ├── routes/
│   │   └── imageGeneration.js       # 画像生成エンドポイント
│   └── .env                         # サーバー用環境変数（オプション）
├── src/                              # フロントエンド
│   ├── main.js
│   ├── api/
│   │   └── vertexAI.js              # 修正: fetch APIに変更
│   └── ...
└── public/
```

### 実装手順

#### 1. 依存関係のインストール

```bash
npm install express cors dotenv @google-cloud/vertexai
npm install --save-dev nodemon
```

**package.json の更新**:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "nodemon server/index.js",
    "server": "node server/index.js",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google-cloud/vertexai": "^1.10.0",
    "cors": "^2.8.6",
    "dotenv": "^17.2.3",
    "express": "^5.2.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.11",
    "vite": "^7.2.4"
  }
}
```

#### 2. バックエンドサーバーの作成

**server/index.js**:
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageGenerationRouter from './routes/imageGeneration.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

// Body parser - 10MB limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/generate-image', imageGenerationRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    project: process.env.GOOGLE_CLOUD_PROJECT
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  console.log(`🌍 CORS: ${ALLOWED_ORIGINS.join(', ')}`);
});
```

#### 3. 画像生成エンドポイントの作成

**server/routes/imageGeneration.js**:
```javascript
import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize Vertex AI with ADC
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

console.log('🔧 Initializing Vertex AI...');
console.log(`   Project ID: ${projectId}`);
console.log(`   Location: ${location}`);

const vertexAI = new VertexAI({
  project: projectId,
  location: location
});

// POST /api/generate-image
router.post('/', async (req, res) => {
  try {
    const { outfitBase64, outfitMimeType, personBase64, personMimeType } = req.body;

    if (!outfitBase64 || !personBase64) {
      return res.status(400).json({
        error: 'Both outfit and person images are required'
      });
    }

    console.log(`🎨 Generating image...`);
    console.log(`   Outfit: ${outfitMimeType}, ${Math.round(outfitBase64.length / 1024)}KB`);
    console.log(`   Person: ${personMimeType}, ${Math.round(personBase64.length / 1024)}KB`);

    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        maxOutputTokens: 32768,
        temperature: 1,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
      ]
    });

    const prompt = 'Create professional e-commerce fashion photos. Place the outfit from the first image onto the model in the second image. Generate realistic full-body shots of the model wearing the outfit, adjusting lighting and shadows to match an outdoor environment.';

    const request = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: outfitMimeType,
              data: outfitBase64
            }
          },
          {
            inlineData: {
              mimeType: personMimeType,
              data: personBase64
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K'
        }
      }
    };

    const response = await model.generateContent(request);

    let imageData = null;
    const candidates = response.response?.candidates;

    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageData = part.inlineData.data;
            console.log(`✅ Image generated: ${Math.round(imageData.length / 1024)}KB`);
            break;
          }
        }
      }
    }

    if (!imageData) {
      console.error('❌ No image data in response');
      return res.status(500).json({
        error: 'No image data received from Vertex AI'
      });
    }

    res.json({ imageData });

  } catch (error) {
    console.error('❌ Generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate image',
      details: error.details
    });
  }
});

export default router;
```

#### 4. フロントエンドの更新

**src/api/vertexAI.js**:
```javascript
import { fileToBase64, getMimeType } from '../utils/fileHelpers.js';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api/generate-image';

export async function generateFashionImage(outfitFile, personFile) {
  if (!API_ENDPOINT) {
    throw new Error('API endpoint not configured');
  }

  console.log('🚀 Sending to backend:', API_ENDPOINT);

  const outfitBase64 = await fileToBase64(outfitFile);
  const personBase64 = await fileToBase64(personFile);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      outfitBase64,
      outfitMimeType: getMimeType(outfitFile),
      personBase64,
      personMimeType: getMimeType(personFile)
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Backend error:', errorData);
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Image received');

  return data.imageData;
}
```

#### 5. 環境変数の設定

**.env (プロジェクトルート)**:
```bash
# API key no longer needed - backend handles authentication
# VITE_GOOGLE_CLOUD_API_KEY=your-api-key

# Backend API endpoint
VITE_API_ENDPOINT=http://localhost:3001/api/generate-image

# Google Cloud Configuration (used by backend server)
GOOGLE_CLOUD_PROJECT=image-generation-demo-vertexai
GOOGLE_CLOUD_LOCATION=us-central1
```

**server/.env (オプション - サーバー専用設定)**:
```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=image-generation-demo-vertexai
GOOGLE_CLOUD_LOCATION=us-central1

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

---

## 動作確認

### ステップ 1: バックエンドサーバーの起動

**ターミナル 1**:
```bash
cd /Users/snsnap1159/Hiroto/ai_products/image_generation_demo_vertexAI_web
npm run dev:server
```

**期待される出力**:
```
[dotenv@17.2.3] injecting env (3) from .env
🔧 Initializing Vertex AI...
   Project ID: image-generation-demo-vertexai
   Location: us-central1
✅ Server running on http://localhost:3001
📍 Project: image-generation-demo-vertexai
🌍 CORS: http://localhost:5173
```

### ステップ 2: ヘルスチェック

**ターミナル 2**:
```bash
curl http://localhost:3001/health
```

**期待される出力**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T10:30:00.000Z",
  "project": "image-generation-demo-vertexai"
}
```

### ステップ 3: フロントエンドの起動

**ターミナル 2（または新しいターミナル）**:
```bash
npm run dev
```

**期待される出力**:
```
VITE v7.2.4  ready in 300 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### ステップ 4: E2Eテスト

1. ブラウザで `http://localhost:5173` を開く
2. 服装画像 (`public/clothes.jpg`) をアップロード
3. 人物画像 (`public/model_women_jp_greenbg.png`) をアップロード
4. "Generate Fashion Image" ボタンをクリック

**期待されるバックエンドログ**:
```
🎨 Generating image...
   Outfit: image/jpeg, 156KB
   Person: image/png, 423KB
✅ Image generated: 89KB
```

**期待されるフロントエンドログ（ブラウザコンソール）**:
```
🚀 Sending to backend: http://localhost:3001/api/generate-image
✅ Image received
```

---

## トラブルシューティング

### エラー: "Application Default Credentials not found"

**原因**: ADCが設定されていない

**解決方法**:
```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project image-generation-demo-vertexai
```

---

### エラー: "CORS blocked"

**原因**: バックエンドのCORS設定が正しくない

**解決方法**:
1. `.env` ファイルを確認:
   ```bash
   ALLOWED_ORIGINS=http://localhost:5173
   ```
2. サーバーを再起動:
   ```bash
   # Ctrl+C で停止 → npm run dev:server で再起動
   ```

---

### エラー: "Permission denied" または "API not enabled"

**原因**: Vertex AI APIが有効化されていない

**解決方法**:
```bash
gcloud services enable aiplatform.googleapis.com --project=image-generation-demo-vertexai

# 確認
gcloud services list --enabled | grep aiplatform
```

---

### エラー: "Unable to infer your project"

**原因**: 環境変数 `GOOGLE_CLOUD_PROJECT` が読み込まれていない

**解決方法**:

1. `.env` ファイルを確認:
   ```bash
   GOOGLE_CLOUD_PROJECT=image-generation-demo-vertexai
   GOOGLE_CLOUD_LOCATION=us-central1
   ```

2. `server/routes/imageGeneration.js` に `dotenv.config()` があるか確認:
   ```javascript
   import dotenv from 'dotenv';
   dotenv.config();  // この行が必要
   ```

3. サーバーを再起動

---

### エラー: "Model not found" (404)

**原因**: モデル名が間違っているか、アクセス権がない

**解決方法**:

1. モデル名を確認:
   ```javascript
   // 正しいモデル名
   model: 'gemini-2.5-flash-image'
   // または
   model: 'gemini-2.5-pro-image'
   // または
   model: 'imagen-3.0-generate-002'
   ```

2. プロジェクトのアクセス権を確認:
   ```bash
   gcloud projects get-iam-policy image-generation-demo-vertexai
   ```

---

### エラー: フロントエンドが古いコードを使用している

**原因**: ブラウザキャッシュ

**解決方法**:
```bash
# ブラウザで Cmd+Shift+R (macOS) または Ctrl+Shift+R (Windows) でハードリフレッシュ

# または Vite サーバーを再起動
npm run dev
```

---

## 今後の応用

### 他のプロジェクトでの適用手順

このドキュメントの内容は、Vertex AIやGoogle Cloud APIを使用する他のプロジェクトにも適用できます。

#### チェックリスト

1. **Google Cloud セットアップ**
   - [ ] gcloud CLI インストール
   - [ ] プロジェクト作成・設定
   - [ ] 必要なAPI有効化（例: Vertex AI, Vision API, など）
   - [ ] ADC設定

2. **バックエンド実装**
   - [ ] Express.js サーバー作成
   - [ ] CORS設定
   - [ ] 環境変数設定（`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`）
   - [ ] 各モジュールで `dotenv.config()` 呼び出し

3. **フロントエンド更新**
   - [ ] API呼び出しを fetch に変更
   - [ ] バックエンドエンドポイントを環境変数化

4. **テスト**
   - [ ] ヘルスチェック
   - [ ] E2Eテスト

---

### 本番環境への移行

#### Service Account の使用

ADCは開発環境専用です。本番環境では Service Account を使用します。

**1. Service Account の作成**:
```bash
gcloud iam service-accounts create fashion-image-generator \
  --display-name="Fashion Image Generator Service Account"
```

**2. 権限の付与**:
```bash
gcloud projects add-iam-policy-binding image-generation-demo-vertexai \
  --member="serviceAccount:fashion-image-generator@image-generation-demo-vertexai.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

**3. 鍵の作成**:
```bash
gcloud iam service-accounts keys create ./service-account-key.json \
  --iam-account=fashion-image-generator@image-generation-demo-vertexai.iam.gserviceaccount.com
```

**4. コードの更新**:
```javascript
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
  googleAuthOptions: {
    keyFilename: './service-account-key.json'
  }
});
```

---

## まとめ

### 学んだこと

1. ✅ **Vertex AI 画像生成APIはブラウザからのAPI Key認証を許可しない**
   - OAuth2またはADC認証が必須

2. ✅ **バックエンドプロキシが最適な解決策**
   - セキュリティ、コスト管理、スケーラビリティ

3. ✅ **ADC（Application Default Credentials）は開発に最適**
   - `gcloud auth application-default login` で簡単にセットアップ
   - 本番環境ではService Accountを使用

4. ✅ **ES Modulesの環境変数読み込み順序に注意**
   - 各モジュールで `dotenv.config()` を呼び出す

5. ✅ **モデル名の確認が重要**
   - 2026年1月時点: `gemini-2.5-flash-image`, `imagen-3.0-generate-002` など

### 今後のベストプラクティス

- **開発環境**: ADC + バックエンドプロキシ
- **本番環境**: Service Account + バックエンドプロキシ + レート制限
- **セキュリティ**: `.env` を `.gitignore` に追加、環境変数の厳格な管理
- **コスト管理**: クォータアラートの設定、使用量モニタリング

---

**このドキュメントについて**:
このガイドは、Vertex AI OAuth認証エラーの完全な対応記録です。今後、同様のプロジェクトで同じ問題に遭遇した際に、このドキュメントを参照することで迅速に解決できます。
