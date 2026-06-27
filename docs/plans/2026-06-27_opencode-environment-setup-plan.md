# OpenCode 環境整備 実行プラン

作成日: 2026-06-27
更新日: 2026-06-27
対象リポジトリ: `sella-roum/local-learning-quiz-generator`
目的: OpenCode / AIエージェントが今後このリポジトリを安全に実装・検証・レビューできるようにするための環境整備計画

## 参照ドキュメント

本プランを実行するAIエージェントは、作業開始時に以下のドキュメントを読む。

- `docs/plans/2026-06-25_improvement-tasks.md`
- `docs/plans/2026-06-25_priority-implementation-steps.md`
- `docs/plans/2026-06-25_review-feedback-adjustments.md`
- `README.md`
- `package.json`
- `tsconfig.json`

`docs/plans/2026-06-25_review-feedback-adjustments.md` は既存計画への追補である。既存計画と矛盾する記載があるときは、`docs/plans/2026-06-25_review-feedback-adjustments.md` を優先する。

## OpenCode仕様確認メモ

実装前に、OpenCodeの現行仕様を公式ドキュメントで確認する。

- Config: `https://opencode.ai/docs/config/`
- Agents: `https://opencode.ai/docs/agents/`
- Commands: `https://opencode.ai/docs/commands/`

このPRでは、OpenCodeのプロジェクト設定ファイルとして `opencode.json` のみを作成する。`opencode.jsonc` は作成しない。

OpenCode CLI がインストール済みの環境では、実装後に以下を実行して設定の読み込みを確認する。

```bash
opencode debug config
```

OpenCode CLI が未インストールの環境では、`opencode debug config` を実行しない。その代わり、PR本文のNotesに `OpenCode CLI not available` と記載する。

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
8. Node.jsのローカル/CI差分を最小化する。

## このプランで実装するもの

このPRでは、OpenCode運用の土台整備のみを行う。アプリケーション本体のP0/P1実装修正は行わない。

### 追加・変更対象

- `opencode.json`
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
- `.nvmrc`
- `package.json`
- `eslint.config.mjs`
- `README.md`

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

プロジェクトルートに `opencode.json` を追加する。`opencode.jsonc` は作成しない。設定理由や補足は `docs/agents/opencode.md` に記載する。

#### `opencode.json` に入れるもの

`opencode.json` には以下のみを設定する。

- `$schema`
- `instructions`
- `permission`
- `share`
- `default_agent`

`model` と `small_model` はこのPRでは設定しない。モデル指定は利用環境ごとの差分があるため、後続タスクで必要になった時点で追加する。

`agent` と `command` は `opencode.json` に定義しない。agentは `.opencode/agents/*.md`、commandは `.opencode/commands/*.md` のみで定義する。

#### `opencode.json` の固定方針

- `instructions` に `AGENTS.md` と `docs/agents/**/*.md` を含める。
- `permission.edit` は `ask` にする。
- `permission.bash` は `ask` にする。
- `permission.webfetch` は `ask` にする。
- `permission.websearch` は `ask` にする。
- `permission` で `rm -rf *` を `deny` にする。
- `tools` は設定しない。
- `share` は `disabled` にする。
- `default_agent` は `planner` にする。

#### `opencode.json` の最小構成

実装時は以下の構成をベースにする。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "AGENTS.md",
    "docs/agents/**/*.md"
  ],
  "permission": {
    "edit": "ask",
    "bash": {
      "*": "ask",
      "rm -rf *": "deny"
    },
    "webfetch": "ask",
    "websearch": "ask"
  },
  "share": "disabled",
  "default_agent": "planner"
}
```

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
6. 通常検証では `npm ci` を使う。
7. 依存関係を変更したタスクのみ `npm install` でlockfileを更新する。
8. ローカル確認は `npm ci && npm run check` を基本にする。
9. `npm run check` が失敗したときのみ、`npm run typecheck`、`npm run lint`、`npm run build` を個別実行して原因を切り分ける。
10. セキュリティ・プライバシー観点を確認する。
11. PR本文に実施内容、確認結果、未対応事項を書く。

### 4. カスタムエージェントを追加する

`.opencode/agents/` 配下に以下を追加する。

各agentファイルには、以下に記載したfrontmatterをそのまま使用する。OpenCode CLIでschemaエラーが出たときのみ、エラー内容に合わせて最小修正する。修正したときはPR本文のNotesに変更理由を書く。

#### planner

目的:

- 実装対象タスクの分析
- 参照ドキュメントの整理
- 対象ファイルの特定
- 実装順の提案

使用するfrontmatter:

```md
---
description: Analyze repository plans and propose a safe implementation scope without editing files
mode: primary
permission:
  edit: deny
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "grep *": allow
  webfetch: ask
  websearch: ask
---
```

制約:

- ファイル編集はしない。
- 実装範囲を勝手に広げない。
- PR分割ではなく、タスク単位で整理する。

#### implementer

目的:

- 指定された1タスクまたは環境整備タスクを実装する。

使用するfrontmatter:

```md
---
description: Implement a scoped task with approval-gated edits and shell commands
mode: primary
permission:
  edit: ask
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
  webfetch: ask
  websearch: ask
---
```

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

使用するfrontmatter:

```md
---
description: Review implementation diffs against the plan without editing files
mode: subagent
permission:
  edit: deny
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "npm run typecheck": ask
    "npm run lint": ask
    "npm run build": ask
  webfetch: ask
  websearch: ask
---
```

確認観点:

- 対象TASKの達成条件を満たしているか。
- 非対応範囲に踏み込んでいないか。
- 型・ビルド・lintに問題がないか。
- READMEやdocsとの矛盾が増えていないか。

#### security-privacy-reviewer

目的:

- 外部送信、CORS、ログ、パストラバーサル、秘密情報の観点で確認する。

使用するfrontmatter:

```md
---
description: Review security, privacy, CORS, logging, and secret-handling risks without editing files
mode: subagent
permission:
  edit: deny
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "grep *": allow
  webfetch: ask
  websearch: ask
---
```

確認観点:

- PDF/画像/テキストの外部AI API送信がREADMEまたは運用注意で説明されているか。
- 機密情報、個人情報、社外秘資料を投入しない注意があるか。
- productionログにAI応答全文やファイル本文が出ないか。
- `/api/document` が `public/documents` 配下以外を読めないか。
- CORSが `FRONTEND_URL` 方針に沿っているか。
- `.env.local` やAPIキーがコミット対象になっていないか。

### 5. OpenCodeコマンドを追加する

`.opencode/commands/` 配下に以下を追加する。

各commandファイルには、以下に記載したfrontmatterをそのまま使用する。このPRでは command frontmatter に `model` と `subtask` を指定しない。指定する項目は `description` と `agent` のみとする。

#### analyze-task

目的:

- 指定TASKの背景、対象ファイル、対応内容、達成条件、非対応範囲を整理する。

使用するfrontmatter:

```md
---
description: Analyze a planned task and produce a scoped implementation brief
agent: planner
---
```

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

使用するfrontmatter:

```md
---
description: Implement one scoped task after analyzing the plan
agent: implementer
---
```

実行ルール:

- 実装前に `analyze-task` 相当の整理を行う。
- 変更範囲を最小化する。
- 実装後に検証を実行する。
- 実行できなかった検証は理由を記録する。

#### review-task

目的:

- 実装後の差分をレビューする。

使用するfrontmatter:

```md
---
description: Review implementation changes against the task plan
agent: reviewer
---
```

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

使用するfrontmatter:

```md
---
description: Run the standard local verification gate
agent: implementer
---
```

標準コマンド:

```bash
npm ci
npm run check
```

原因切り分け用コマンド:

```bash
npm run typecheck
npm run lint
npm run build
```

補足:

- `check` は `typecheck + lint + build` の集合コマンドとする。
- 通常検証では `npm ci && npm run check` を使う。
- CIではステップを分けるため、`typecheck` / `lint` / `build` を個別実行する。
- 依存関係を変更するタスクでは `npm install` で `package-lock.json` を更新する。
- 通常検証では `npm install` ではなく `npm ci` を使う。

#### security-check

目的:

- セキュリティ・プライバシー観点のチェックを行う。

使用するfrontmatter:

```md
---
description: Check security and privacy risks before opening a PR
agent: security-privacy-reviewer
---
```

確認項目:

- `.env.local` がコミットされていない。
- `.env.example` に秘密値が入っていない。
- CORSの許可Originが `FRONTEND_URL` 方針に合っている。
- AI応答全文やファイル本文をproductionログに出していない。
- PDF.js復活や `extractTextFromPDF` 参照がない。
- ファイル解析・AI生成時に外部AI APIへ送信される注意がREADMEまたは運用注意としてある。
- `/api/document` のパストラバーサル対策はこのPRでは未実装であることをPR本文に明記する。

### 6. 品質ゲートを整備する

`package.json` に以下を追加または修正する。

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run lint && npm run build"
  }
}
```

`next lint` は使用しない。`lint` は `eslint .` に統一する。

`eslint.config.mjs` を追加する。`eslint.config.mjs` はNext.js/TypeScript向けのFlat Configとして作成し、lint対象を過剰に除外しない。

lintを通すために大量のルール無効化をしない。`eslint.config.mjs` で無効化してよいのは、このPRの環境整備に必要な最低限の互換設定のみとする。

アプリ本体コードの修正が3ファイルを超えるとき、またはUI/APIロジック変更を伴うときは、このPRでは修正しない。PR本文のNotesに未対応として記載する。

注意:

- `skipLibCheck` や `strict` を変更して型エラーを避けない。
- テスト基盤が未導入のため、このPRでは `npm test` を追加しない。

### 7. Node.jsバージョンを固定する

CI、ローカル、OpenCode実行環境の差分を減らすため、Node.js 22系に固定する。

`.nvmrc` を追加し、内容は以下の1行にする。

```text
22
```

`.node-version` は作成しない。`package.json` の `engines.node` は追加しない。

READMEにも、開発環境はNode.js 22系前提であることを記載する。

### 8. GitHub Actions CIを追加する

`.github/workflows/ci.yml` を追加する。

内容は以下にする。

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

このPRではデプロイワークフローを追加しない。Gemini APIキーが必要な統合テストも追加しない。

CIでは `npm run check` ではなく、失敗箇所が分かるように `typecheck` / `lint` / `build` を個別ステップにする。

### 9. 環境変数テンプレートを追加する

`.env.example` を追加する。

内容は以下にする。

```env
GEMINI_API_KEY=
FRONTEND_URL=http://localhost:3000
```

`ACCESS_CONTROL_ALLOW_ORIGIN` は追加しない。CORS許可Originは `FRONTEND_URL` に統一する。

`.env.example` に実APIキーや秘密値を書かない。

`GEMINI_PRIMARY_MODEL`、`GEMINI_FALLBACK_MODEL`、`GEMINI_ENABLE_THINKING`、`GEMINI_THINKING_BUDGET` はこのPRでは追加しない。Geminiモデル系の環境変数は、TASK-011実装時に追加する。

`.gitignore` は以下のように修正する。

```gitignore
.env*
!.env.example
```

### 10. READMEを更新する

READMEに以下の2セクションを追加する。文面は以下をそのまま使用する。

```md
## Development

1. Copy `.env.example` to `.env.local`.
2. Set `GEMINI_API_KEY` in `.env.local`.
3. Use Node.js 22.
4. Install dependencies with `npm ci`.
5. Run `npm run check` before opening a pull request.

## Development and operation notice

This app may send file contents to an external AI API during AI analysis or quiz generation. Do not upload files containing confidential, personal, or proprietary information.
```

PDF直接送信の詳細説明は、TASK-006/TASK-007の実装時にREADMEとUIへ反映する。

## 実行順

AIエージェントは以下の順に実装する。

1. `AGENTS.md` を追加する。
2. `docs/agents/opencode.md` を追加する。
3. `.opencode/agents/` を追加する。
4. `.opencode/commands/` を追加する。
5. `opencode.json` を追加する。
6. `.nvmrc` を追加する。
7. `package.json` に `lint` / `typecheck` / `check` を追加または修正する。
8. `eslint.config.mjs` を追加する。
9. `.github/workflows/ci.yml` を追加する。
10. `.env.example` を追加する。
11. `.gitignore` を修正する。
12. READMEに指定文面を追記する。
13. `npm ci` を実行する。
14. `npm run check` を実行する。
15. `npm run check` が失敗したときは、`npm run typecheck` / `npm run lint` / `npm run build` を個別実行して原因を切り分ける。
16. OpenCode CLI がインストール済みの環境では `opencode debug config` を実行する。
17. OpenCode CLI が未インストールの環境では、PR本文のNotesに `OpenCode CLI not available` と記載する。
18. 実行できなかった検証があるときは、PR本文に理由と次アクションを書く。

## 完了条件

以下をすべて満たすこと。

- `opencode.json` が追加されている。
- `opencode.jsonc` が追加されていない。
- `opencode.json` に `$schema` / `instructions` / `permission` / `share` / `default_agent` がある。
- `opencode.json` に `model` / `small_model` / `agent` / `command` がない。
- `opencode.json` の `share` が `disabled` である。
- `opencode.json` の `default_agent` が `planner` である。
- `AGENTS.md` が追加されている。
- `docs/agents/opencode.md` が追加されている。
- `.opencode/agents/` に4種類のagent定義がある。
- 各agent定義に指定どおりのfrontmatterがある。
- `.opencode/commands/` に5種類のcommand定義がある。
- 各command定義に指定どおりのfrontmatterがある。
- `.nvmrc` に `22` が記載されている。
- `.node-version` が追加されていない。
- `package.json` に `lint: eslint .` / `typecheck` / `check` がある。
- `package.json` に `engines.node` が追加されていない。
- `eslint.config.mjs` が追加されている。
- `.github/workflows/ci.yml` が追加されている。
- `.env.example` が追加されている。
- `.env.example` には `GEMINI_API_KEY` と `FRONTEND_URL` のみを記載し、TASK-011相当の未実装変数を入れていない。
- `.gitignore` で `.env.example` がコミット可能になっている。
- READMEに指定した2セクションが追加されている。
- 通常検証コマンドが `npm ci && npm run check` 前提で整理されている。
- OpenCode向け指示で、PDF.js復活禁止、型安全性低下禁止、秘密情報コミット禁止が明記されている。
- このPRでアプリケーション本体のP0/P1実装修正に踏み込んでいない。
- OpenCode CLI がインストール済みの環境では `opencode debug config` の結果を確認している。
- OpenCode CLI が未インストールの環境では、PR本文のNotesに `OpenCode CLI not available` が書かれている。

## PR本文に書くべき内容

PR作成時は以下の形式にする。

```md
## Summary

- OpenCode運用のための設定・指示・カスタムagent/commandを追加
- 基本品質ゲートとしてtypecheck/checkとCIを追加
- Node.js 22系のローカル/CI前提を明確化
- `.env.example` と `.gitignore` を整備
- READMEに最小限の開発・検証手順を追加

## Scope

このPRはOpenCode環境整備のみを対象とします。
React依存修正、GenerateQuiz.options修正、PDF.js削除、CORS共通化、ログ抑制、Geminiモデル環境変数化などのアプリ実装修正は後続PRで扱います。

## Verification

- [ ] npm ci
- [ ] npm run check
- [ ] npm run typecheck（`npm run check` 失敗時の切り分け）
- [ ] npm run lint（`npm run check` 失敗時の切り分け）
- [ ] npm run build（`npm run check` 失敗時の切り分け）
- [ ] opencode debug config
- [ ] OpenCode CLI not available（OpenCode CLI未インストールの場合のみ）

## Notes

- 実行できなかった検証があれば理由を書く
- 既存P0/P1タスクは未対応であることを明記する
- `.env.example` には未実装のTASK-011系変数を入れていないことを明記する
- agent/commandのfrontmatterをschemaエラー対応で変更した場合は、変更理由を書く
```

## 注意事項

この計画は、AIエージェントに実装を丸投げするためのものではない。

OpenCodeに任せる前提でも、以下は人間がレビューすること。

- `opencode.json` が実際に読み込まれるか
- `opencode debug config` の結果、または `OpenCode CLI not available` の記録
- `opencode.json` の権限設定
- agent/commandのfrontmatterがOpenCode現行仕様に合っているか
- agent/commandの指示が過剰または曖昧でないか
- CIが現実に動くか
- `package-lock.json` が意図せず大きく変わっていないか
- `.env.example` に秘密値や未実装変数がないか
- READMEが実装より先走りすぎていないか

特に、環境整備PRでP0/P1実装修正まで混ぜるとレビューが難しくなる。
このPRでは、AIエージェントが安全に動ける土台作りに限定する。
