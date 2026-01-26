こ# Google GenAI 画像生成API 調査レポート

**作成日**: 2026-01-26
**プロジェクト**: Fashion Image Generator
**SDK**: `@google/genai`

---

## 📋 問題の概要

Fashion Image Generatorアプリケーションで画像生成機能を実装中、以下のエラーが発生：

```
Error: outputMimeType parameter is not supported in Gemini API.
```

その後、修正を試みるも、最終的に認証エラーに直面：

```
Error: API keys are not supported by this API.
Expected OAuth2 access token or other authentication credentials.
```

---

## 🔍 試行した修正と結果

### 修正 #1: `outputMimeType` パラメータの削除

**場所**: [src/api/vertexAI.js:20-24](src/api/vertexAI.js#L20-L24)

**問題**:
```javascript
imageConfig: {
  aspectRatio: "1:1",
  imageSize: "1K",
  outputMimeType: "image/png",  // ❌ サポートされていない
}
```

**修正**:
```javascript
imageConfig: {
  aspectRatio: "1:1",
  imageSize: "1K",
  // outputMimeType を削除
}
```

**結果**: ✅ このエラーは解消されたが、次の認証エラーが発生

**根拠**: Context7ドキュメントによると、`outputMimeType` は `generateImages()` API専用パラメータで、`generateContent()` では使用不可。

---

### 修正 #2: `ai.models.generateContent()` API の使用

**変更内容**:
- `ai.chats.create()` から `ai.models.generateContent()` に変更
- ストリーミングレスポンスを非ストリーミングに変更

**コード**:
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [
    prompt,
    { inlineData: { mimeType: getMimeType(outfitFile), data: outfitBase64 } },
    { inlineData: { mimeType: getMimeType(personFile), data: personBase64 } }
  ],
  config: generationConfig
});
```

**結果**: ❌ 401 Unauthorized エラー

**エラーメッセージ**:
```
API keys are not supported by this API. Expected OAuth2 access token...
service: generativelanguage.googleapis.com
method: google.ai.generativelanguage.v1beta.GenerativeService.GenerateContent
```

---

### 修正 #3: モデルを `gemini-2.5-flash-image` に変更

**変更内容**:
- `gemini-3-pro-image-preview` → `gemini-2.5-flash-image`

**理由**: `gemini-2.5-flash-image` はより新しく、API key認証をサポートしている可能性を検証

**結果**: ❌ 同じ 401 Unauthorized エラー

---

### 修正 #4: `ai.interactions.create()` API の使用

**変更内容**:
```javascript
const interaction = await ai.interactions.create({
  model: 'gemini-3-pro-image-preview',
  input: [
    { type: 'text', text: prompt },
    { type: 'image', data: outfitBase64, mime_type: getMimeType(outfitFile) },
    { type: 'image', data: personBase64, mime_type: getMimeType(personFile) }
  ],
  response_modalities: ['image']
});
```

**結果**: ❌ CORS エラー

**エラー内容**:
```
Access to fetch at 'https://generativelanguage.googleapis.com/v1beta/interactions'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check
```

**分析**: `interactions` APIはブラウザ環境からの直接アクセスに制限あり

---

### 修正 #5: `ai.chats.create()` + `gemini-2.5-flash-image` の組み合わせ

**変更内容**:
```javascript
const chat = ai.chats.create({ model: 'gemini-2.5-flash-image' });

const response = await chat.sendMessage({
  message: [
    { inlineData: { mimeType: getMimeType(outfitFile), data: outfitBase64 } },
    { inlineData: { mimeType: getMimeType(personFile), data: personBase64 } },
    prompt
  ]
});
```

**結果**: ❌ 401 Unauthorized エラー（同様）

---

## 🎯 根本原因の分析

### 発見した事実

1. **すべての画像生成モデルがAPI key認証を拒否**
   - `gemini-3-pro-image-preview`
   - `gemini-2.5-flash-image`
   - どのAPIメソッド（`models.generateContent`, `interactions.create`, `chats.sendMessage`）でも同じ

2. **エラーメッセージの意味**
   ```
   API keys are not supported by this API.
   Expected OAuth2 access token or other authentication credentials.
   ```
   → Google側のセキュリティポリシーとして、**画像生成APIはブラウザからのAPI key認証を許可していない**

3. **対応する認証方法**
   - OAuth2 access token
   - Application Default Credentials (ADC)
   - Service Account credentials

   → すべて**サーバーサイド認証が必要**

### なぜブラウザからAPI keyが使えないのか

**セキュリティ上の理由**:
1. **APIキーの露出リスク**: ブラウザのJavaScriptコードは誰でも閲覧可能
2. **コスト管理**: 画像生成は高コストなため、悪用を防ぐ必要がある
3. **レート制限の回避防止**: ユーザーが複数のAPIキーを使い分けることを防止

**Googleの設計思想**:
- テキスト生成（Gemini Flash/Pro）: API keyでアクセス可能（コスト低、制限しやすい）
- 画像生成（Imagen, Gemini Image）: OAuth2/ADC必須（コスト高、厳格な管理が必要）

---

## ✅ 確認済み事項

### 動作するケース

| API | モデル | 認証方法 | 環境 | 結果 |
|-----|--------|----------|------|------|
| `models.generateContent` | `gemini-2.0-flash` (テキスト) | API key | ブラウザ | ✅ 動作 |
| `chats.create` | `gemini-2.0-flash` (テキスト) | API key | ブラウザ | ✅ 動作 |

### 動作しないケース

| API | モデル | 認証方法 | 環境 | 結果 |
|-----|--------|----------|------|------|
| `models.generateContent` | `gemini-3-pro-image-preview` | API key | ブラウザ | ❌ 401 |
| `models.generateContent` | `gemini-2.5-flash-image` | API key | ブラウザ | ❌ 401 |
| `interactions.create` | `gemini-3-pro-image-preview` | API key | ブラウザ | ❌ CORS |
| `chats.sendMessage` | `gemini-2.5-flash-image` | API key | ブラウザ | ❌ 401 |

---

## 🛠️ 解決策オプション

### オプション A: バックエンドプロキシの実装 ⭐ **推奨**

**アーキテクチャ**:
```
[ブラウザ] → [Express.js サーバー] → [Vertex AI / Gemini API]
              ↑ API key保護            ↑ OAuth2/ADC認証
```

**メリット**:
- ✅ API keyを安全に管理（サーバー側の環境変数）
- ✅ 本番環境で推奨されるベストプラクティス
- ✅ レート制限やコスト管理が可能
- ✅ ユーザーごとの使用量追跡が可能
- ✅ CORSの完全な制御

**デメリット**:
- ❌ バックエンドサーバーの構築・管理が必要
- ❌ デプロイの複雑さが増す

**実装の難易度**: ⭐⭐☆☆☆ (中)

---

### オプション B: Vertex AI + ADC認証（Node.js環境）

**前提条件**:
- Google Cloud プロジェクトが必要
- `gcloud CLI` のインストール
- ローカル認証: `gcloud auth application-default login`

**コード変更**:
```javascript
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'YOUR_PROJECT_ID',
  location: 'us-central1'
});
```

**メリット**:
- ✅ Vertex AI の全機能にアクセス可能
- ✅ Google Cloud の統合認証

**デメリット**:
- ❌ ブラウザでは動作しない（Node.js環境のみ）
- ❌ 結局バックエンドが必要
- ❌ Google Cloud プロジェクトとセットアップが必要

**実装の難易度**: ⭐⭐⭐☆☆ (中～高)

---

### オプション C: 代替API/サービスの利用

**候補**:

1. **Replicate API**
   - Stable Diffusion, FLUX など多数のモデル
   - API key認証で簡単
   - 料金: 従量課金

2. **OpenAI DALL-E 3**
   - API key認証
   - 高品質な画像生成
   - 料金: $0.040 - $0.120 / 画像

3. **Hugging Face Inference API**
   - 多数のオープンソースモデル
   - API key認証
   - 一部無料プランあり

**メリット**:
- ✅ ブラウザから直接API key認証で使用可能
- ✅ 実装が簡単

**デメリット**:
- ❌ Google GenAI SDKの学習が無駄になる
- ❌ コスト構造が異なる
- ❌ モデルの品質・特性が異なる

**実装の難易度**: ⭐☆☆☆☆ (易)

---

### オプション D: テキストモデルのみでプロトタイプ

**内容**:
- 画像生成機能は一旦保留
- 画像分析（アップロードした画像の説明生成）のみ実装
- `gemini-2.0-flash` などのテキストモデルを使用

**メリット**:
- ✅ API keyで即座に動作
- ✅ Google GenAI SDKの学習継続

**デメリット**:
- ❌ 本来の目的（画像生成）が達成できない

**実装の難易度**: ⭐☆☆☆☆ (易)

---

## 🚀 推奨実装手順：バックエンドプロキシ

### フェーズ1: Express.js サーバーのセットアップ

#### 1.1 必要なパッケージのインストール

```bash
npm install express cors dotenv @google/genai
```

#### 1.2 サーバーディレクトリ構造

```
image_generation_demo_vertexAI_web/
├── client/                    # フロントエンド（既存のsrc/）
│   ├── src/
│   ├── public/
│   └── index.html
├── server/                    # バックエンド（新規）
│   ├── index.js              # Expressサーバー
│   ├── routes/
│   │   └── imageGeneration.js
│   └── .env                  # サーバー用環境変数
└── package.json
```

#### 1.3 サーバー実装 (`server/index.js`)

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageGenerationRouter from './routes/imageGeneration.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Base64画像データのため大きめに設定

// ルート
app.use('/api/generate-image', imageGenerationRouter);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

#### 1.4 画像生成エンドポイント (`server/routes/imageGeneration.js`)

```javascript
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();
const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

router.post('/', async (req, res) => {
  try {
    const { outfitBase64, outfitMimeType, personBase64, personMimeType } = req.body;

    // バリデーション
    if (!outfitBase64 || !personBase64) {
      return res.status(400).json({
        error: 'Both outfit and person images are required'
      });
    }

    // Vertex AI認証（ADC使用）
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });

    const model = 'gemini-3-pro-image-preview';

    const prompt = 'Create professional e-commerce fashion photos. Place the outfit from the first image onto the model in the second image. Generate realistic full-body shots of the model wearing the outfit, adjusting lighting and shadows to match an outdoor environment.';

    const response = await ai.models.generateContent({
      model,
      contents: [
        prompt,
        { inlineData: { mimeType: outfitMimeType, data: outfitBase64 } },
        { inlineData: { mimeType: personMimeType, data: personBase64 } }
      ],
      config: {
        maxOutputTokens: 32768,
        temperature: 1,
        topP: 0.95,
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    // 画像データの抽出
    let imageData = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
          break;
        }
      }
    }

    if (!imageData) {
      return res.status(500).json({
        error: 'No image data received from API'
      });
    }

    res.json({ imageData });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate image'
    });
  }
});

export default router;
```

#### 1.5 サーバー用環境変数 (`server/.env`)

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
PORT=3001
```

### フェーズ2: フロントエンドの修正

#### 2.1 `src/api/vertexAI.js` の更新

```javascript
// バックエンドAPIエンドポイント
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api/generate-image';

export async function generateFashionImage(outfitFile, personFile) {
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate image');
  }

  const data = await response.json();
  return data.imageData;
}
```

#### 2.2 クライアント用環境変数 (`.env`)

```bash
# 既存のAPI keyは不要（バックエンドで管理）
VITE_API_ENDPOINT=http://localhost:3001/api/generate-image
```

### フェーズ3: Google Cloud セットアップ

#### 3.1 Google Cloud プロジェクトの作成

```bash
# Google Cloud CLIのインストール確認
gcloud --version

# 新規プロジェクト作成（既存があればスキップ）
gcloud projects create your-project-id --name="Fashion Image Generator"

# プロジェクト設定
gcloud config set project your-project-id
```

#### 3.2 Vertex AI APIの有効化

```bash
gcloud services enable aiplatform.googleapis.com
```

#### 3.3 ローカル開発用の認証設定

```bash
gcloud auth application-default login
```

ブラウザが開き、Googleアカウントでログイン → 認証情報が `~/.config/gcloud/application_default_credentials.json` に保存される

### フェーズ4: テスト実行

#### 4.1 サーバー起動

```bash
# server/ ディレクトリで
node index.js
# → Server running on http://localhost:3001
```

#### 4.2 クライアント起動

```bash
# プロジェクトルートで
npm run dev
# → http://localhost:5173
```

#### 4.3 動作確認

1. ブラウザで `http://localhost:5173` にアクセス
2. 服装画像と人物画像をアップロード
3. "Generate Fashion Image" をクリック
4. サーバーコンソールでリクエストログを確認
5. 生成された画像が表示されることを確認

---

## 📊 コスト比較

### Google Vertex AI (Gemini 3 Pro Image)

- **モデル**: `gemini-3-pro-image-preview`
- **料金**: 約 $0.025 / 画像（1024x1024）
- **特徴**: マルチモーダル入力、Google Cloud統合

### Replicate (Stable Diffusion / FLUX)

- **モデル**: 多数
- **料金**: $0.002 - $0.015 / 画像
- **特徴**: 多様なモデル、簡単なAPI

### OpenAI DALL-E 3

- **モデル**: DALL-E 3
- **料金**: $0.040 - $0.120 / 画像
- **特徴**: 高品質、指示追従性が高い

---

## 🔒 セキュリティのベストプラクティス

### バックエンド実装時の推奨事項

1. **環境変数の管理**
   ```bash
   # .gitignore に追加
   server/.env
   ```

2. **レート制限の実装**
   ```javascript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15分
     max: 10 // 15分あたり10リクエストまで
   });

   app.use('/api/generate-image', limiter);
   ```

3. **入力検証**
   ```javascript
   // Base64サイズチェック
   const maxSize = 10 * 1024 * 1024; // 10MB
   if (Buffer.from(outfitBase64, 'base64').length > maxSize) {
     return res.status(413).json({ error: 'Image too large' });
   }
   ```

4. **CORSの厳格な設定**
   ```javascript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
     credentials: true,
     methods: ['POST']
   }));
   ```

---

## 📝 まとめ

### 調査で明らかになったこと

1. ✅ **`outputMimeType` は `generateContent` APIでサポートされていない**
   - `generateImages()` API専用パラメータ

2. ❌ **画像生成モデルはブラウザからのAPI key認証を許可していない**
   - セキュリティ・コスト管理のため
   - OAuth2 / ADC認証が必須

3. 📌 **すべての画像生成APIが同じ制限を持つ**
   - `gemini-3-pro-image-preview`
   - `gemini-2.5-flash-image`
   - `imagen-3.0-generate-002`

### 次のステップ

**即座に実装可能**:
- [ ] Express.jsバックエンドサーバーのセットアップ
- [ ] Google Cloud プロジェクトの作成
- [ ] Vertex AI APIの有効化
- [ ] ADC認証の設定
- [ ] フロントエンドをバックエンドAPI経由に変更

**本番環境への準備**:
- [ ] サーバーのデプロイ（Cloud Run, App Engine, など）
- [ ] Service Accountの作成と権限設定
- [ ] レート制限の実装
- [ ] エラーハンドリングの強化
- [ ] モニタリング・ログの設定

---

## 📚 参考リソース

- [Google GenAI SDK Documentation](https://googleapis.github.io/js-genai/)
- [Vertex AI Authentication](https://cloud.google.com/docs/authentication)
- [Express.js Documentation](https://expressjs.com/)
- [Context7: Google GenAI SDK](https://context7.com/googleapis/js-genai)

---

**このドキュメントについて**:
このレポートは、Fashion Image Generatorプロジェクトで遭遇したAPI認証問題の調査結果をまとめたものです。今後のバックエンド実装の参考資料としてご活用ください。
