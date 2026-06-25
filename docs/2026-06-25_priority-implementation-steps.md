# 最優先タスク 実装手順

作成日: 2026-06-25
対象リポジトリ: `sella-roum/local-learning-quiz-generator`
関連ドキュメント: `docs/2026-06-25_improvement-tasks.md`

## 目的

このドキュメントは、改善タスク一覧のうち、最初に着手すべき7タスクを実装者・AIエージェントへ渡せる粒度まで落とし込むための手順書です。

全44タスクを同じ粒度で詳細化するとドキュメントが肥大化し、実装の優先順位がぼやけます。そのため、まずはデータ破損・ビルド不能・セキュリティリスクに直結するタスクだけを対象にします。

## 対象タスク

1. TASK-001: React / React DOM / 型定義のバージョン不整合を修正する
2. TASK-002: `GenerateQuiz.options` の型破綻を修正し、最低限の正規化を入れる
3. TASK-016: AIレスポンス検証を強化する
4. TASK-003: `/api/document` のパストラバーサル対策を実装する
5. TASK-004: 基本品質ゲートとnpm scriptsを整備する
6. TASK-005: 本番ログにAI応答本文を出さないようにする
7. TASK-006: PDF処理方針を「PDF本体をAIへ直接渡す」に統一する

---

## 共通方針

### 実装順の考え方

最初に依存関係と型破綻を直し、その後にAIレスポンス検証、セキュリティ修正、品質ゲート、ログ抑制、PDF方針統一へ進みます。

この順番を崩すと、後続タスクの確認中に型エラーやデータ破損が混ざり、原因切り分けが難しくなります。

### 実装時の禁止事項

- 最優先タスクと無関係なUI刷新を行わない。
- クイズ生成プロンプトを大幅に変えない。
- PDF.jsによるローカルPDF抽出を復活させない。
- 型エラー回避のために `any` や型アサーションを安易に増やさない。
- `skipLibCheck` や `strict` などの型安全性を下げる方向で解決しない。
- 既存データ形式を変える場合は、DBマイグレーションまたは互換処理を検討する。

### 共通確認コマンド

後続で品質ゲートが整備された後は、原則として以下を確認します。

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run check
```

`typecheck` や `check` が未追加の段階では、TASK-004で追加してから実行します。

---

# TASK-001: React / React DOM / 型定義のバージョン不整合を修正する

## 目的

React関連の実装依存と型定義のmajor version不整合を解消し、ビルド・Hydration・型チェックの不安定要因を取り除きます。

## 対象ファイル

- `package.json`
- `package-lock.json`

## 実装手順

1. `package.json` の以下を確認する。
   - `react`
   - `react-dom`
   - `@types/react`
   - `@types/react-dom`
2. `react` と `react-dom` のmajor versionを揃える。
3. `@types/react` と `@types/react-dom` のmajor versionを揃える。
4. Next.js 16系で想定されるReact系バージョンと矛盾しない組み合わせにする。
5. `package-lock.json` を再生成する。
6. 依存更新後に `npm install` を実行する。
7. `npm run build` を実行する。
8. TASK-004対応後であれば、`npm run typecheck` と `npm run check` も実行する。

## 確認方法

- `npm install` が成功する。
- `npm run build` が成功する。
- React / Hydration関連の明確な警告が出ない。
- React関連の依存と型定義のmajor versionが揃っている。

## 注意点

- `react` だけ、または `react-dom` だけを単独で上げない。
- 型定義だけ別majorにしない。
- `package-lock.json` 更新を忘れない。
- 依存解決のために無関係なパッケージを大量更新しない。

## 非対応範囲

- UI変更は行わない。
- コンポーネントリファクタは行わない。
- Reactバージョン変更に直接関係しない依存更新は行わない。

## 完了条件

- React関連依存のmajor version不整合がない。
- lockfileが更新されている。
- ビルドが通る。

---

# TASK-002: `GenerateQuiz.options` の型破綻を修正し、最低限の正規化を入れる

## 目的

AI生成クイズの選択肢データ形式を `string[]` に統一し、編集済みクイズの選択肢が `[object Object]` になるデータ破損を防ぎます。

## 対象ファイル

- `src/lib/api-utils.ts`
- `src/app/quizzes/create/page.tsx`
- `src/app/quizzes/create-multi/page.tsx`
- `src/lib/db.ts`
- 必要に応じて `src/lib/quiz-schema.ts`

## 実装手順

1. `src/lib/api-utils.ts` の `GenerateQuiz` 型を確認する。
2. `GenerateQuiz.options` を `string[]` に統一する。
3. `QuizOption` 型が不要であれば削除する。
4. `QuizOption` 型を残す場合は、DB保存用ではなくUI一時状態用など用途を明確に分離する。
5. `src/app/quizzes/create/page.tsx` で、編集時に `options` をオブジェクト配列へ変換している箇所を修正する。
6. `src/app/quizzes/create-multi/page.tsx` でも同じ修正を行う。
7. DB保存時に `opt.toString()` を使っている箇所を削除する。
8. AIレスポンスからDB保存形式へ変換する正規化関数を追加する。
9. 正規化関数では最低限以下を検証する。
   - `options` が配列であること。
   - `options.length === 4` であること。
   - 各選択肢が非空文字列であること。
   - `correctOptionIndex` が0〜3の整数であること。
10. 不正な生成結果は保存対象から除外する。
11. 不正データ除外時は、ユーザーが原因を理解できるエラーまたは警告を表示する。

## 確認方法

- クイズ生成後、未編集のまま保存できる。
- クイズ生成後、選択肢を編集して保存できる。
- 保存後の一覧で選択肢が `[object Object]` にならない。
- プレイ画面で選択肢が正常表示される。
- 結果画面まで正常に進める。
- 不正なAIレスポンスを保存しない。
- `npm run build` が成功する。
- TASK-004対応後は `npm run typecheck` も成功する。

## 注意点

- `options` の内部表現を画面ごとに変えない。
- DB保存形式は `string[]` に統一する。
- UI表示用の一時状態とDB保存形式を混同しない。
- 型エラーを消すために `as any` を増やさない。
- 既存DBに壊れた `[object Object]` データが入っている可能性は、TASK-020のDBマイグレーション方針で扱う。

## 非対応範囲

- クイズ生成プロンプトの大幅変更は行わない。
- 学習履歴や分析機能には触れない。
- DBマイグレーションの本格対応はこのタスクでは行わない。

## 完了条件

- `GenerateQuiz.options` とDB保存形式が `string[]` に統一されている。
- 編集済みクイズの保存後に `[object Object]` が発生しない。
- 不正な基本形式のクイズが保存されない。

---

# TASK-016: AIレスポンス検証を強化する

## 目的

TASK-002で入れた最低限の正規化を拡張し、AI応答の不正形式や低品質データがDBへ保存されるリスクを下げます。

## 対象ファイル

- `src/lib/api-utils.ts`
- `src/app/api/generate-quiz/route.ts`
- 必要に応じて `src/lib/quiz-schema.ts`

## 実装手順

1. TASK-002で作成した正規化関数を確認する。
2. 正規化関数を拡張し、`question` が非空文字列であることを検証する。
3. `options` が4件の非空文字列であることを再確認する。
4. `correctOptionIndex` が0〜3の整数であることを再確認する。
5. 選択肢の重複を検出する。
6. `explanation` が空の場合のデフォルト値を統一する。
7. `category` が空の場合のデフォルト値を統一する。
8. APIレスポンス段階で検証する項目と、DB保存直前に検証する項目を整理する。
9. 不正データの扱いを統一する。
   - 自動補正できるものは補正する。
   - 保存すると破綻するものは保存拒否する。
   - 判断が微妙なものは警告扱いにする。

## 確認方法

- 空の問題文を保存しない。
- 4件未満または5件以上の選択肢を保存しない。
- 正解インデックス範囲外を保存しない。
- 重複選択肢を検出できる。
- `explanation` と `category` のデフォルト値が一貫している。
- 不正AI応答時にアプリ全体がクラッシュしない。

## 注意点

- 検証を厳しくしすぎて、正常なAI応答まで過剰に落とさない。
- 自動補正する項目と保存拒否する項目を混ぜない。
- UI側とAPI側で検証条件が矛盾しないようにする。
- エラー表示はユーザー向けの文言にする。

## 非対応範囲

- クイズ品質の採点機能は作らない。
- 生成プロンプト改善は別タスクにする。
- 学習効果の分析機能は扱わない。

## 完了条件

- 不正なAI応答がDBに保存されない。
- AI応答の型とDB保存データの型が一致している。
- TASK-002の型破綻修正後も再発しにくい。

---

# TASK-003: `/api/document` のパストラバーサル対策を実装する

## 目的

`/api/document` の `fileName` クエリ経由で、`public/documents` 配下以外のファイルを読めないようにします。

## 対象ファイル

- `src/app/api/document/route.ts`
- 必要に応じて `src/lib/server/document-path.ts`

## 実装手順

1. 現在の `/api/document` の `fileName` 取り扱いを確認する。
2. 許可するMarkdownファイル名の固定リストを作る。
3. 固定リスト方式にしない場合は、`path.resolve` 後に `public/documents` 配下であることを検証する。
4. 以下の入力を拒否する。
   - `../` を含むパス。
   - URLエンコードされた `../`。
   - 絶対パス。
   - 空文字。
   - `.md` 以外の拡張子。
   - パス区切り文字を含むファイル名。
5. 不正入力は400を返す。
6. 許可形式だがファイルが存在しない場合は404を返す。
7. 正常時のみ許可されたMarkdownを返す。
8. パス検証処理を関数化する。
9. パス検証関数にユニットテストを追加する。

## 確認方法

- `?fileName=../package.json` が400になる。
- `?fileName=%2e%2e%2fpackage.json` が400になる。
- `?fileName=/etc/passwd` 相当の絶対パスが400になる。
- `?fileName=` が400になる。
- `?fileName=test.txt` が400になる。
- 許可されたMarkdownは200で返る。
- 存在しないが形式は正しいMarkdownは404になる。
- パス検証のユニットテストが成功する。

## 注意点

- クエリ文字列をそのまま `path.join` に渡さない。
- 拡張子チェックだけで済ませない。
- `decodeURIComponent` 後の値も検証する。
- Windows / POSIX のパス区切り差分も考慮する。

## 非対応範囲

- ドキュメント管理UIの追加は行わない。
- Markdownレンダリング仕様の変更は行わない。
- 認証機能の追加は行わない。

## 完了条件

- `public/documents` 配下以外のファイルを読めない。
- 不正入力とファイル不存在のレスポンスが区別されている。
- パス検証の退行をテストで検出できる。

---

# TASK-004: 基本品質ゲートとnpm scriptsを整備する

## 目的

型エラー、lintエラー、ビルド失敗をPR段階で検出できるようにし、継続開発の最低限の品質ゲートを整備します。

## 対象ファイル

- `package.json`
- `eslint.config.mjs`
- `.github/workflows/ci.yml`

## 実装手順

1. `package.json` の既存scriptsを確認する。
2. `typecheck` scriptを追加する。
   - 推奨: `tsc --noEmit`
3. `check` scriptを追加する。
   - 推奨: `npm run typecheck && npm run lint && npm run build`
4. `npm run lint` が現在のNext.js / ESLint Flat Config構成で動くか確認する。
5. `next lint` が使えない、または現行構成に合わない場合は `eslint .` ベースへ修正する。
6. `.github/workflows/ci.yml` を追加する。
7. CIでは以下を実行する。
   - `npm ci`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
8. push / pull_request の両方でCIが動くようにする。
9. CI失敗時にどのステップで落ちたか分かるようにjob/step名を付ける。

## 確認方法

- `npm run typecheck` が成功する。
- `npm run lint` が成功する。
- `npm run build` が成功する。
- `npm run check` が成功する。
- GitHub ActionsのCIがpush / pull_requestで起動する。
- CIの各ステップが分かりやすい名前で表示される。

## 注意点

- テスト基盤導入前に無理に `npm test` をCIへ入れない。
- 型エラー回避のために `strict` を弱めない。
- lintエラー回避のために対象ファイルを過剰に除外しない。
- CIはDependabot auto-mergeの前提にもなるため、安定性を優先する。

## 非対応範囲

- ユニットテストやE2Eの追加はTASK-038以降で扱う。
- カバレッジ計測はこのタスクでは扱わない。
- デプロイワークフローは追加しない。

## 完了条件

- ローカルで `npm run check` が使える。
- CIでtypecheck / lint / buildが実行される。
- mainへ入れる前に基本的な破壊を検出できる。

---

# TASK-005: 本番ログにAI応答本文を出さないようにする

## 目的

Gemini API応答、ファイル本文、生成クイズ本文などの機密性が高い可能性のある情報が本番ログに残らないようにします。

## 対象ファイル

- `src/app/api/generate-quiz/route.ts`
- `src/app/api/extract-keywords-summary/route.ts`
- `src/app/api/extract-keywords/route.ts`
- 必要に応じて `src/lib/server/logger.ts`

## 実装手順

1. AI応答本文を `console.log` している箇所を洗い出す。
2. ファイル本文、抽出本文、生成クイズ全文、Geminiのraw responseをログ出力している箇所を洗い出す。
3. production環境では本文を出さない条件分岐を追加する。
4. 開発環境でも、必要以上にファイル本文や生成クイズ全文を出さない。
5. エラー時は以下のようなメタ情報に限定する。
   - エラー種別。
   - HTTPステータス。
   - 使用モデル名。
   - 入力種別。
   - request id 相当の識別子があればその値。
6. `console.error(error)` で外部APIレスポンス全文が出ないか確認する。
7. 必要ならログ用ヘルパーを作る。

## 確認方法

- `NODE_ENV=production` でAI応答全文がログに出ない。
- エラー時にファイル本文や生成クイズ本文がログに出ない。
- 開発時の最低限の原因調査は可能。
- `generate-quiz` / `extract-keywords-summary` / `extract-keywords` でログ方針が揃っている。

## 注意点

- Geminiレスポンス本文をそのままログに出さない。
- 例外オブジェクトに本文が含まれる場合があるため、丸ごと出力しない。
- ログ抑制とエラーの握りつぶしを混同しない。
- ユーザー向けエラー表示は残す。

## 非対応範囲

- 外部ログ基盤の導入は行わない。
- 監査ログや管理画面は作らない。
- 個人情報検出機能は作らない。

## 完了条件

- production環境でAI応答全文・ファイル本文・生成クイズ全文がログに出ない。
- API失敗時でも安全なメタ情報だけで原因調査できる。

---

# TASK-006: PDF処理方針を「PDF本体をAIへ直接渡す」に統一する

## 目的

PDF処理をPDF.jsによるローカルテキスト抽出ではなく、PDFファイル本体をGemini APIへ直接渡す方針に統一します。

## 対象ファイル

- `src/components/file-upload.tsx`
- `src/lib/pdf-utils.ts`
- `package.json`
- `package-lock.json`
- `README.md`
- 必要に応じて `src/app/files/page.tsx`
- 必要に応じて `src/app/api/generate-quiz/route.ts`
- 必要に応じて `src/app/api/extract-keywords-summary/route.ts`

## 実装手順

1. `src/components/file-upload.tsx` のPDF処理を確認する。
2. PDF.jsでテキスト抽出する処理、import跡、コメントアウトを削除する。
3. `src/lib/pdf-utils.ts` を削除する。
4. `pdfjs-dist` を `package.json` から削除する。
5. `package-lock.json` を更新する。
6. PDFを `ArrayBuffer` として読み込む処理を維持する。
7. PDFはBase64化し、`application/pdf` の `inlineData` としてGeminiへ渡すことを確認する。
8. API側でPDF inlineDataを受け取る処理が必要な場合は、`generate-quiz` / `extract-keywords-summary` 側も確認する。
9. READMEのPDF説明をGemini直接送信前提に修正する。
10. UIに「PDFはAIに直接送信されます」と表示する。
11. TASK-007の外部送信に関するプライバシー表示と文言を揃える。

## 確認方法

- PDFアップロード後、AI解析が動く。
- PDFからクイズ生成できる。
- `pdfjs-dist` が依存に残っていない。
- `src/lib/pdf-utils.ts` が残っていない。
- `file-upload.tsx` にPDF.js復活を示すコメントアウトが残っていない。
- READMEとUIでPDF直接送信が説明されている。
- `npm run build` が成功する。

## 注意点

- PDF.jsによるローカル抽出を復活させない。
- 「ローカルだけでPDF解析する」と誤解される表現を残さない。
- PDF本文は外部APIに送られるため、プライバシー表示と必ず整合させる。
- OCR機能やPDF分割機能に話を広げない。

## 非対応範囲

- PDFのローカルテキスト抽出機能は実装しない。
- OCR機能は実装しない。
- PDFプレビュー機能は実装しない。
- PDFの分割アップロードやページ指定解析は扱わない。

## 完了条件

- PDF処理仕様と実装が一致している。
- PDF.js関連コードと依存が残っていない。
- PDFがGemini APIへ直接送信されることがREADMEとUIで明示されている。
- PDFアップロードからAI解析・クイズ生成まで動作する。
