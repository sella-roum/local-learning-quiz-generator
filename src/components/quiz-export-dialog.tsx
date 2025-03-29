"use client";

import { useCallback, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  FileJson,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import type { Quiz } from "@/lib/db";
import { generateExportJson, downloadJson } from "@/lib/quiz-export-import";
import { motion } from "framer-motion";

interface QuizExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizzes: Quiz[];
}

export function QuizExportDialog({
  open,
  onOpenChange,
  quizzes,
}: QuizExportDialogProps) {
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<number>>(
    new Set()
  );
  const [filename, setFilename] = useState("quizzes-export.json");
  const [error, setError] = useState<string | null>(null);

  // 全選択/解除の処理
  const handleSelectAll = useCallback(() => {
    if (selectedQuizIds.size === quizzes.length) {
      // 全て選択されている場合は解除
      setSelectedQuizIds(new Set());
    } else {
      // そうでなければ全て選択
      setSelectedQuizIds(new Set(quizzes.map((quiz) => quiz.id as number)));
    }
  }, [selectedQuizIds, quizzes]);

  // 個別の選択/解除の処理
  const handleToggleQuiz = useCallback(
    (quizId: number) => {
      const newSelectedIds = new Set(selectedQuizIds);
      if (newSelectedIds.has(quizId)) {
        newSelectedIds.delete(quizId);
      } else {
        newSelectedIds.add(quizId);
      }
      setSelectedQuizIds(newSelectedIds);
    },
    [selectedQuizIds]
  );

  // エクスポートの実行
  const handleExport = useCallback(() => {
    try {
      setError(null);

      if (selectedQuizIds.size === 0) {
        setError("エクスポートするクイズを選択してください");
        return;
      }

      // 選択されたクイズを取得
      const selectedQuizzes = quizzes.filter(
        (quiz) => quiz.id !== undefined && selectedQuizIds.has(quiz.id)
      );

      // JSONを生成してダウンロード
      const jsonString = generateExportJson(selectedQuizzes);
      downloadJson(jsonString, filename);

      // ダイアログを閉じる
      onOpenChange(false);
    } catch (error) {
      console.error("エクスポート中にエラーが発生しました:", error);
      setError(
        "エクスポート中にエラーが発生しました: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [selectedQuizIds, quizzes, filename, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            クイズをエクスポート
          </DialogTitle>
          <DialogDescription>
            エクスポートするクイズを選択してください。選択したクイズはJSONファイルとしてダウンロードされます。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              {selectedQuizIds.size === quizzes.length ? (
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
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {selectedQuizIds.size} / {quizzes.length} 問選択中
            </Badge>
          </div>

          <ScrollArea className="h-[300px] rounded-md border-2 p-4">
            <div className="space-y-4">
              {quizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  className="flex items-start space-x-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <Checkbox
                    id={`quiz-${quiz.id}`}
                    checked={
                      quiz.id !== undefined && selectedQuizIds.has(quiz.id)
                    }
                    onCheckedChange={() =>
                      quiz.id !== undefined && handleToggleQuiz(quiz.id)
                    }
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={`quiz-${quiz.id}`}
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

          <div className="space-y-2">
            <Label htmlFor="filename" className="text-sm">
              ファイル名
            </Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="エクスポートファイル名"
              className="border-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedQuizIds.size === 0}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
