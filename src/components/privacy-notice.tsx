"use client";

import { ShieldAlert } from "lucide-react";

interface PrivacyNoticeProps {
  type: "file" | "url";
}

const notices: Record<PrivacyNoticeProps["type"], { title: string; description: string; details: string }> = {
  file: {
    title: "プライバシーに関する注意",
    description:
      "ファイルはこのブラウザのIndexedDBに保存されます。ただし、キーワード抽出やクイズ生成などのAI解析を行う際、ファイル内容は外部のGemini APIへ送信されます。",
    details: "対象: PDF（本体をGemini APIへ直接送信）、画像、テキストファイル",
  },
  url: {
    title: "URL取得に関する注意",
    description:
      "URLから本文を取得する際、入力したURLや取得対象ページの内容が外部サービスへ送信される場合があります。機密ページ、認証が必要な社内ページ、個人情報を含むページのURLは入力しないでください。",
    details: "この機能では、ページ本文取得のためにJina Readerを利用します。",
  },
};

export function PrivacyNotice({ type }: PrivacyNoticeProps) {
  const notice = notices[type];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">{notice.title}</p>
          <p>{notice.description}</p>
          <p className="text-xs opacity-80">{notice.details}</p>
        </div>
      </div>
      <p className="mt-2 text-xs opacity-70">
        機密情報、個人情報、社外秘資料はアップロード/入力しないでください。
      </p>
    </div>
  );
}
