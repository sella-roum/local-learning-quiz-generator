"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { FileList } from "@/components/file-list";
import { db, type FileItem } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, Upload, FileUp, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FilesPage() {
  const [error, setError] = useState<string | null>(null);
  const [recentlyUploadedFile, setRecentlyUploadedFile] =
    useState<FileItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  const handleCreateMultiQuiz = (fileIds: number[]) => {
    const queryString = fileIds.map((id) => `fileId=${id}`).join("&");
    router.push(`/quizzes/create-multi?${queryString}`);
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      // ファイルのみを削除（関連するクイズは削除しない）
      await db.files.delete(fileId);

      // 削除したファイルが最近アップロードしたファイルなら、それをクリア
      if (recentlyUploadedFile && recentlyUploadedFile.id === fileId) {
        setRecentlyUploadedFile(null);
      }
    } catch (error) {
      console.error("ファイルの削除中にエラーが発生しました:", error);
      setError("ファイルの削除中にエラーが発生しました");
    }
  };

  const handleDeleteAllFiles = async () => {
    try {
      await db.files.clear();
      setRecentlyUploadedFile(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("ファイルの一括削除中にエラーが発生しました:", error);
      setError("ファイルの一括削除中にエラーが発生しました");
    }
  };

  const handleUploadComplete = (fileItem?: FileItem) => {
    if (fileItem) {
      setRecentlyUploadedFile(fileItem);
    }
  };

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
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-2">
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-title flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              アップロード済みファイル
            </h3>

            {allFiles && allFiles.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive hover:bg-destructive/100"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                すべてのファイルを削除
              </Button>
            )}
          </div>

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
                onCreateMultiQuiz={handleCreateMultiQuiz}
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

      {/* 全ファイル削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>すべてのファイルを削除</DialogTitle>
            <DialogDescription>
              すべてのファイルを削除します。この操作は元に戻せません。
              ファイルを削除しても、そのファイルから作成されたクイズは削除されません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllFiles}>
              すべて削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
