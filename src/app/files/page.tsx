"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { FileList } from "@/components/file-list";
import { db, type FileItem } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, Upload, FileUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function FilesPage() {
  const [error, setError] = useState<string | null>(null);
  const [recentlyUploadedFile, setRecentlyUploadedFile] =
    useState<FileItem | null>(null);
  const files = useLiveQuery(() =>
    db.files.orderBy("uploadedAt").reverse().toArray()
  );
  const router = useRouter();

  // ファイルリストに最新のアップロードファイルを含める
  const allFiles =
    recentlyUploadedFile && files
      ? [
          recentlyUploadedFile,
          ...files.filter((f) => f.id !== recentlyUploadedFile.id),
        ]
      : files;

  const handleCreateQuiz = (fileId: number) => {
    router.push(`/quizzes/create?fileId=${fileId}`);
  };

  const handleDeleteFile = useCallback(
    async (fileId: number) => {
      try {
        // ファイルのみを削除
        await db.files.delete(fileId);

        // 削除したファイルが最近アップロードしたファイルなら、それをクリア
        if (recentlyUploadedFile && recentlyUploadedFile.id === fileId) {
          setRecentlyUploadedFile(null);
        }
      } catch (error) {
        console.error("ファイルの削除中にエラーが発生しました:", error);
        setError("ファイルの削除中にエラーが発生しました");
      }
    },
    [recentlyUploadedFile]
  );

  const handleUploadComplete = useCallback((fileItem?: FileItem) => {
    if (fileItem) {
      setRecentlyUploadedFile(fileItem);
    }
  }, []);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="page-header">
          <h2 className="page-title">ファイル管理</h2>
          <p className="page-description">
            テキスト、画像、PDFファイルをアップロードして、クイズの元となる資料を管理します。
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-2 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              ファイルのアップロード
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={(errorMsg) => setError(errorMsg)}
            />
          </CardContent>
        </Card>

        <div>
          <h3 className="section-title flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            アップロード済みファイル
          </h3>

          {allFiles && allFiles.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <FileList
                files={allFiles}
                onCreateQuiz={handleCreateQuiz}
                onDeleteFile={handleDeleteFile}
              />
            </motion.div>
          ) : (
            <Card className="border-2 border-dashed p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  アップロードされたファイルはありません。上記のフォームからファイルをアップロードしてください。
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
