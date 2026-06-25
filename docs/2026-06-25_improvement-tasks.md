# Local Learning Quiz Generator 改善タスク一覧

作成日: 2026-06-25
対象リポジトリ: `sella-roum/local-learning-quiz-generator`

## 前提

このドキュメントは、現状のリポジトリ分析結果をもとに、対応すべき改善点を実装タスクとして整理したものです。

PR分割案ではなく、対応対象をタスク単位で整理します。

PDF処理については、**PDF.js 等でローカルテキスト抽出するのではなく、PDFファイル本体を Gemini API に直接渡して解析・クイズ生成する方針**を前提とします。

## 優先度の定義

| 優先度 | 意味 |
| --- | --- |
| P0 | 放置するとビルド不能、データ破損、セキュリティリスクにつながる最優先事項 |
| P1 | 実用化・継続開発にほぼ必須の改善 |
| P2 | 保守性、品質、運用性を上げる改善 |
| P3 | UX、学習体験、拡張性を高める改善 |

---

# P0: 最優先対応

## TASK-001: React / React DOM / 型定義のバージョン不整合を修正する

### 背景

`package.json` で `react` と `react-dom` の major version が一致していない。型定義も `@types/react` と `@types/react-dom` で major version が揃っていない。

この状態は、実行時エラー、Hydration不整合、型チェックの不安定化、依存解決トラブルの原因になる。

### 対応内容

- `react` と `react-dom` の major version を揃える。
- `@types/react` と `@types/react-dom` の major version を揃える。
- Next.js の対応範囲と整合する組み合わせにする。
- `package-lock.json` を再生成する。
- 依存更新後に `npm install` / `npm run build` を確認する。

### 対象ファイル

- `package.json`
- `package-lock.json`

### 達成条件

- React関連の実装依存と型定義の major version が一致している。
- `npm install` が成功する。
- `npm run build` が成功する。
- React / Hydration 系の明確な警告が発生しない。

---

## TASK-002: `GenerateQuiz.options` の型破綻を修正する

### 背景

現状、AI生成クイズの選択肢型がコード上で一貫していない。

- APIレスポンス上の `options` は `string[]`。
- フロント側の `GenerateQuiz.options` は `{ text: string; isCorrect: boolean }[]` を想定している。
- 編集時に `options` をオブジェクト配列へ変換している。
- DB保存時に `opt.toString()` を使っているため、編集済みクイズの選択肢が `[object Object]` になる可能性がある。

これはデータ破損につながるため、最優先で修正する。

### 対応内容

- `GenerateQuiz.options` を `string[]` に統一する。
- `QuizOption` 型を削除するか、別用途として明確に分離する。
- 単一ファイル作成画面の編集保存処理を修正する。
- 複数ファイル作成画面の編集保存処理を修正する。
- DB保存時に `toString()` に依存しない。
- 生成直後、編集後、保存後、一覧表示、プレイ画面で常に `string[]` として扱う。

### 対象ファイル

- `src/lib/api-utils.ts`
- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`
- `src/lib/db.ts`

### 達成条件

- 編集済みクイズの選択肢が `[object Object]` にならない。
- TypeScript上で `options` の型が一貫している。
- クイズ生成、編集、保存、一覧、プレイ、結果表示が正常に動く。

---

## TASK-003: `/api/document` のパストラバーサル対策を実装する

### 背景

`/api/document` は `fileName` クエリを受け取り、サーバー上の `public/documents` 配下のMarkdownを読み込む。

現状は `fileName` に対する十分な検証がなく、`../` を含む入力などで想定外パスを参照できる余地がある。

### 対応内容

- 読み込み可能なファイル名を固定リスト化する。
- または `path.resolve` 後に `public/documents` 配下であることを検証する。
- `../`、絶対パス、空文字、不正拡張子を拒否する。
- 不正入力は 400 を返す。
- ファイル不存在は 404 を返す。
- 正常時のみ許可されたMarkdownを返す。

### 対象ファイル

- `src/app/api/document/route.ts`

### 達成条件

- `?fileName=../package.json` のような入力でファイルを読めない。
- 許可されたドキュメントのみ読める。
- 不正入力時のレスポンスが明確である。

---

## TASK-004: 基本品質ゲートを追加する

### 背景

現状、`package.json` に `typecheck` や `test` が存在せず、通常PR向けのCIも不足している。

型破綻やビルド失敗を早期検出できないため、継続開発の土台として品質ゲートを整備する。

### 対応内容

- `typecheck` script を追加する。
- `check` script を追加する。
- GitHub Actions の通常CIを追加する。
- CIで以下を実行する。
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### 対象ファイル

- `package.json`
- `.github/workflows/ci.yml`

### 達成条件

- push / pull_request でCIが走る。
- 型エラー、lintエラー、buildエラーが検出できる。
- CIが成功する状態でmainに入れられる。

---

## TASK-005: 本番ログにAI応答本文を出さないようにする

### 背景

Gemini APIからの応答テキストを `console.log` している箇所がある。

学習資料の内容や生成されたクイズ本文がログに残る可能性があるため、本番環境では抑制する必要がある。

### 対応内容

- 本番環境ではAI応答本文をログ出力しない。
- デバッグログは `NODE_ENV !== "production"` の場合に限定する。
- エラー時も本文全体ではなく、エラー種別やメタ情報のみを出す。
- 必要であればログ用ユーティリティを作る。

### 対象ファイル

- `src/app/api/generate-quiz/route.ts`
- `src/app/api/extract-keywords-summary/route.ts`
- `src/app/api/extract-keywords/route.ts`

### 達成条件

- production環境でファイル本文、AI応答全文、生成クイズ全文がログに出ない。
- 開発時には必要最低限のデバッグが可能。

---

# P1: 実用化に必要な対応

## TASK-006: PDF処理方針を「PDF本体をAIへ直接渡す」に統一する

### 背景

現状、`src/lib/pdf-utils.ts` に PDF.js によるテキスト抽出関数が存在する一方、実際のアップロード処理では無効化されている。

今回の方針として、PDFはローカル抽出せず、PDF本体をGemini APIへ直接渡す。したがって、PDF.jsベースの抽出処理は削除または非採用として明確化する。

### 対応内容

- PDFアップロード時はPDFの `ArrayBuffer` をBase64化し、Geminiへ渡す方針に統一する。
- `extractTextFromPDF` を使わない設計として明確化する。
- 未使用の `pdf-utils.ts` を削除するか、将来用として残すならコメントで非採用理由を明記する。
- READMEのPDF処理説明を修正する。
- UI上でも「PDFはAIに直接送信されます」と明記する。

### 対象ファイル

- `src/components/file-upload.tsx`
- `src/lib/pdf-utils.ts`
- `README.md`
- 必要に応じて `src/app/files/page.tsx`

### 達成条件

- PDF処理の仕様と実装が一致している。
- READMEに「PDF.jsでローカル抽出する」と誤解される記述がない。
- PDFからの解析・クイズ生成がGemini直接送信前提で説明されている。

---

## TASK-007: 外部送信に関するプライバシー表示をUIに追加する

### 背景

データ保存はIndexedDBだが、ファイル解析やクイズ生成ではGemini APIへ内容を送信する。URL取得ではJina ReaderにもURL・ページ内容を送信する。

READMEだけでなく、ユーザーが操作する画面上で明示する必要がある。

### 対応内容

- ファイルアップロード画面に注意文を表示する。
- PDF、画像、テキストはいずれもAI解析時に外部APIへ送信されることを明記する。
- URL取得画面にJina Reader利用を明記する。
- 機密情報、個人情報、社外秘資料を投入しないよう警告する。
- READMEの注意事項も更新する。

### 対象ファイル

- `README.md`
- `src/components/file-upload.tsx`
- `src/components/url-content-fetcher.tsx`
- `src/app/files/page.tsx`

### 達成条件

- ユーザーがアップロード前に外部送信を認識できる。
- 「ローカル保存」と「外部AI解析」の違いがUI上で分かる。

---

## TASK-008: 複数ファイル生成の合計問題数ロジックを修正する

### 背景

複数ファイル作成画面では「生成数（合計）」と表示しているが、実装では `Math.floor(total / files.length)` で各ファイルの生成数を決めている。

このため、指定した合計問題数と実際の生成数が一致しないケースがある。

### 対応内容

- 合計問題数を厳密に満たす配分ロジックを実装する。
- 例: 10問 / 3ファイル → 4, 3, 3 のように余りを配分する。
- ファイル数が問題数より多い場合の仕様を決める。
- 生成結果が合計数を超えた場合はトリミングする。
- 生成結果が不足した場合の扱いを明確にする。

### 対象ファイル

- `src/app/quizzes/create-multi/page.tsx`

### 達成条件

- UIで指定した合計問題数と生成・保存対象数が一致する。
- ファイル数と問題数の大小関係によらず挙動が明確である。

---

## TASK-009: `/play/session` の sessionId 処理を単純化する

### 背景

通常導線では `/play` でセッションを作成し、`/play/session?sessionId=...` に遷移する。

一方、`/play/session` 側には `sessionId` がない場合にセッションを作成する分岐があるが、回答保存時はURLクエリ由来の `sessionId!` を使っており、整合性が弱い。

### 対応内容

- `/play/session` は `sessionId` 必須にする。
- `sessionId` がない場合はエラー表示または `/play` へ戻す。
- `sessionId` なしで新規セッションを作る分岐を削除する。
- `sessionIdState` が不要であれば削除する。

### 対象ファイル

- `src/app/play/session/page.tsx`

### 達成条件

- セッションIDのソースが1つに統一されている。
- `sessionId` なし直接アクセスで不正な結果保存が起きない。

---

## TASK-010: カテゴリ選択Popoverの開閉処理を修正する

### 背景

カテゴリ選択のPopover Triggerで、クリック時に `setOpenCategorySelect(false)` を呼んでいる。これにより、開くべきタイミングで閉じる方向に働く可能性がある。

### 対応内容

- Trigger側の不要な `setOpenCategorySelect(false)` を削除する。
- `onOpenChange={setOpenCategorySelect}` に任せる。
- 単一ファイル作成画面と複数ファイル作成画面の両方で修正する。

### 対象ファイル

- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`

### 達成条件

- 既存カテゴリ一覧が正常に開閉する。
- 既存カテゴリ選択と新規カテゴリ作成が正常に動く。

---

## TASK-011: GeminiモデルIDとthinkingBudgetを環境変数化する

### 背景

GeminiのモデルIDと `thinkingBudget` がAPIルートに直書きされている。モデル廃止、コスト調整、環境差分に弱い。

### 対応内容

- 以下の環境変数を追加する。
  - `GEMINI_PRIMARY_MODEL`
  - `GEMINI_FALLBACK_MODEL`
  - `GEMINI_ENABLE_THINKING`
  - `GEMINI_THINKING_BUDGET`
- 未設定時は安全なデフォルトを使う。
- `.env.example` を追加または更新する。
- READMEの環境変数説明を更新する。

### 対象ファイル

- `src/app/api/generate-quiz/route.ts`
- `src/app/api/extract-keywords-summary/route.ts`
- `src/app/api/extract-keywords/route.ts`
- `.env.example`
- `README.md`

### 達成条件

- モデル変更が環境変数だけでできる。
- previewモデル廃止時の修正範囲が小さい。

---

## TASK-012: CORS処理を共通化する

### 背景

複数APIルートにCORSヘッダー設定が重複している。設定変更時に漏れが出やすい。

### 対応内容

- `src/lib/server/cors.ts` のような共通モジュールを作る。
- `setCorsHeaders` を共通化する。
- `OPTIONS` レスポンス生成も共通化できるなら行う。
- 許可Originの優先順位を明確化する。

### 対象ファイル

- `src/app/api/generate-quiz/route.ts`
- `src/app/api/extract-keywords-summary/route.ts`
- `src/app/api/extract-keywords/route.ts`
- `src/app/api/document/route.ts`
- `src/lib/server/cors.ts`

### 達成条件

- CORS設定が1箇所で管理されている。
- 各APIルートに重複したCORS実装が残っていない。

---

## TASK-013: AI APIへの入力サイズ上限を追加する

### 背景

ファイルサイズ、URL取得本文、プロンプト本文に明確な上限がない。

巨大PDF、巨大画像、長大テキスト、長大Webページで、ブラウザ負荷、API失敗、コスト増加が起きる可能性がある。

### 対応内容

- アップロードファイルサイズ上限を設定する。
- URL取得本文の最大文字数を設定する。
- テキストファイル本文の最大文字数を設定する。
- APIルート側でも入力サイズを検証する。
- 超過時はユーザー向けに分かりやすいエラーを返す。

### 対象ファイル

- `src/components/file-upload.tsx`
- `src/components/url-content-fetcher.tsx`
- `src/lib/api-utils.ts`
- `src/app/api/generate-quiz/route.ts`
- `src/app/api/extract-keywords-summary/route.ts`

### 達成条件

- 巨大入力でブラウザやAPIが不安定になりにくい。
- 上限超過時に明確なエラーが出る。

---

## TASK-014: AIレスポンス検証を強化する

### 背景

AI応答はJSON Schemaを指定しているが、フロント側やDB保存前の型検証が十分ではない。

### 対応内容

- 生成クイズの正規化関数を作る。
- `question` が空でないことを検証する。
- `options` が4つの非空文字列であることを検証する。
- `correctOptionIndex` が0〜3の整数であることを検証する。
- `explanation` と `category` のデフォルト値を統一する。
- 不正なAI応答をDB保存しない。

### 対象ファイル

- `src/lib/api-utils.ts`
- `src/app/api/generate-quiz/route.ts`
- 必要に応じて `src/lib/quiz-schema.ts`

### 達成条件

- 不正なAI応答が保存されない。
- AI応答の型とDB保存データの型が一致する。

---

# P2: 保守性・品質向上

## TASK-015: 未使用または重複しているAI APIルートを整理する

### 背景

`extract-keywords-summary` が実質的な中心APIである一方、`extract-keywords` も存在する。用途が重複しており、保守コストが増えている。

### 対応内容

- `extract-keywords` が使われているか確認する。
- 未使用なら削除する。
- 使用するなら責務をREADMEまたはdocsに明記する。
- 共通処理を抽出する。

### 対象ファイル

- `src/app/api/extract-keywords/route.ts`
- `src/app/api/extract-keywords-summary/route.ts`
- `src/lib/api-utils.ts`

### 達成条件

- APIルートの責務が明確である。
- 未使用APIが残っていない。

---

## TASK-016: `@google/genai` と `@google/generative-ai` の重複依存を整理する

### 背景

Googleの生成AI関連パッケージが2種類入っている。実装上は `@google/genai` を使っているため、未使用依存がある可能性が高い。

### 対応内容

- `@google/generative-ai` の使用有無を確認する。
- 未使用なら削除する。
- READMEの技術スタック表記を実装に合わせる。
- lockfileを更新する。

### 対象ファイル

- `package.json`
- `package-lock.json`
- `README.md`

### 達成条件

- 不要なAI SDK依存が残っていない。
- READMEの記述と実装が一致している。

---

## TASK-017: `tsconfig` の `allowJs` を見直す

### 背景

TypeScript strict構成だが、`allowJs: true` になっている。意図がない場合、型安全性を下げる原因になる。

### 対応内容

- JSファイルを許可する必要があるか確認する。
- 不要なら `allowJs: false` にする。
- configファイル等の扱いに問題がないか確認する。

### 対象ファイル

- `tsconfig.json`

### 達成条件

- TypeScriptプロジェクトとしての型チェック方針が明確である。
- 不要なJS許可がない。

---

## TASK-018: ESLint / typecheck / build scriptsを整理する

### 背景

`lint` は存在するが、Next.js / ESLint の現行構成に対して適切に動作するか確認が必要。

### 対応内容

- `npm run lint` が動作するか確認する。
- 必要なら `next lint` から `eslint .` へ変更する。
- `typecheck` を `tsc --noEmit` として追加する。
- `check` を `typecheck + lint + build` にする。

### 対象ファイル

- `package.json`
- `eslint.config.mjs`

### 達成条件

- ローカルで `npm run check` だけで基本品質確認ができる。

---

## TASK-019: DBマイグレーション方針を明確化する

### 背景

DexieのDB versionは定義されているが、今後のschema変更や既存データ修復の方針が明確でない。

特に `options` 型破綻によって、既存DBに壊れた選択肢データが入っている可能性がある。

### 対応内容

- DB version履歴をコメントで明確化する。
- 将来のmigration方針を整理する。
- 壊れた `options` データの修復可否を検討する。
- 必要ならDB修復関数を追加する。

### 対象ファイル

- `src/lib/db.ts`

### 達成条件

- schema変更時の方針が分かる。
- 既存データ破損への対応方針が明確である。

---

## TASK-020: Date型の保存・復元方針を整理する

### 背景

IndexedDBには `Date` オブジェクトをそのまま保存している。一方、export/importでは文字列化が必要になる。

### 対応内容

- IndexedDB内では `Date` を使うのか、ISO stringに寄せるのか方針を決める。
- import/export時の変換を明確化する。
- 表示系ユーティリティでDate/stringの揺れに強くする。

### 対象ファイル

- `src/lib/db.ts`
- `src/lib/utils.ts`
- `src/lib/quiz-export-import.ts`

### 達成条件

- 日付表示・保存・import/exportで型揺れが原因のバグが起きにくい。

---

## TASK-021: IndexedDB容量超過への対策を追加する

### 背景

`FileItem` はBlobをIndexedDBに保存する。PDFや画像を大量保存するとブラウザの容量制限に当たる可能性がある。

### 対応内容

- ファイルサイズ上限を設定する。
- 保存済みファイルの合計容量を表示する。
- 容量超過時のエラーを分かりやすくする。
- 必要ならBlob保存を任意にする。

### 対象ファイル

- `src/components/file-upload.tsx`
- `src/app/files/page.tsx`
- `src/lib/db.ts`

### 達成条件

- 大量ファイル保存時の失敗がユーザーに分かる。
- ブラウザ保存容量の制約がUI上で把握できる。

---

## TASK-022: ファイル削除後の関連クイズ表示を改善する

### 背景

ファイル削除時、関連クイズは削除しない設計になっている。この方針自体は妥当だが、元ファイルが削除済みであることが一覧で分かりにくい。

### 対応内容

- 元ファイルが存在しないクイズに「元ファイル削除済み」表示を追加する。
- READMEにファイル削除とクイズ保持の関係を明記する。
- ファイル削除確認ダイアログの説明を必要に応じて補強する。

### 対象ファイル

- `README.md`
- `src/app/quizzes/page.tsx`
- `src/app/files/page.tsx`

### 達成条件

- ファイル削除後もクイズが残る理由がユーザーに伝わる。
- 元ファイルなしクイズがUI上で区別できる。

---

## TASK-023: インポート時の重複検知を追加する

### 背景

JSONインポートは選択クイズをそのままDBへ追加する。同じJSONを複数回インポートすると重複クイズが増える。

### 対応内容

- `question + options + correctOptionIndex` などで重複判定する。
- 重複時の扱いを選べるようにする。
  - スキップ
  - そのまま追加
  - 将来的には上書き
- インポート結果に追加数・スキップ数を表示する。

### 対象ファイル

- `src/components/quiz-import-dialog.tsx`
- `src/lib/quiz-export-import.ts`

### 達成条件

- 同じJSONを再インポートしても、意図しない重複を避けられる。
- インポート結果がユーザーに明確に伝わる。

---

## TASK-024: 単一作成画面と複数作成画面の重複実装を整理する

### 背景

`create/page.tsx` と `create-multi/page.tsx` は、生成オプション、カテゴリ選択、編集、保存など多くの処理が重複している。

### 対応内容

- 生成オプションフォームを共通コンポーネント化する。
- 生成結果レビュー/編集UIを共通コンポーネント化する。
- 保存用変換関数を共通化する。
- 単一/複数の差分はデータ取得・生成配分に限定する。

### 対象ファイル

- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`
- `src/components/*`
- `src/lib/*`

### 達成条件

- 同じバグ修正を2箇所に入れる必要が減る。
- 生成・編集・保存ロジックが読みやすくなる。

---

## TASK-025: セッション・結果の整合性チェックを強化する

### 背景

空セッション削除関数は存在するが、どこで実行するか、途中離脱をどう扱うかが明確でない。

### 対応内容

- 未完了セッションの扱いを仕様化する。
- アプリ起動時または履歴画面表示時にcleanupするか決める。
- `results.length` と `session.totalQuestions` の不一致を検出する。
- 履歴画面で不完全セッションを表示しない、または明示する。

### 対象ファイル

- `src/lib/db.ts`
- `src/app/play/page.tsx`
- `src/app/play/history/page.tsx`
- `src/app/results/page.tsx`

### 達成条件

- 途中離脱や不完全セッションで履歴・統計が壊れにくい。

---

# P3: UX・拡張改善

## TASK-026: 複数ファイルアップロードに対応する

### 背景

現状、ファイル選択・ドロップ時は最初の1ファイルのみ処理している。

### 対応内容

- 複数ファイル選択を許可する。
- 複数ファイルの逐次処理を実装する。
- 成功・失敗をファイル単位で表示する。
- 進捗表示をファイル単位にする。

### 対象ファイル

- `src/components/file-upload.tsx`
- `src/app/files/page.tsx`

### 達成条件

- 複数ファイルを一括で登録できる。
- 一部失敗時も成功分は保存され、失敗理由が分かる。

---

## TASK-027: 進捗表示をステップベースに改善する

### 背景

現在の進捗は固定値で更新しており、実際の処理時間とは必ずしも一致しない。

### 対応内容

- 「ファイル読込中」「AI解析中」「保存中」のようなステップ表示にする。
- パーセント表示に過度に依存しない。
- 長時間処理時の再試行・キャンセル導線を検討する。

### 対象ファイル

- `src/components/file-upload.tsx`
- `src/components/url-content-fetcher.tsx`
- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`

### 達成条件

- ユーザーが現在何を待っているか分かる。

---

## TASK-028: AI生成クイズの保存前品質チェックを追加する

### 背景

AI生成クイズには、選択肢重複、曖昧な正解、短すぎる問題文、解説不足などが発生しうる。

### 対応内容

- 保存前に以下を警告する。
  - 空の問題文
  - 空の選択肢
  - 重複選択肢
  - 解説なし
  - 正解インデックス不正
- 警告ありでも保存するか、保存不可にするか仕様を決める。

### 対象ファイル

- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`
- 必要に応じて共通コンポーネント

### 達成条件

- 明らかに壊れたクイズを保存しにくくなる。

---

## TASK-029: クイズ一覧に一括操作を追加する

### 対応内容

- 複数選択削除
- 複数選択エクスポート
- カテゴリ一括変更
- 重複クイズ検出
- 未分類クイズフィルタ

### 対象ファイル

- `src/app/quizzes/page.tsx`
- `src/components/quiz-export-dialog.tsx`

### 達成条件

- クイズ数が増えても管理しやすい。

---

## TASK-030: 学習履歴・分析機能を強化する

### 対応内容

- カテゴリ別正答率を表示する。
- 間違えた問題だけ再挑戦できるようにする。
- 苦手カテゴリを表示する。
- 最近間違えた問題を一覧化する。
- 履歴画面とホーム画面の統計を整合させる。

### 対象ファイル

- `src/app/play/page.tsx`
- `src/app/play/history/page.tsx`
- `src/app/results/page.tsx`
- `src/components/quiz-history-chart.tsx`

### 達成条件

- 単に解くだけでなく、復習に使える学習アプリになる。

---

## TASK-031: PWAのオフライン仕様を明確化する

### 背景

PWA設定はあるが、AI解析・クイズ生成はオフラインでは動作しない。

### 対応内容

- オフライン時は既存クイズの学習のみ可能とする。
- AI解析・クイズ生成ボタンを無効化する。
- オフライン状態の表示を追加する。
- Service Workerのキャッシュ対象を見直す。

### 対象ファイル

- `next.config.mjs`
- `src/app/files/page.tsx`
- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`
- `src/app/play/page.tsx`

### 達成条件

- オフラインでできること、できないことが明確である。

---

## TASK-032: アクセシビリティを改善する

### 対応内容

- クイズ選択肢ボタンに適切なaria属性を付ける。
- 正誤結果をスクリーンリーダーに通知する。
- キーボード操作で回答できるようにする。
- Dialog / Popover / Command のフォーカス管理を確認する。
- 色だけに依存しない正誤表現にする。

### 対象ファイル

- `src/app/play/session/page.tsx`
- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`
- `src/components/*`

### 達成条件

- キーボード・スクリーンリーダー利用者でも主要機能が使える。

---

## TASK-033: モバイル表示の回帰確認を追加する

### 対応内容

- ファイル管理画面
- クイズ一覧画面
- クイズ作成画面
- クイズプレイ画面
- 結果画面
- インポート/エクスポートダイアログ

これらについて、モバイルviewportで表示崩れを確認する。

### 対象ファイル

- 必要に応じて各画面
- 将来的には Playwright E2E

### 達成条件

- 主要画面がスマホ幅で破綻しない。

---

# ドキュメント整備タスク

## TASK-034: READMEを実装実態に合わせて更新する

### 対応内容

- 現在の機能一覧を正確化する。
- 「ローカル保存」と「外部AI解析」を分けて説明する。
- PDFはGeminiに直接渡す方針として説明する。
- URL取得にJina Readerを使うことを明記する。
- セットアップに `.env.example` を参照する記述を追加する。
- Node.jsバージョンを明記する。
- PWAの制約を記載する。

### 対象ファイル

- `README.md`

### 達成条件

- READMEと実装の食い違いが解消される。

---

## TASK-035: `.env.example` を追加する

### 対応内容

以下のような環境変数サンプルを追加する。

```env
GEMINI_API_KEY=
FRONTEND_URL=http://localhost:3000
ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:3000
GEMINI_PRIMARY_MODEL=gemini-2.0-flash
GEMINI_FALLBACK_MODEL=
GEMINI_ENABLE_THINKING=false
GEMINI_THINKING_BUDGET=0
```

### 対象ファイル

- `.env.example`
- `README.md`

### 達成条件

- 初期セットアップ時に必要な環境変数が分かる。

---

## TASK-036: アーキテクチャドキュメントを追加する

### 対応内容

- 画面構成
- DB設計
- AI API処理
- データフロー
- 外部送信されるデータ
- インポート/エクスポート仕様
- PWA仕様

### 推奨ファイル

- `docs/architecture.md`
- `docs/data-model.md`
- `docs/security-and-privacy.md`

### 達成条件

- 新規開発者が全体設計を理解しやすくなる。

---

# テスト整備タスク

## TASK-037: ユニットテストを追加する

### 対象候補

- `validateImportedJson`
- `convertImportedQuizToDbFormat`
- `generateExportJson`
- クイズレスポンス正規化関数
- 複数ファイル問題数配分ロジック
- `/api/document` のパス検証関数

### 達成条件

- 重要な純粋関数の退行を検出できる。

---

## TASK-038: APIテストを追加する

### 対象候補

- `/api/generate-quiz`
- `/api/extract-keywords-summary`
- `/api/document`

### テスト観点

- 正常系
- 入力不足
- 不正JSON
- AI応答不正
- モデル失敗時のフォールバック
- CORS OPTIONS
- 不正なdocument fileName

### 達成条件

- APIルートの主要な失敗条件を検出できる。

---

## TASK-039: Playwright E2Eを追加する

### 対象シナリオ

- ホーム表示
- テキストファイルアップロード
- AI解析モック
- クイズ生成モック
- クイズ保存
- クイズ一覧表示
- クイズプレイ
- 結果表示
- エクスポート
- インポート

### 達成条件

- 主要導線がブラウザ上で壊れていないことを確認できる。

---

## TASK-040: 回帰テスト用fixtureを追加する

### 対応内容

- サンプルテキスト
- サンプルJSONエクスポート
- 小さなPDF
- サンプル画像
- モックGeminiレスポンス

### 推奨ディレクトリ

- `tests/fixtures/`

### 達成条件

- テストが外部APIや手動準備に依存しない。

---

# GitHub運用タスク

## TASK-041: Dependabot auto-merge の前提条件を確認する

### 背景

Dependabot auto-merge workflow では `DEPENDABOT_MERGE_TOKEN` を利用している。secret未設定の場合は動作しない。

### 対応内容

- `DEPENDABOT_MERGE_TOKEN` の必要性をREADMEまたはdocsに記載する。
- CI成功をauto-mergeの前提にする。
- major updateは自動マージしない方針を維持する。

### 対象ファイル

- `.github/workflows/dependabot-automerge.yml`
- 必要に応じて `README.md` または `docs/maintenance.md`

### 達成条件

- Dependabot自動マージの条件と前提が明確である。

---

## TASK-042: PRテンプレートを追加する

### 対応内容

PR作成時に以下を確認できるテンプレートを追加する。

- 変更概要
- 影響範囲
- 動作確認
- テスト結果
- セキュリティ/プライバシー影響
- スクリーンショット

### 対象ファイル

- `.github/pull_request_template.md`

### 達成条件

- 変更内容と確認内容がPR上で追いやすくなる。

---

# 最優先で着手すべきタスク

まず着手すべき順番は以下。

1. TASK-001: React / React DOM / 型定義のバージョン不整合を修正する
2. TASK-002: `GenerateQuiz.options` の型破綻を修正する
3. TASK-003: `/api/document` のパストラバーサル対策を実装する
4. TASK-004: 基本品質ゲートを追加する
5. TASK-005: 本番ログにAI応答本文を出さないようにする
6. TASK-006: PDF処理方針を「PDF本体をAIへ直接渡す」に統一する

この順番を崩してUX改善や機能追加へ進むと、後からデータ破損・型破綻・CI未整備に引き戻される可能性が高い。
