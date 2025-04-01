"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { db, type FileItem } from "@/lib/db";
import { extractKeywordsAndSummary } from "@/lib/api-utils";
import { Loader2, Globe, LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface UrlContentFetcherProps {
  onFetchComplete: (fileItem?: FileItem) => void;
  onError: (error: string) => void;
}

export function UrlContentFetcher({
  onFetchComplete,
  onError,
}: UrlContentFetcherProps) {
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setValidationError(null);
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchContent = async () => {
    if (!url.trim()) {
      setValidationError("URLを入力してください");
      return;
    }

    if (!validateUrl(url)) {
      setValidationError("有効なURLを入力してください");
      return;
    }

    setIsFetching(true);
    setProgress(10);

    try {
      // Jina Readerを使ってWebページのコンテンツを取得
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

      setProgress(30);
      const response = await fetch(jinaUrl);

      if (!response.ok) {
        throw new Error(
          `Webページの取得に失敗しました: ${response.statusText}`
        );
      }

      setProgress(50);
      const content = await response.text();

      // ファイル名を生成（URLからドメイン名を抽出）
      const urlObj = new URL(url);
      const fileName = `${urlObj.hostname}${
        urlObj.pathname === "/" ? "" : urlObj.pathname
      }.txt`;

      // テキストファイルとして扱う
      const file = new File([content], fileName, { type: "text/plain" });

      setProgress(70);

      // キーワードと概要抽出APIを呼び出す
      const { keywords, summary, structure } = await extractKeywordsAndSummary(
        file,
        content
      );

      setProgress(90);

      // ファイル情報をIndexedDBに保存
      const fileItem: FileItem = {
        name: fileName,
        type: "text/plain",
        size: content.length,
        blob: file,
        extractedText: content,
        keywords,
        summary,
        structure,
        uploadedAt: new Date(),
      };

      const fileId = await db.files.add(fileItem);
      fileItem.id = fileId; // IDを設定

      setProgress(100);

      // 入力フィールドをリセット
      setUrl("");

      // 完了時にファイル情報を渡��
      onFetchComplete(fileItem);
    } catch (error) {
      console.error("Webページの取得中にエラーが発生しました:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Webページの取得中にエラーが発生しました"
      );
      onFetchComplete(); // エラー時も完了を通知
    } finally {
      setIsFetching(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={handleUrlChange}
            disabled={isFetching}
            className="flex-1"
          />
          <Button onClick={fetchContent} disabled={isFetching}>
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                取得中
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                取得
              </>
            )}
          </Button>
        </div>
        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}
      </div>

      {isFetching && (
        <motion.div
          className="space-y-3 p-4 rounded-lg border bg-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Webページ取得中...</p>
              <p className="text-xs text-muted-foreground">
                コンテンツを取得しています。しばらくお待ちください。
              </p>
            </div>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 w-full" />
        </motion.div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <LinkIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              URLを入力してWebページのコンテンツを取得します。取得したコンテンツはテキストファイルとして保存され、クイズ作成に利用できます。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
