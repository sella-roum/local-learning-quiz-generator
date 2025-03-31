"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { db, type FileItem } from "@/lib/db";
import { formatFileSize, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  Image,
  FileType,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: {
    fileId: string;
  };
}

export default function FileDetailPage({ params }: PageProps) {
  const router = useRouter();
  const fileId = Number.parseInt(params.fileId);

  const [file, setFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ファイルIDからファイル情報を取得
  useEffect(() => {
    const fetchFile = async () => {
      try {
        const fileData = await db.files.get(fileId);
        if (fileData) {
          setFile(fileData);
        } else {
          setError("指定されたファイルが見つかりませんでした");
        }
      } catch (error) {
        console.error("ファイル情報の取得中にエラーが発生しました:", error);
        setError("ファイル情報の取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [fileId]);

  // ファイルをダウンロードする関数
  const handleDownload = useCallback(() => {
    if (!file) return;

    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [file]);

  // クイズ作成画面に遷移する関数
  const handleCreateQuiz = () => {
    router.push(`/quizzes/create?fileId=${fileId}`);
  };

  // ファイルタイプに応じたアイコンを取得
  const getFileIcon = useCallback((fileType: string) => {
    if (fileType?.startsWith("text/")) {
      return <FileText className="h-12 w-12" />;
    } else if (fileType?.startsWith("image/")) {
      return <Image className="h-12 w-12" />;
    } else if (fileType === "application/pdf") {
      return <FileType className="h-12 w-12" />;
    } else {
      return <FileType className="h-12 w-12" />;
    }
  }, []);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">ファイル詳細</h2>
            <p className="text-muted-foreground">
              ファイルの詳細情報を確認できます。
            </p>
          </div>
          <Link href="/files">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ファイル一覧に戻る
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {file && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start space-y-0">
                <div className="flex items-start gap-4">
                  {getFileIcon(file.type)}
                  <div>
                    <CardTitle className="text-xl whitespace-pre-wrap">
                      {file.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(file.size)} •{" "}
                      {formatDate(file.uploadedAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      タイプ: {file.type}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {file.summary && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">概要</h3>
                    <p className="text-sm whitespace-pre-wrap">
                      {file.summary}
                    </p>
                  </div>
                )}

                {file.keywords && file.keywords.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">キーワード</h3>
                    <div className="flex flex-wrap gap-2">
                      {file.keywords.map((keyword, index) => (
                        <Badge variant="outline" key={index}>
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {file.structure && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">構成</h3>
                    <p className="text-sm whitespace-pre-wrap">
                      {file.structure}
                    </p>
                  </div>
                )}

                {file.type.startsWith("image/") && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">プレビュー</h3>
                    <div className="border rounded-md overflow-hidden">
                      <img
                        src={
                          URL.createObjectURL(file.blob) || "/placeholder.svg"
                        }
                        alt={file.name}
                        className="max-w-full h-auto"
                      />
                    </div>
                  </div>
                )}

                {file.extractedText && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">抽出テキスト</h3>
                    <div className="border rounded-md p-4 bg-muted/50 max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        {file.extractedText}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardContent className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  ダウンロード
                </Button>
                <Button variant="outline" onClick={handleCreateQuiz}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  このファイルからクイズを作成
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
