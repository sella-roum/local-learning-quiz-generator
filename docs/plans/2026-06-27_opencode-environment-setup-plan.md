# OpenCode 環境整備 実行プラン

作成日: 2026-06-27
更新日: 2026-06-27
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

## OpenCode仕様確認メモ

実装前に、OpenCodeの現行仕様を公式ドキュメントで確認すること。

- Config: `https://opencode.ai/docs/config/`
- Agents: `https://opencode.ai/docs/agents/`
- Commands: `https://opencode.ai/docs/commands/`

現行仕様上、OpenCodeはJSON/JSONC形式のconfigを扱い、プロジェクトルートのconfigと `.opencode` ディレクトリ配下のagents/commandsを読み込む。Markdown agent/commandではfrontmatterを使える。

設定形式はOpenCode側で更新されうるため、AIエージェントは推測で古い形式を固定せず、実装時点の公式ドキュメントと `opencode debug config` で確認する。

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

このプランを実行するPRでは、原則としてOpenCode運用の土台だけを整備する。

### 追加・変更対象

- `opencode.json`
- 必要に応じて `opencode.jsonc`
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
- `.nvmrc` または `.node-version`
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

プロジェクトルートには原則 `opencode.json` を追加する。

コメント付き設定が必要な場合のみ `opencode.jsonc` を検討する。ただし、`opencode.jsonc` を使う場合は、実装時点のOpenCodeでプロジェクトconfigとして確実に読み込まれることを `opencode debug config` で確認する。読み込まれない場合は、公式ドキュメントに合わせて `opencode.json` に戻す。

#### `opencode.json` に入れるもの

必須:

- `$schema`
- `instructions`
- `permission`
- `share`
- `default_agent`

任意:

- `model`
- `small_model`

#### `opencode.json` に原則入れないもの

以下はMarkdownファイルで定義するため、重複定義を避ける。

- `agent`
- `command`

ただし、Markdown定義だけでは不足する設定がある場合のみ、公式schemaに従って `agent` / `command` を追加してよい。

#### 推奨方針

- `instructions` に `AGENTS.md` と `docs/agents/**/*.md` を含める。
- `permission.edit` は原則 `ask` にする。
- `permission.bash` は原則 `ask` にする。
- `permission.webfetch` / `permission.websearch` は必要時のみ許可またはaskにする。
- `tools` はdeprecated扱いのため、新規設定では `permission` を優先する。
- `share` は `manual` または `disabled` にする。
- `default_agent` は実装者ではなく、まず計画・分析寄りのagentに寄せる。ただし、指定したagentがprimaryであることを確認する。

#### 検証

OpenCodeが利用可能なローカル環境で以下を実行する。

```bash
opencode debug config
```

CIにはOpenCodeを入れない前提のため、この確認はローカル任意確認とする。実行できない場合はPR本文に理由を書く。

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
9. 必要に応じて `npm run typecheck`、`npm run lint`、`npm run build` を個別実行して原因を切り分ける。
10. セキュリティ・プライバシー観点を確認する。
11. PR本文に実施内容、確認結果、未対応事項を書く。

### 4. カスタムエージェントを追加する

`.opencode/agents/` 配下に以下を追加する。

Markdown agentは、少なくともfrontmatterを含める。

#### 共通frontmatter方針

各agentファイルは、以下のようなfrontmatterを持つこと。

```md
---
description: Short description of when to use this agent
mode: subagent
permission:
  edit: deny
  bash:
    "*": ask
---
```

実装時には、OpenCode公式ドキュメントの現行schemaに合わせて調整する。

#### planner

目的:

- 実装対象タスクの分析
- 参照ドキュメントの整理
- 対象ファイルの特定
- 実装順の提案

推奨frontmatter:

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

推奨frontmatter:

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

推奨frontmatter:

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

推奨frontmatter:

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

Markdown commandは、少なくともfrontmatterを含める。

#### 共通frontmatter方針

```md
---
description: Short description of the command
agent: planner
---
```

必要に応じて `model` や `subtask` を指定してよい。ただし、モデル固定は利用環境差分が出やすいため、最初のPRでは原則指定しない。

#### analyze-task

目的:

- 指定TASKの背景、対象ファイル、対応内容、達成条件、非対応範囲を整理する。

推奨frontmatter:

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

推奨frontmatter:

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

推奨frontmatter:

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

推奨frontmatter:

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
- 依存関係を変更するタスクでは `npm install` で `package-lock.json` を更新してよい。
- 通常検証では `npm install` ではなく `npm ci` を使う。

#### security-check

目的:

- セキュリティ・プライバシー観点のチェックを行う。

推奨frontmatter:

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

#### lint設定失敗時の扱い

- `eslint .` に変更する場合は、必要に応じて `eslint.config.mjs` を追加または修正する。
- lintを通すために大量のルール無効化をしない。
- lint対象を過剰に除外しない。
- lint設定の追加・修正は、このPRの環境整備範囲に含める。
- アプリ本体コードの大規模修正が必要になる場合は、このPRで無理に直さず、PR本文に未対応として残す。

注意:

- `skipLibCheck` や `strict` を変更して型エラーを避けない。
- テスト基盤が未導入の場合、このPRでは無理に `npm test` を追加しない。

### 7. Node.jsバージョンを固定する

CI、ローカル、OpenCode実行環境の差分を減らすため、Node.js 22系に寄せる。

追加候補:

- `.nvmrc`
- または `.node-version`
- 必要に応じて `package.json` の `engines.node`

推奨:

```text
22
```

`package.json` に `engines` を追加する場合の例:

```json
{
  "engines": {
    "node": ">=22 <23"
  }
}
```

ただし、package managerやホスティング環境に影響する可能性があるため、`engines` 追加は実装時に影響を確認する。最低限 `.nvmrc` または `.node-version` は追加する。

READMEにも、開発環境はNode.js 22系前提であることを記載する。

### 8. GitHub Actions CIを追加する

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
- CIでは `npm run check` ではなく、失敗箇所が分かるように `typecheck` / `lint` / `build` を個別ステップにする。

### 9. 環境変数テンプレートを追加する

`.env.example` を追加する。

初期案:

```env
GEMINI_API_KEY=
FRONTEND_URL=http://localhost:3000
```

注意:

- `ACCESS_CONTROL_ALLOW_ORIGIN` は追加しない。
- CORS許可Originは `FRONTEND_URL` に統一する。
- `.env.example` に実APIキーや秘密値を書かない。
- `GEMINI_PRIMARY_MODEL`、`GEMINI_FALLBACK_MODEL`、`GEMINI_ENABLE_THINKING`、`GEMINI_THINKING_BUDGET` はこのPRでは追加しない。
- Geminiモデル系の環境変数は、TASK-011実装時に追加する。

`.gitignore` は以下のように修正する。

```gitignore
.env*
!.env.example
```

### 10. READMEを最小限更新する

READMEには、OpenCode運用に必要な範囲で以下を追記する。

- `.env.example` をコピーして `.env.local` を作ること。
- Node.js 22系を使用すること。
- 通常検証は `npm ci` を使うこと。
- 開発者向け検証コマンドとして `npm run check` を使うこと。
- 開発・運用上の注意として、AI解析・クイズ生成時にファイル内容を外部AI APIへ送信する処理があること。

ただし、このPRではREADME全面刷新はしない。

#### READMEの外部送信注意の粒度

このPRでは、TASK-006/TASK-007の実装修正に踏み込まない。
そのため、READMEでは実装詳細として「PDFはGemini inlineDataで直接送信される」と断定しすぎない。

推奨文言:

```md
### 開発・運用上の注意

このアプリでは、AI解析・クイズ生成時にファイル内容を外部AI APIへ送信する処理があります。機密情報、個人情報、社外秘資料を含むファイルは投入しないでください。
```

PDF直接送信の詳細説明は、TASK-006/TASK-007の実装時にREADMEとUIへ反映する。

## 実行順

AIエージェントは以下の順に実装する。

1. `AGENTS.md` を追加する。
2. `docs/agents/opencode.md` を追加する。
3. `.opencode/agents/` を追加する。
4. `.opencode/commands/` を追加する。
5. `opencode.json` を追加する。コメント付き設定が必要な場合のみ `opencode.jsonc` を検討する。
6. `.nvmrc` または `.node-version` を追加する。
7. `package.json` に `typecheck` / `check` を追加する。
8. `lint` が現行構成で動くか確認し、必要なら `eslint .` と `eslint.config.mjs` を整備する。
9. `.github/workflows/ci.yml` を追加する。
10. `.env.example` を追加する。
11. `.gitignore` を修正する。
12. READMEに最小限の開発・検証手順を追記する。
13. `npm ci` を実行する。
14. `npm run check` を実行する。
15. 失敗時は `npm run typecheck` / `npm run lint` / `npm run build` を個別実行して原因を切り分ける。
16. OpenCodeが利用可能なら `opencode debug config` を実行する。
17. 実行できなかったコマンドがある場合は、PR本文に理由と次アクションを書く。

## 完了条件

以下をすべて満たすこと。

- `opencode.json` が追加されている。
- コメント付き設定が必要で `opencode.jsonc` を使う場合は、`opencode debug config` で読み込み確認できている。
- OpenCode configに `$schema` / `instructions` / `permission` / `share` / `default_agent` がある。
- `AGENTS.md` が追加されている。
- `docs/agents/opencode.md` が追加されている。
- `.opencode/agents/` に4種類のagent定義がある。
- 各agent定義にfrontmatterがある。
- `.opencode/commands/` に5種類のcommand定義がある。
- 各command定義にfrontmatterがある。
- `.nvmrc` または `.node-version` にNode.js 22系の指定がある。
- `package.json` に `typecheck` と `check` がある。
- `npm run lint` が現行構成で実行可能になっている。
- `.github/workflows/ci.yml` が追加されている。
- `.env.example` が追加されている。
- `.env.example` には `GEMINI_API_KEY` と `FRONTEND_URL` のみを記載し、TASK-011相当の未実装変数を入れていない。
- `.gitignore` で `.env.example` がコミット可能になっている。
- READMEに最小限の開発・検証手順がある。
- 通常検証コマンドが `npm ci && npm run check` 前提で整理されている。
- OpenCode向け指示で、PDF.js復活禁止、型安全性低下禁止、秘密情報コミット禁止が明記されている。
- このPRでアプリケーション本体のP0/P1実装修正に踏み込んでいない。
- OpenCodeが利用可能な環境では `opencode debug config` の結果を確認している。実行できない場合はPR本文に理由が書かれている。

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
- [ ] npm run typecheck
- [ ] npm run lint
- [ ] npm run build
- [ ] opencode debug config（任意。OpenCodeが利用可能な場合のみ）

## Notes

- 実行できなかった検証があれば理由を書く
- 既存P0/P1タスクは未対応であることを明記する
- `.env.example` には未実装のTASK-011系変数を入れていないことを明記する
```

## 注意事項

この計画は、AIエージェントに実装を丸投げするためのものではない。

OpenCodeに任せる前提でも、以下は人間がレビューすること。

- OpenCode configのファイル名が実際に読み込まれるか
- `opencode debug config` の結果
- OpenCode configの権限設定
- agent/commandのfrontmatterがOpenCode現行仕様に合っているか
- agent/commandの指示が過剰または曖昧でないか
- CIが現実に動くか
- `package-lock.json` が意図せず大きく変わっていないか
- `.env.example` に秘密値や未実装変数がないか
- READMEが実装より先走りすぎていないか

特に、環境整備PRでP0/P1実装修正まで混ぜるとレビューが難しくなる。
このPRでは、AIエージェントが安全に動ける土台作りに限定する。
