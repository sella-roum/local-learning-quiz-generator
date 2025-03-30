# Local Learning Quiz Generator (学習クイズジェネレーター)

このプロジェクトは、Next.js で構築された Web アプリケーションで、ユーザーは PDF ファイルからクイズを生成できます。

## 概要

このアプリケーションは、以下の機能を提供します。

- **ファイルアップロード**: ユーザーは PDF ファイルをアップロードしてクイズを生成できます。
- **クイズ生成**: アップロードされた PDF ファイルの内容から、AI を活用したキーワード抽出およびクイズ生成 API を使用して、クイズが自動的に生成されます。
- **クイズプレイ**: ユーザーは生成されたクイズをプレイし、結果を確認できます。
- **クイズ履歴**: ユーザーは自分のクイズ履歴と結果を閲覧できます。

## 使用ライブラリ

- **フレームワーク**: [Next.js](https://nextjs.org/)
- **UI ライブラリ**: [Radix UI](https://www.radix-ui.com/), [Tailwind CSS](https://tailwindcss.com/), [lucide-react](https://lucide.dev/), [class-variance-authority](https://github.com/joe-bell/class-variance-authority), [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge), [tailwindcss-animate](https://github.com/vercel/tailwindcss-animate), [framer-motion](https://www.framer.com/motion/), [cmdk](https://cmdk.paco.me/)
- **PDF 処理**: [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **データベース**: [dexie](https://dexie.org/), [dexie-react-hooks](https://github.com/dexie/dexie-react-hooks)
- **AI API クライアント**: [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini API)
- **その他**: [canvas-confetti](https://www.npmjs.com/package/canvas-confetti), [date-fns](https://date-fns.org/), [next-themes](https://github.com/pacocoursey/next-themes), [uuid](https://www.npmjs.com/package/uuid)

## 画面構成とコンポーネント

アプリケーションは、以下の主要な画面で構成されています。

- **ホームページ (`/`)**: アプリケーションのトップページ。
  - `src/app/page.tsx`
  - プロジェクトの概要と主要な機能を紹介するランディングページです。
  - ファイルアップロード、クイズプレイ、クイズ履歴への導線を提供します。
- **ファイルアップロードページ (`/files`)**: PDF ファイルをアップロードするためのページ。
  - `src/app/files/page.tsx`
  - `FileUpload` コンポーネントを使用して、PDF ファイルのアップロード機能を提供します。
  - アップロードされたファイルは一覧表示され、ファイル名をクリックするとファイル詳細ページに遷移します。
- **ファイル詳細ページ (`/files/[fileId]`)**: アップロードされたファイルの詳細を表示するページ。
  - `src/app/files/[fileId]/page.tsx`
  - ファイル名、アップロード日時、クイズ生成状況などのファイルの詳細情報を表示します。
  - クイズ生成が完了している場合は、クイズプレイページへの導線を提供します。
- **クイズ一覧ページ (`/quizzes`)**: 生成されたクイズの一覧を表示するページ。
  - `src/app/quizzes/page.tsx`
  - 生成されたクイズを一覧表示し、クイズ名をクリックするとクイズ編集ページに遷移します。
  - ページネーション機能を備え、大量のクイズを効率的に表示します。
- **クイズ作成ページ (`/quizzes/create`)**: 手動でクイズを作成するためのページ (まだ実装されていません)。
  - `src/app/quizzes/create/page.tsx`
  - クイズの手動作成機能を提供します (まだ実装されていません)。
  - 今後の開発で実装予定です。
- **クイズ編集ページ (`/quizzes/[quizId]/edit`)**: 既存のクイズを編集するためのページ。
  - `src/app/quizzes/[quizId]/edit/page.tsx`
  - 既存のクイズのタイトル、問題、選択肢などを編集できます。
  - 編集内容は保存され、クイズプレイページに反映されます。
- **クイズプレイページ (`/play`)**: クイズセッションを開始するためのページ。
  - `src/app/play/page.tsx`
  - プレイ可能なクイズの一覧を表示し、クイズを選択してクイズセッションを開始できます。
  - クイズの検索・絞り込み機能を提供する予定です。
- **クイズセッションページ (`/play/session`)**: クイズをプレイするためのページ。
  - `src/app/play/session/page.tsx`
  - 選択されたクイズの問題と選択肢を表示し、ユーザーは回答を選択してクイズを進めます。
  - 回答状況に応じて UI が変化し、ユーザーにフィードバックを提供します。
- **結果ページ (`/results`)**: クイズの結果を表示するページ。
  - `src/app/results/page.tsx`
  - クイズのスコア、正誤、解答時間などの結果を表示します。
  - クイズ履歴チャートを表示し、過去の成績と比較できます。

## API エンドポイント

アプリケーションは、以下の API エンドポイントを使用します。

- `/api/extract-keywords`: PDF コンテンツからキーワードを抽出するための API。
  - `src/app/api/extract-keywords/route.ts`
  - PDF ファイルの内容を解析し、キーワードを抽出して返します。
  - Gemini API などの AI モデルを利用してキーワード抽出を行います。
- `/api/extract-keywords-summary`: PDF コンテンツからキーワードと要約を抽出するための API。
  - `src/app/api/extract-keywords-summary/route.ts`
  - PDF ファイルの内容を解析し、キーワードと要約を抽出して返します。
  - Gemini API などの AI モデルを利用してキーワード抽出と要約生成を行います。
- `/api/generate-quiz`: キーワードからクイズを生成するための API。
  - `src/app/api/generate-quiz/route.ts`
  - 抽出されたキーワードを元に、クイズの問題と選択肢を生成して返します。
  - Gemini API などの AI モデルを利用してクイズ生成を行います。

## UI コンポーネント

アプリケーションで使用される主要な UI コンポーネントは以下の通りです。

- `components/ui`: Radix UI と Tailwind CSS をベースにした UI プリミティブ。
  - Button, Card, Dialog, Input, Select, Tabs など、再利用可能な UI 部品を提供します。
  - アプリケーション全体で一貫した UI デザインを維持するために使用されます。
- `components/file-upload.tsx`: ファイルアップロードコンポーネント。
  - PDF ファイルのアップロード機能を提供します。
  - ドラッグアンドドロップ、ファイル選択ダイアログによるファイルアップロードに対応します。
- `components/file-list.tsx`: ファイル一覧コンポーネント。
  - アップロードされたファイルの一覧を表示します。
  - ファイル名、アップロード日時、クイズ生成状況などの情報を表示します。
- `components/quiz-history-chart.tsx`: クイズ履歴チャートコンポーネント。
  - 過去のクイズ結果をチャート形式で表示します。
  - 成績の推移を視覚的に把握できます。
- `components/quiz-export-dialog.tsx`, `components/quiz-import-dialog.tsx`: クイズエクスポート・インポートダイアログコンポーネント。
  - クイズのエクスポート・インポート機能を提供します (まだ実装されていません)。
  - 今後の開発で実装予定です。
- `components/theme-toggle.tsx`, `components/theme-provider.tsx`: テーマ切り替えコンポーネント。
  - アプリケーションのテーマ（ライトモード・ダークモード）切り替え機能を提供します。
  - `next-themes` ライブラリを利用してテーマ切り替えを実装しています。
- `components/main-layout.tsx`: メインレイアウトコンポーネント。
  - アプリケーション全体のレイアウトを提供します。
  - ヘッダー、フッター、サイドバーなどの共通 UI 要素を配置します。

## はじめに

まず、開発サーバーを実行します。

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて結果を確認してください。

`app/page.tsx` を編集してページを編集できます。ファイルを編集すると、ページが自動的に更新されます。

このプロジェクトでは、[next/font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) を使用して、Vercel の新しいフォントファミリーである [Geist](https://vercel.com/font) を自動的に最適化およびロードします。

## より詳しく学ぶには

Next.js の詳細については、以下のリソースをご覧ください。

- [Next.js ドキュメント](https://nextjs.org/docs) - Next.js の機能と API について学びます。
- [Learn Next.js](https://nextjs.org/learn) - インタラクティブな Next.js チュートリアル。

[Next.js GitHub リポジトリ](https://github.com/vercel/next.js)もチェックしてみてください。フィードバックや貢献をお待ちしています！

## Vercel へのデプロイ

Next.js アプリをデプロイする最も簡単な方法は、Next.js の作成者による [Vercel プラットフォーム](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) を使用することです。

詳細については、[Next.js デプロイドキュメント](https://nextjs.org/docs/app/building-your-application/deploying)をご覧ください。
