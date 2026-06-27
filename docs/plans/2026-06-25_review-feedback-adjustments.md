# PRレビュー指摘への補正事項

作成日: 2026-06-25
対象PR: #27
関連ドキュメント:

- `docs/2026-06-25_improvement-tasks.md`
- `docs/2026-06-25_priority-implementation-steps.md`

## 目的

このドキュメントは、PRレビューで指摘された内容のうち、Vercelデプロイ失敗を除くものについて、後続実装時に採用すべき補正事項を明確にするための追補です。

既存の改善タスク一覧に含まれる値や方針とこの追補が異なる場合は、**この追補の内容を優先**します。

---

## 1. PDFファイルの初期上限は 20MB ではなく 14MB とする

### 背景

`inlineData` でPDFをGemini APIへ直接送信する場合、PDF本体をBase64化してpayloadに含める。

Base64化によりデータサイズは約4/3倍に増加するため、元PDFを20MBまで許容すると、実際のリクエストpayloadがGemini APIのインライン送信上限である20MBを超える可能性がある。

14MBのPDFはBase64化後に約18.7MB相当となり、その他のリクエストメタデータを考慮しても20MB上限に対して比較的安全な余白を確保しやすい。

### 補正方針

TASK-015の初期上限案では、PDFファイルの上限を以下に補正する。

| 入力種別 | 初期上限案 |
| --- | ---: |
| PDFファイル | 14MB |

### 後続実装時の扱い

- `inlineData` で直接送信するPDFの初期上限は14MBとする。
- `src/lib/limits.ts` などに `MAX_INLINE_PDF_FILE_SIZE_BYTES` として定義する。
- 14MBを超えるPDFを扱う必要が出た場合は、別タスクとしてGemini Files APIの利用を検討する。
- UIには、上限超過時に分かりやすいエラーを表示する。

---

## 2. CORSの許可Originは `FRONTEND_URL` に統一する

### 背景

`.env.example` の例で、以下の2つを併記すると、どちらがCORSの許可Originとして使われるべきか曖昧になる。

```env
FRONTEND_URL=http://localhost:3000
ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:3000
```

同じ意味の環境変数が複数あると、設定値の不一致により環境差分の不具合が起きやすい。

### 補正方針

CORSの許可Originは、原則として `FRONTEND_URL` に統一する。

`.env.example` では以下の形を採用する。

```env
FRONTEND_URL=http://localhost:3000
```

`ACCESS_CONTROL_ALLOW_ORIGIN` は追加しない。

### 後続実装時の扱い

- TASK-014のCORS共通化では、許可Originの参照元を `FRONTEND_URL` に寄せる。
- TASK-036の `.env.example` でも `ACCESS_CONTROL_ALLOW_ORIGIN` は記載しない。
- 既存APIルートに `ACCESS_CONTROL_ALLOW_ORIGIN` への参照やフォールバックが残っている場合は削除し、`FRONTEND_URL` のみを参照するように修正する。
- 特に `src/app/api/document/route.ts` にCORS許可Originの取得処理がある場合は、ドキュメント方針と一致するように見直す。
- 複数Origin対応が必要になった場合は、別途 `ALLOWED_ORIGINS` のような複数指定用変数を検討する。

---

## 3. 共通確認コマンドは `npm ci` を使う

### 背景

共通確認コマンドに `npm install` を含めると、検証のたびに `package-lock.json` が更新される可能性がある。

ドキュメント上の共通確認手順では、再現性を優先して `npm ci` を使う。

### 補正方針

共通確認コマンドは以下とする。

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run check
```

### 後続実装時の扱い

- 通常の検証では `npm ci` を使う。
- `npm install` は、依存関係を変更して `package-lock.json` を更新する必要があるタスクに限定する。
- 例: TASK-001、TASK-006、TASK-018、TASK-038など。

---

## 4. `/api/document` のパス検証では物理パス確認も行う

### 背景

`path.resolve` による文字列上の検証だけでは、将来シンボリックリンクが追加された場合に、意図しないディレクトリ外参照を見落とす可能性がある。

### 補正方針

TASK-003の実装では、形式検証と実ファイル解決を分ける。

- ファイル名の形式検証は、ユニットテスト可能な純粋関数として切り出す。
- 実ファイル解決時は、以下の順序で処理する。
  1. ファイル名の形式検証を行う。
  2. `path.resolve` などで候補パスを組み立てる。
  3. ファイルの存在を確認する。存在しない場合は404を返す。
  4. 存在する場合のみ、`fs.realpath` または同等の方法で物理パスを取得する。
  5. 取得した物理パスが、正規化済みの `public/documents` ベースパス配下であることを確認する。
  6. 物理パスがベース外に出る場合は400を返す。

### 後続実装時の扱い

- 不正なファイル名は400を返す。
- 許可形式だがファイルが存在しない場合は404を返す。
- 物理パス確認で `public/documents` 配下に収まらない場合は400扱いにする。
- 実際のユニットテスト追加は、テスト基盤導入後のTASK-039で扱う。

---

## 5. PDF直接送信時のプライバシー表示を単独で分かるようにする

### 背景

TASK-006ではTASK-007のプライバシー表示と文言を揃えると記載しているが、実装手順書単体で読むと、何を表示すべきかが追いにくい。

### 補正方針

PDF直接送信時は、以下の趣旨をREADMEとUIに明記する。

> PDFはAI解析時に外部AI APIへ直接送信されます。機密情報、個人情報、社外秘資料を含むPDFは投入しないでください。

### 後続実装時の扱い

- ファイルアップロード画面に外部送信の注意を表示する。
- READMEにも同じ趣旨の注意を記載する。
- 「ローカルだけでPDF解析する」と誤解される表現を残さない。

---

## 6. `extractTextFromPDF` の参照残存を確認する

### 背景

PDF.jsベースの抽出処理を削除する場合、実装ファイルだけでなくコメントアウト済みimportやREADME上の古い記述も残さない必要がある。

### 補正方針

TASK-006の確認方法に、以下を追加する。

- `extractTextFromPDF` の参照が残っていないことを検索で確認する。
- `pdfjs-dist` が `package.json` / `package-lock.json` に残っていないことを確認する。削除時は `npm install` で `package-lock.json` を更新する。
- `src/lib/pdf-utils.ts` など、未使用のPDF抽出ソースファイルが残っていないことを確認する。
- READMEとUIが、PDF本体をGemini APIへ直接送信する説明になっていることを確認する。

---

## 対応対象外

Vercelのデプロイ失敗は、このPRでは対応対象外とする。

このPRはドキュメント追加のみであり、Vercelの失敗は既存ビルド設定または環境設定に起因する可能性があるため、別途確認する。
