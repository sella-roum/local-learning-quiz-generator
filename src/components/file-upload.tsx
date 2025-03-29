"use client";

import type React from "react";
import { useState, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { db, type FileItem } from "@/lib/db";
import { extractTextFromPDF } from "@/lib/pdf-utils";
import { extractKeywordsAndSummary } from "@/lib/api-utils";
import { Loader2, Upload, FileText, Image, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface FileUploadProps {
  onUploadComplete: (fileItem?: FileItem) => void;
  onError: (error: string) => void;
}

// FileUpload コンポーネントを forwardRef でラップ
export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  ({ onUploadComplete, onError }: FileUploadProps, ref) => {
    // ref を引数に追加
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      await processFile(files[0]);
    };

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFile(e.dataTransfer.files[0]);
      }
    };

    const processFile = async (file: File) => {
      setIsUploading(true);
      setProgress(10);

      try {
        // ファイルの種類に応じた処理
        let extractedText: string | undefined;
        let fileContent: string | ArrayBuffer;

        // PDFファイルの場合はテキスト抽出
        if (file.type === "application/pdf") {
          setProgress(20);
          extractedText = await extractTextFromPDF(file);
          fileContent = extractedText;
        } else if (file.type.startsWith("text/")) {
          // テキストファイルの場合は内容を読み込む
          fileContent = await readFileAsText(file);
          extractedText = fileContent as string;
        } else if (file.type.startsWith("image/")) {
          // 画像ファイルの場合はArrayBufferとして読み込む
          fileContent = await readFileAsArrayBuffer(file);
        } else {
          throw new Error("サポートされていないファイル形式です");
        }

        setProgress(40);

        // キーワードと概要抽出APIを呼び出す
        const { keywords, summary } = await extractKeywordsAndSummary(
          file,
          fileContent
        );

        setProgress(80);

        // ファイル情報をIndexedDBに保存
        const fileItem: FileItem = {
          name: file.name,
          type: file.type,
          size: file.size,
          blob: file,
          extractedText,
          keywords,
          summary,
          uploadedAt: new Date(),
        };

        const fileId = await db.files.add(fileItem);
        fileItem.id = fileId; // IDを設定

        setProgress(100);

        // 入力フィールドをリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // アップロード完了時にファイル情報を渡す
        onUploadComplete(fileItem);
      } catch (error) {
        console.error("ファイルアップロード中にエラーが発生しました:", error);
        onError(
          error instanceof Error
            ? error.message
            : "ファイルアップロード中にエラーが発生しました"
        );
        onUploadComplete(); // エラー時も完了を通知
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    };

    // ファイルをテキストとして読み込む関数
    const readFileAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    };

    // ファイルをArrayBufferとして読み込む関数
    const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    };

    const getFileTypeIcons = () => {
      return (
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-xs mt-1 text-muted-foreground">テキスト</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
              <FileType className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xs mt-1 text-muted-foreground">PDF</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-2">
              <Image className="h-5 w-5 text-purple-500" />
            </div>
            <span className="text-xs mt-1 text-muted-foreground">画像</span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4" ref={ref}>
        {" "}
        {/* ref を div に設定 */}
        <div
          className={`grid w-full gap-4 ${isUploading ? "" : "cursor-pointer"}`}
          onDragEnter={handleDrag}
        >
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            // onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  ファイルをドラッグ＆ドロップ
                </p>
                <p className="text-sm text-muted-foreground">
                  または、クリックしてファイルを選択
                </p>
              </div>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".txt,.pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("fileInputRef", fileInputRef.current); // ←console.log を追加
                  console.log("fileInputRef");
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                    console.log("fileInputRef");
                  }
                }}
              >
                ファイルを選択
              </Button>
            </div>
            {getFileTypeIcons()}
          </div>
        </div>
        {isUploading && (
          <motion.div
            className="space-y-3 p-4 rounded-lg border bg-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">アップロード中...</p>
                <p className="text-xs text-muted-foreground">
                  ファイルを処理しています。しばらくお待ちください。
                </p>
              </div>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 w-full" />
          </motion.div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload"; // displayName を設定
