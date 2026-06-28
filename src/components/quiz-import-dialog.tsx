"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  FileUp,
  Upload,
  Check,
  CheckSquare,
  Square,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  validateImportedJson,
  convertImportedQuizToDbFormat,
  createQuizDuplicateKey,
  type QuizExportFile,
} from "@/lib/quiz-export-import";
import { motion } from "framer-motion";

interface QuizImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function QuizImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: QuizImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<QuizExportFile | null>(null);
  const [selectedQuizIndices, setSelectedQuizIndices] = useState<Set<number>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImportComplete, setIsImportComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル選択時の処理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);
    setError(null);
    setImportedData(null);
    setSelectedQuizIndices(new Set());
    setIsImportComplete(false);

    try {
      // ファイルを読み込む
      const fileContent = await readFileAsText(selectedFile);

      // JSONを検証
      const validationResult = validateImportedJson(fileContent);

      if (!validationResult.valid || !validationResult.data) {
        setError(validationResult.error || "不明なエラーが発生しました");
        return;
      }

      // 検証に成功したらデータを設定
      setImportedData(validationResult.data);

      // デフォルトで全て選択
      setSelectedQuizIndices(
        new Set(validationResult.data.quizzes.map((_, index) => index))
      );
    } catch (error) {
      console.error("ファイル読み込み中にエラーが発生しました:", error);
      setError(
        "ファイル読み込み中にエラーが発生しました: " +
          (error instanceof Error ? error.message : String(error))
      );
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

  // 全選択/解除の処理
  const handleSelectAll = useCallback(() => {
    if (!importedData) return;

    if (selectedQuizIndices.size === importedData.quizzes.length) {
      // 全て選択されている場合は解除
      setSelectedQuizIndices(new Set());
    } else {
      // そうでなければ全て選択
      setSelectedQuizIndices(
        new Set(importedData.quizzes.map((_, index) => index))
      );
    }
  }, [importedData, selectedQuizIndices]);

  // 個別の選択/解除の処理
  const handleToggleQuiz = useCallback(
    (index: number) => {
      const newSelectedIndices = new Set(selectedQuizIndices);
      if (newSelectedIndices.has(index)) {
        newSelectedIndices.delete(index);
      } else {
        newSelectedIndices.add(index);
      }
      setSelectedQuizIndices(newSelectedIndices);
    },
    [selectedQuizIndices]
  );

  // インポートの実行
  const handleImport = useCallback(async () => {
    if (!importedData) return;

    try {
      setError(null);
      setImportSummary(null);
      setImportProgress(0);
      setIsLoading(true);

      if (selectedQuizIndices.size === 0) {
        setError("インポートするクイズを選択してください");
        return;
      }

      // 選択されたクイズを取得
      const selectedQuizzes = Array.from(selectedQuizIndices).map(
        (index) => importedData.quizzes[index]
      );

      // DB形式に変換（変換失敗を事前にカウントするため）
      const dbEntries: Array<{ key: string; quiz: ReturnType<typeof convertImportedQuizToDbFormat> }> = [];
      let conversionFailedCount = 0;

      for (const quiz of selectedQuizzes) {
        try {
          const dbQuiz = convertImportedQuizToDbFormat(quiz);
          const key = createQuizDuplicateKey({
            question: quiz.question,
            options: quiz.options,
            correctOptionIndex: quiz.correctOptionIndex,
          });
          dbEntries.push({ key, quiz: dbQuiz });
        } catch {
          conversionFailedCount++;
        }
      }

      setImportProgress(40);

      // 既存の全クイズのキーを事前に取得（重複検知用）
      const existingQuizzes = await db.quizzes.toArray();
      const existingKeys = new Set(
        existingQuizzes.map((q) =>
          createQuizDuplicateKey({
            question: q.question,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
          })
        )
      );

      // 重複チェック（同一ファイル内の重複も防止するために separateKeys を構築）
      const toAdd: Array<ReturnType<typeof convertImportedQuizToDbFormat>> = [];
      let duplicateCount = 0;
      const currentFileKeys = new Set<string>();

      for (const entry of dbEntries) {
        if (existingKeys.has(entry.key) || currentFileKeys.has(entry.key)) {
          duplicateCount++;
          continue;
        }
        toAdd.push(entry.quiz);
        currentFileKeys.add(entry.key);
      }

      setImportProgress(70);

      // トランザクション内で一括追加
      if (toAdd.length > 0) {
        await db.transaction("rw", db.quizzes, async () => {
          await db.quizzes.bulkAdd(toAdd);
        });
      }

      setImportProgress(100);
      setIsImportComplete(true);
      setImportSummary(
        `追加 ${toAdd.length}件 / 重複スキップ ${duplicateCount}件` +
          (conversionFailedCount > 0
            ? ` / 変換失敗 ${conversionFailedCount}件`
            : "")
      );
      onImportComplete();

      // 少し待ってから閉じる
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (err) {
      console.error("インポート中にエラーが発生しました:", err);
      setError(
        "インポート中にエラーが発生しました: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsLoading(false);
    }
  }, [importedData, selectedQuizIndices, onImportComplete, onOpenChange]);

  // フォームをリセット
  const resetForm = () => {
    setFile(null);
    setImportedData(null);
    setSelectedQuizIndices(new Set());
    setError(null);
    setImportSummary(null);
    setIsLoading(false);
    setImportProgress(0);
    setIsImportComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ダイアログが閉じられたときにフォームをリセット
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetForm();
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            クイズをインポート
          </DialogTitle>
          <DialogDescription>
            JSONファイルからクイズをインポートします。インポートするクイズを選択してください。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {importSummary && (
          <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle>インポート完了</AlertTitle>
            <AlertDescription>{importSummary}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {!importedData ? (
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="import-file">JSONファイルを選択</Label>
                <input
                  ref={fileInputRef}
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <FileUp className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">
                        JSONファイルを選択
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        クリックしてファイルを選択するか、ここにドラッグ＆ドロップしてください
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      ファイルを選択
                    </Button>
                  </div>
                </div>
                {file && (
                  <motion.p
                    className="text-sm text-muted-foreground mt-2 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <FileUp className="h-4 w-4" />
                    選択されたファイル: {file.name} (
                    {(file.size / 1024).toFixed(1)} KB)
                  </motion.p>
                )}
              </div>
            </div>
          ) : (
            <>
              {isImportComplete ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">インポート完了</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {importSummary || `${selectedQuizIndices.size}問のクイズがインポートされました`}
                  </p>
                </motion.div>
              ) : isLoading ? (
                <div className="space-y-4 py-4">
                  <p className="text-center font-medium">インポート中...</p>
                  <Progress value={importProgress} className="h-2 w-full" />
                  <p className="text-center text-sm text-muted-foreground">
                    {importProgress}% 完了
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="flex items-center gap-2"
                    >
                      {selectedQuizIndices.size ===
                      importedData.quizzes.length ? (
                        <>
                          <CheckSquare className="h-4 w-4" />
                          全て解除
                        </>
                      ) : (
                        <>
                          <Square className="h-4 w-4" />
                          全て選択
                        </>
                      )}
                    </Button>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary"
                    >
                      {selectedQuizIndices.size} / {importedData.quizzes.length}{" "}
                      問選択中
                    </Badge>
                  </div>

                  <ScrollArea className="h-[300px] rounded-md border-2 p-4">
                    <div className="space-y-4">
                      {importedData.quizzes.map((quiz, index) => (
                        <motion.div
                          key={index}
                          className="flex items-start space-x-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                        >
                          <Checkbox
                            id={`import-quiz-${index}`}
                            checked={selectedQuizIndices.has(index)}
                            onCheckedChange={() => handleToggleQuiz(index)}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label
                              htmlFor={`import-quiz-${index}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {quiz.question}
                            </Label>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs bg-primary/10"
                              >
                                {quiz.category || "一般"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                選択肢: {quiz.options.length}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {isImportComplete ? "閉じる" : "キャンセル"}
          </Button>
          {importedData && !isImportComplete && !isLoading && (
            <Button
              onClick={handleImport}
              disabled={selectedQuizIndices.size === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              インポート
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
