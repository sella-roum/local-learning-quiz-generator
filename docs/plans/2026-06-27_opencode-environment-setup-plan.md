# OpenCode 環境整備 実行プラン

作成日: 2026-06-27
対象リポジトリ: `sella-roum/local-learning-quiz-generator`
目的: OpenCode / AIエージェントが今後このリポジトリを安全に実装・検証・レビューできるようにするための環境整備計画

## 参照ドキュメント

本プランを実行するAIエージェントは、必ず以下のドキュメントを先に読むこと。

- `docs/plans/2026-06-25_improvement-tasks.md`
- `docs/plans/2026-06-25_priority-implementation-steps.md`
- `docs/plans/2026-06-25_review-feedback-adjustments.md`
- `README.md`
- `package.json`
- `tsconfig.json`

特に、`docs/plans/2026-06-25_review-feedback-adjustments.md` は既存計画への追補であり、既存計画と矛盾する場合は追補内容を優先する。

## 背景

このリポジトリには、データ破損、ビルド不能、セキュリティリスク、外部AI API送信時のプライバシー説明不足につながる改善タスクが存在する。

代表例は以下である。

- React / React DOM / 型定義のmajor version不整合
- `GenerateQuiz.options` の型破綻
- `/api/document` のパストラバーサル対策不足
- `typecheck` / `check` / CI の不足
- 本番ログへのAI応答本文出力リスク
- PDF処理方針とREADME/実装の不整合
- CORS許可Originの環境変数方針の揺れ
- GeminiモデルIDやthinkingBudgetの直書き

これらをAIエージェントに直接実装させる前に、OpenCode用の指示、役割分担、検証コマンド、品質ゲートを整備する。

## このプランのゴール

OpenCodeを使う実装者またはAIエージェントが、以下を迷わず実行できる状態にする。

1. どの計画ファイルを読むべきか分かる。
2. どのタスクから着手すべきか分かる。
3. やってはいけない変更が明文化されている。
4. 実装、レビュー、セキュリティ確認の役割が分かれている。
5. 実装後に実行すべき品質ゲートが決まっている。
6. `.env.local` やAPIキーなどの秘密情報をコミットしない。
7. PDF直接送信、CORS、ログ抑制などのプライバシー・セキュリティ観点を毎回確認できる。

## このプランで実装するもの

このプランを実行するPRでは、原則としてOpenCode運用の土台だけを整備する。

### 追加・変更対象

- `opencode.jsonc`
- `AGENTS.md`
- `docs/agents/opencode.md`
- `.opencode/agents/planner.md`
- `.opencode/agents/implementer.md`
- `.opencode/agents/reviewer.md`
- `.opencode/agents/security-privacy-reviewer.md`
- `.opencode/commands/analyze-task.md`
- `.opencode/commands/implement-task.md`
- `.opencode/commands/review-task.md`
- `.opencode/commands/verify.md`
- `.opencode/commands/security-check.md`
- `.github/workflows/ci.yml`
- `.env.example`
- `.gitignore`
- `package.json`
- 必要に応じて `eslint.config.mjs`
- 必要に応じて `README.md`

## このプランでは実装しないもの

以下は、OpenCode環境整備後の別タスクとして扱う。

- TASK-001: React / React DOM / 型定義のバージョン不整合修正
- TASK-002: `GenerateQuiz.options` の型破綻修正
- TASK-003: `/api/document` のパストラバーサル対策実装
- TASK-005: 本番ログ抑制の実装修正
- TASK-006: PDF.js削除とPDF直接送信方針への実装統一
- TASK-011: GeminiモデルIDとthinkingBudgetの環境変数化
- TASK-013: Gemini API呼び出し共通化
- TASK-014: CORS処理共通化
- TASK-015: AI API入力サイズ上限実装
- TASK-016: AIレスポンス検証強化
- UI刷新
- デザイン変更
- DBマイグレーション
- テストケース大量追加

理由: 環境整備PRに実装修正を混ぜると、OpenCode運用基盤の妥当性とアプリケーション修正の妥当性をレビューで切り分けにくくなるため。

## 実装方針

### 1. OpenCode設定を追加する

`opencode.jsonc` を追加する。

必須設定:

- `instructions`
- `permission`
- `share`
- `agent`
- `command`

推奨方針:

- `instructions` に `AGENTS.md` と `docs/agents/**/*.md` を含める。
- `edit` は原則 `ask` にする。
- `bash` は原則 `ask` にする。
- `webfetch` は必要時のみ許可する。
- `share` は `manual` または無効相当の設定にする。
- デフォルトagentは実装者ではなく、まずplannerに寄せる。

設定例は実装時にOpenCodeの現行仕様に合わせて確認すること。古い設定形式を推測で書かない。

### 2. 共通エージェント指示を追加する

`AGENTS.md` を追加する。

記載する内容:

- リポジトリの目的
- 最優先で読むべき計画ファイル
- タスク優先順位
- 実装時の禁止事項
- 変更範囲の制限
- 実装後の検証コマンド
- PR本文に書くべき内容
- 秘密情報の扱い
- PDF/外部API送信の注意
- CORSの方針
- 本番ログ抑制の方針

必ず含める禁止事項:

- 最優先タスクと無関係なUI刷新をしない。
- クイズ生成プロンプトを大幅に変更しない。
- PDF.jsによるローカルPDF抽出を復活させない。
- 型エラー回避のために `any` や型アサーションを安易に増やさない。
- `skipLibCheck` や `strict` など型安全性を下げる方向で解決しない。
- `.env.local`、APIキー、秘密情報をコミットしない。
- `ACCESS_CONTROL_ALLOW_ORIGIN` を新規に追加しない。
- CORS許可Originは `FRONTEND_URL` に寄せる。
- productionログにAI応答全文、ファイル本文、生成クイズ全文を出さない。

### 3. OpenCode専用の詳細指示を追加する

`docs/agents/opencode.md` を追加する。

内容:

- OpenCodeでの作業開始手順
- タスク選定手順
- 実装前チェック
- 実装後チェック
- レビュー観点
- セキュリティ・プライバシー観点
- PR作成時のテンプレート

OpenCodeに対して、以下の実行順を明示する。

1. 参照ドキュメントを読む。
2. 対象TASK番号を特定する。
3. 対象ファイルと非対応範囲を確認する。
4. 変更前に実装方針を短く整理する。
5. 必要最小限の差分で実装する。
6. `npm ci` を基本に検証する。
7. 依存関係を変更したタスクのみ `npm install` でlockfileを更新する。
8. `npm run typecheck`、`npm run lint`、`npm run build`、`npm run check` を実行する。
9. セキュリティ・プライバシー観点を確認する。
10. PR本文に実施内容、確認結果、未対応事項を書く。

### 4. カスタムエージェントを追加する

`.opencode/agents/` 配下に以下を追加する。

#### planner

目的:

- 実装対象タスクの分析
- 参照ドキュメントの整理
- 対象ファイルの特定
- 実装順の提案

制約:

- ファイル編集はしない。
- 実装範囲を勝手に広げない。
- PR分割ではなく、タスク単位で整理する。

#### implementer

目的:

- 指定された1タスクまたは環境整備タスクを実装する。

制約:

- 対象外ファイルを不用意に触らない。
- UI刷新をしない。
- 型安全性を下げない。
- `any` を増やす場合は理由を明記する。
- 実装後に品質ゲートを実行する。

#### reviewer

目的:

- 実装差分が計画に沿っているか確認する。
- 不要な変更、過剰実装、仕様逸脱を検出する。

確認観点:

- 対象TASKの達成条件を満たしているか。
- 非対応範囲に踏み込んでいないか。
- 型・ビルド・lintに問題がないか。
- READMEやdocsとの矛盾が増えていないか。

#### security-privacy-reviewer

目的:

- 外部送信、CORS、ログ、パストラバーサル、秘密情報の観点で確認する。

確認観点:

- PDF/画像/テキストの外部AI API送信がUI/READMEで明示されているか。
- 機密情報、個人情報、社外秘資料を投入しない注意があるか。
- productionログにAI応答全文やファイル本文が出ないか。
- `/api/document` が `public/documents` 配下以外を読めないか。
- CORSが `FRONTEND_URL` 方針に沿っているか。
- `.env.local` やAPIキーがコミット対象になっていないか。

### 5. OpenCodeコマンドを追加する

`.opencode/commands/` 配下に以下を追加する。

#### analyze-task

目的:

- 指定TASKの背景、対象ファイル、対応内容、達成条件、非対応範囲を整理する。

出力項目:

- TASK番号
- 参照ドキュメント
- 対象ファイル
- 実装方針
- 非対応範囲
- 検証コマンド
- リスク

#### implement-task

目的:

- 指定TASKを実装する。

実行ルール:

- 実装前に `analyze-task` 相当の整理を行う。
- 変更範囲を最小化する。
- 実装後に検証を実行する。
- 実行できなかった検証は理由を記録する。

#### review-task

目的:

- 実装後の差分をレビューする。

確認項目:

- 計画との一致
- 過剰実装の有無
- 型安全性
- ログ出力
- 外部送信表示
- README/docs整合性
- CI影響

#### verify

目的:

- 標準品質ゲートを実行する。

標準コマンド:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run check
```

補足:

- 依存関係を変更するタスクでは `npm install` で `package-lock.json` を更新してよい。
- 通常検証では `npm ci` を使う。

#### security-check

目的:

- セキュリティ・プライバシー観点のチェックを行う。

確認項目:

- `.env.local` がコミットされていない。
- `.env.example` に秘密値が入っていない。
- CORSの許可Originが `FRONTEND_URL` 方針に合っている。
- AI応答全文やファイル本文をproductionログに出していない。
- PDF.js復活や `extractTextFromPDF` 参照がない。
- PDF直接送信の注意がREADME/UIにある。
- `/api/document` のパストラバーサル対策が必要タスクとして残っている場合、未実装であることをPRに明記する。

### 6. 品質ゲートを整備する

`package.json` に以下を追加または修正する。

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run lint && npm run build"
  }
}
```

`lint` については、現行のNext.js / ESLint構成で `next lint` が動かない場合は `eslint .` に変更する。

注意:

- `skipLibCheck` や `strict` を変更して型エラーを避けない。
- lint対象を過剰に除外しない。
- テスト基盤が未導入の場合、このPRでは無理に `npm test` を追加しない。

### 7. GitHub Actions CIを追加する

`.github/workflows/ci.yml` を追加する。

最低限の実行内容:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

注意:

- このPRではデプロイワークフローを追加しない。
- Gemini APIキーが必要な統合テストは追加しない。
- CIはPR段階で型、lint、buildの破壊を検出することを目的とする。

### 8. 環境変数テンプレートを追加する

`.env.example` を追加する。

初期案:

```env
GEMINI_API_KEY=
FRONTEND_URL=http://localhost:3000

GEMINI_PRIMARY_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
GEMINI_ENABLE_THINKING=true
GEMINI_THINKING_BUDGET=24576
```

注意:

- `ACCESS_CONTROL_ALLOW_ORIGIN` は追加しない。
- CORS許可Originは `FRONTEND_URL` に統一する。
- `.env.example` に実APIキーや秘密値を書かない。

`.gitignore` は以下のように修正する。

```gitignore
.env*
!.env.example
```

### 9. READMEを最小限更新する

READMEには、OpenCode運用に必要な範囲で以下を追記する。

- `.env.example` をコピーして `.env.local` を作ること。
- 通常検証は `npm ci` を使うこと。
- 開発者向け検証コマンドとして `npm run check` を使うこと。
- PDFやファイル解析では外部AI APIへ送信されること。

ただし、このPRではREADME全面刷新はしない。

## 実行順

AIエージェントは以下の順に実装する。

1. `AGENTS.md` を追加する。
2. `docs/agents/opencode.md` を追加する。
3. `.opencode/agents/` を追加する。
4. `.opencode/commands/` を追加する。
5. `opencode.jsonc` を追加する。
6. `package.json` に `typecheck` / `check` を追加する。
7. `lint` が現行構成で動くか確認し、必要なら `eslint .` に変更する。
8. `.github/workflows/ci.yml` を追加する。
9. `.env.example` を追加する。
10. `.gitignore` を修正する。
11. READMEに最小限の開発・検証手順を追記する。
12. `npm ci` を実行する。
13. `npm run typecheck` を実行する。
14. `npm run lint` を実行する。
15. `npm run build` を実行する。
16. `npm run check` を実行する。
17. 実行できなかったコマンドがある場合は、PR本文に理由と次アクションを書く。

## 完了条件

以下をすべて満たすこと。

- `opencode.jsonc` が追加されている。
- `AGENTS.md` が追加されている。
- `docs/agents/opencode.md` が追加されている。
- `.opencode/agents/` に4種類のagent定義がある。
- `.opencode/commands/` に5種類のcommand定義がある。
- `package.json` に `typecheck` と `check` がある。
- `npm run lint` が現行構成で実行可能になっている。
- `.github/workflows/ci.yml` が追加されている。
- `.env.example` が追加されている。
- `.gitignore` で `.env.example` がコミット可能になっている。
- READMEに最小限の開発・検証手順がある。
- 通常検証コマンドが `npm ci` 前提で整理されている。
- OpenCode向け指示で、PDF.js復活禁止、型安全性低下禁止、秘密情報コミット禁止が明記されている。
- このPRでアプリケーション本体のP0/P1実装修正に踏み込んでいない。

## PR本文に書くべき内容

PR作成時は以下の形式にする。

```md
## Summary

- OpenCode運用のための設定・指示・カスタムagent/commandを追加
- 基本品質ゲートとしてtypecheck/checkとCIを追加
- `.env.example` と `.gitignore` を整備
- READMEに最小限の開発・検証手順を追加

## Scope

このPRはOpenCode環境整備のみを対象とします。
React依存修正、GenerateQuiz.options修正、PDF.js削除、CORS共通化、ログ抑制などのアプリ実装修正は後続PRで扱います。

## Verification

- [ ] npm ci
- [ ] npm run typecheck
- [ ] npm run lint
- [ ] npm run build
- [ ] npm run check

## Notes

- 実行できなかった検証があれば理由を書く
- 既存P0/P1タスクは未対応であることを明記する
```

## 注意事項

この計画は、AIエージェントに実装を丸投げするためのものではない。

OpenCodeに任せる前提でも、以下は人間がレビューすること。

- `opencode.jsonc` の権限設定
- agent/commandの指示が過剰または曖昧でないか
- CIが現実に動くか
- `package-lock.json` が意図せず大きく変わっていないか
- `.env.example` に秘密値がないか
- READMEが実装より先走りすぎていないか

特に、環境整備PRでP0/P1実装修正まで混ぜるとレビューが難しくなる。
このPRでは、AIエージェントが安全に動ける土台作りに限定する。
