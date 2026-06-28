# Local Learning Quiz Generator (学習クイズジェネレーター)

[![Powered by Next.js](https://img.shields.io/badge/Powered%20by-Next.js-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Using TypeScript](https://img.shields.io/badge/Using-TypeScript-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Styled with Tailwind CSS](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Components by shadcn/ui](https://img.shields.io/badge/Components-shadcn/ui-black?style=flat)](https://ui.shadcn.com/)
[![AI by Google Gemini](https://img.shields.io/badge/AI%20by-Google%20Gemini-4285F4?style=flat&logo=google)](https://ai.google.dev/)

ローカルにあるテキスト、画像、PDF ファイルから AI が自動で 4 択クイズを作成し、ブラウザ上で学習できる Web アプリケーションです。

## 概要

このアプリケーションを使用すると、お手持ちの学習資料をアップロードするだけで、AI（Google Gemini）が内容を解析し、関連するクイズを自動生成します。生成されたクイズはブラウザのローカルストレージ (IndexedDB) に保存され、いつでも学習セッションを開始できます。

## 主な機能

- **ファイルアップロード**: テキスト (.txt)、画像 (.jpg, .jpeg, .png)、PDF (.pdf) ファイルをアップロードできます。
- **AI による内容解析**: アップロードされたファイルの内容を AI が解析し、重要なキーワード、概要、構成を抽出します。
- **AI クイズ生成**: ファイルの内容や抽出された情報に基づき、指定した条件（問題数、難易度、カテゴリなど）で 4 択クイズを自動生成します。単一ファイルまたは複数ファイルからまとめて生成可能です。
- **クイズ管理**: 生成されたクイズの一覧表示、検索、カテゴリフィルタリング、編集、削除が可能です。
- **クイズプレイ**: カテゴリ、問題数、制限時間を選択してクイズセッションを開始できます。回答の正誤判定と解説表示機能があります。
- **学習履歴**: 過去のクイズセッションの結果や統計（正答率推移、総合成績など）を確認できます。
- **インポート/エクスポート**: クイズデータを JSON 形式でエクスポートしたり、他の環境からインポートしたりできます。
- **PWA 対応**: オフラインでの利用や、デバイスのホーム画面への追加が可能です。
- **テーマ切り替え**: ライトモードとダークモードを切り替えられます。
- **操作説明**: アプリケーション内で操作方法を確認できます。

## 技術スタック

- **フレームワーク**: [Next.js](https://nextjs.org/) (App Router)
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **UI**:
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/) (Radix UI + Tailwind CSS)
  - [Lucide React](https://lucide.dev/) (アイコン)
  - [Framer Motion](https://www.framer.com/motion/) (アニメーション)
  - [Recharts](https://recharts.org/) (チャート)
- **状態管理**: React Hooks, [Dexie React Hooks](https://dexie.org/docs/dexie-react-hooks/intro)
- **データ永続化**: IndexedDB ([Dexie.js](https://dexie.org/))
- **PDF 処理**: Gemini API へ `application/pdf` の inlineData として直接送信
- **AI**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
- **PWA**: [next-pwa](https://github.com/shadowwalker/next-pwa)
- **その他**: clsx, tailwind-merge, date-fns, uuid, react-markdown, canvas-confetti, next-themes

## ディレクトリ構成の概要

```
/
├── public/              # 静的ファイル (画像, manifest.json, sw.js など)
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # API ルートハンドラ (Gemini連携など)
│   │   ├── (pages)/     # 各ページのコンポーネント (files, quizzes, play など)
│   │   ├── layout.tsx   # ルートレイアウト
│   │   ├── page.tsx     # ホームページ
│   │   └── globals.css  # グローバルCSS
│   ├── components/      # 再利用可能なコンポーネント
│   │   ├── ui/          # shadcn/ui コンポーネント
│   │   └── (specific)/  # アプリケーション固有コンポーネント (FileUpload, FileList など)
│   ├── lib/             # ユーティリティ、DB設定、API連携など
│   └── [...slug]/page.tsx # 未定義ルートのキャッチ
├── next.config.mjs      # Next.js 設定 (PWA含む)
├── tailwind.config.ts   # Tailwind CSS 設定
├── tsconfig.json        # TypeScript 設定
└── package.json         # 依存関係など
```

## セットアップと実行

1.  **リポジトリをクローン**:

    ```bash
    git clone https://github.com/sella-roum/local-learning-quiz-generator.git
    cd local-learning-quiz-generator
    ```

2.  **依存関係をインストール**:

    ```bash
    npm install
    # または
    yarn install
    # または
    pnpm install
    ```

3.  **環境変数を設定**:

    - プロジェクトルートに `.env.local` ファイルを作成します。
    - Google Gemini API キーを以下の形式で記述します。
      ```env
      GEMINI_API_KEY=YOUR_GEMINI_API_KEY
      ```
      API キーは [Google AI Studio](https://aistudio.google.com/app/apikey) などで取得してください。

4.  **開発サーバーを起動**:

    ```bash
    npm run dev
    # または
    yarn dev
    # または
    pnpm dev
    ```

5.  ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## Development

1. Copy `.env.example` to `.env.local`.
2. Set `GEMINI_API_KEY` in `.env.local`.
3. Use Node.js 22.
4. Install dependencies with `npm ci`.
5. Run `npm run check` before opening a pull request.

## Development and operation notice

- **IndexedDB storage**: Files you upload and generated quiz data are stored in your browser's IndexedDB, not on any server.
- **External AI API**: Keyword extraction, summary generation, and quiz creation send file contents (text, images, PDFs) to the Google Gemini API. Do not upload files containing confidential, personal, or proprietary information.
- **URL content fetching**: When fetching content from a URL, the URL and page content are sent to an external service (Jina Reader). Do not input URLs for confidential or authenticated pages.

## AI解析の入力上限

AI解析・クイズ生成の安定性とコスト管理のため、以下の上限を設けています。

| 入力種別 | 上限 |
| --- | ---: |
| テキスト本文 | 100,000文字 |
| URL取得本文 | 100,000文字 |
| PDFファイル | 20MiB目安 |
| 画像ファイル | 10MiB目安 |

上限を超える入力は、AI APIへ送信される前にエラーになります。IndexedDB保存容量の管理とは別の制限です。

PDF/画像の上限はアップロード元ファイルサイズを基準にしています。API送信時にはBase64化されるため、送信payloadは元ファイルより大きくなります。

## 注意事項

- **API キー**: このアプリケーションは Google Gemini API を使用します。API キーを `.env.local` ファイルに設定する必要があります。
- **機密情報**: ファイルの解析やクイズ生成には Gemini API が使用されます。AI モデルの学習データとして利用される可能性があるため、**機密情報や個人情報を含むファイルはアップロードしないでください**。
- **データ保存**: ファイル情報、クイズデータ、学習履歴はすべてお使いのブラウザの **IndexedDB** に保存されます。他のブラウザやデバイスとは共有されません。データを移行する場合は、エクスポート/インポート機能を使用してください。
- **外部送信**: ファイル内容（テキスト、画像、PDF）はキーワード抽出・要約生成・クイズ作成時に Google Gemini API へ送信されます。URL取得時は入力したURLやページ内容が Jina Reader へ送信されます。
- **PDF 処理**: PDFはブラウザ上でテキスト抽出せず、Gemini APIへ `application/pdf` の `inlineData` として直接送信します。PDFの内容は外部APIへ送信されるため、機密情報・個人情報・社外秘資料を含むPDFはアップロードしないでください。
