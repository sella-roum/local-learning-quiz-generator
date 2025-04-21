"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDate } from "@/lib/utils";
import {
  AlertCircle,
  Edit,
  Play,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  Calendar,
  Tag,
  FileText,
  List,
} from "lucide-react";
import { QuizExportDialog } from "@/components/quiz-export-dialog";
import { QuizImportDialog } from "@/components/quiz-import-dialog";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function QuizzesPage() {
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const router = useRouter();

  // クイズとファイル情報を結合して取得
  const quizzesWithFiles = useLiveQuery(async () => {
    const quizzes = await db.quizzes.orderBy("createdAt").reverse().toArray();

    // ファイルIDの一覧を取得
    const fileIds = [
      ...new Set(
        quizzes
          .map((quiz) => quiz.fileId)
          .filter((id): id is number => id !== undefined)
      ),
    ];

    // ファイル情報を一括取得
    const files = await db.files.where("id").anyOf(fileIds).toArray();
    const fileMap = new Map(files.map((file) => [file.id, file]));

    // クイズとファイル情報を結合
    return quizzes.map((quiz) => ({
      ...quiz,
      file: quiz.fileId ? fileMap.get(quiz.fileId) : undefined,
    }));
  });

  // カテゴリの一覧を取得
  const categories = useLiveQuery(async () => {
    const quizzes = await db.quizzes.toArray();
    const categorySet = new Set(
      quizzes.map((quiz) => quiz.category).filter(Boolean)
    );
    return Array.from(categorySet);
  });

  // フィルタリングされたクイズ
  const filteredQuizzes = quizzesWithFiles
    ? quizzesWithFiles.filter((quiz) => {
        // カテゴリでフィルタリング
        const categoryMatch =
          selectedCategory === "all" || quiz.category === selectedCategory;

        // 検索語でフィルタリング
        const searchMatch =
          searchTerm === "" ||
          quiz.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quiz.options.some((option) =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          (quiz.explanation &&
            quiz.explanation.toLowerCase().includes(searchTerm.toLowerCase()));

        return categoryMatch && searchMatch;
      })
    : [];

  // ページネーション用の計算
  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredQuizzes.length);
  const currentQuizzes = filteredQuizzes.slice(startIndex, endIndex);

  // ページ変更時に先頭にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // クイズを削除する関数
  const handleDeleteQuiz = async (quizId: number) => {
    try {
      setIsDeleting(quizId);

      // 関連する結果も削除
      await db.results.where("quizId").equals(quizId).delete();

      // クイズを削除
      await db.quizzes.delete(quizId);

      // 現在のページのクイズが1つだけで、最後のページの場合は前のページに戻る
      if (
        currentQuizzes.length === 1 &&
        currentPage > 1 &&
        currentPage === totalPages
      ) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("クイズの削除中にエラーが発生しました:", error);
      setError("クイズの削除中にエラーが発生しました");
    } finally {
      setIsDeleting(null);
    }
  };

  // すべてのクイズを削除する関数
  const handleDeleteAllQuizzes = async () => {
    try {
      // すべての結果を削除
      await db.results.clear();

      // すべてのセッションを削除
      await db.sessions.clear();

      // すべてのクイズを削除
      await db.quizzes.clear();

      setIsDeleteAllDialogOpen(false);
    } catch (error) {
      console.error("クイズの一括削除中にエラーが発生しました:", error);
      setError("クイズの一括削除中にエラーが発生しました");
    }
  };

  // クイズを編集する関数
  const handleEditQuiz = (quizId: number) => {
    router.push(`/quizzes/${quizId}/edit`);
  };

  // 検索語が変更されたときにページをリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // ページネーションリンクを生成
  const renderPaginationLinks = () => {
    const links = [];

    // 最初のページへのリンク
    if (currentPage > 2) {
      links.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      );
    }

    // 省略記号
    if (currentPage > 3) {
      links.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // 前のページへのリンク
    if (currentPage > 1) {
      links.push(
        <PaginationItem key={currentPage - 1}>
          <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>
            {currentPage - 1}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // 現在のページ
    links.push(
      <PaginationItem key={currentPage}>
        <PaginationLink isActive onClick={() => setCurrentPage(currentPage)}>
          {currentPage}
        </PaginationLink>
      </PaginationItem>
    );

    // 次のページへのリンク
    if (currentPage < totalPages) {
      links.push(
        <PaginationItem key={currentPage + 1}>
          <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>
            {currentPage + 1}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // 省略記号
    if (currentPage < totalPages - 2) {
      links.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // 最後のページへのリンク
    if (currentPage < totalPages - 1 && totalPages > 1) {
      links.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return links;
  };

  // インポート完了時の処理
  const handleImportComplete = () => {
    // エラーをクリア
    setError(null);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="page-header">
          <h2 className="page-title">クイズ一覧</h2>
          <p className="page-description">
            作成したクイズの一覧です。編集や削除ができます。
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="search"
                placeholder="クイズを検索..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="カテゴリ" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリ</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              title="JSONファイルからクイズをインポート"
              className="bg-secondary/10 hover:bg-secondary/20 text-secondary hover:text-secondary"
            >
              <Upload className="mr-2 h-4 w-4" />
              インポート
            </Button>

            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(true)}
              disabled={!quizzesWithFiles || quizzesWithFiles.length === 0}
              title="選択したクイズをJSONファイルにエクスポート"
              className="bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary"
            >
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>

            <Link href="/play">
              <Button
                disabled={!quizzesWithFiles || quizzesWithFiles?.length === 0}
                className="bg-accent hover:bg-accent/90"
              >
                <Play className="mr-2 h-4 w-4" />
                クイズに挑戦
              </Button>
            </Link>
          </div>
        </div>

        {filteredQuizzes.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <List className="h-4 w-4" />全{filteredQuizzes.length}問中{" "}
                {startIndex + 1}〜{endIndex}
                問目を表示
              </div>

              <div className="flex items-center gap-2">
                {categories && categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedCategory !== "all" && (
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                        {selectedCategory}
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge className="bg-secondary/20 text-secondary hover:bg-secondary/30">
                        検索: {searchTerm}
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteAllDialogOpen(true)}
                  className="text-destructive hover:bg-destructive/100"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  すべて削除
                </Button>
              </div>
            </div>

            <AnimatePresence>
              <motion.div
                className="gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {currentQuizzes.map((quiz, index) => (
                  <motion.div
                    className="py-2"
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="card-hover border-2 overflow-hidden">
                      <CardHeader className="pb-2 bg-gradient-to-r from-background to-muted/50">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 overflow-hidden min-w-0">
                            <CardTitle className="text-lg">
                              {quiz.question}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-primary/10"
                              >
                                {quiz.category || "一般"}
                              </Badge>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(quiz.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Tag className="h-4 w-4 text-primary" />
                              <span className="font-medium">選択肢:</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {quiz.options.map((option, index) => (
                                <div
                                  key={index}
                                  className={`px-3 py-2 rounded-md border ${
                                    index === quiz.correctOptionIndex
                                      ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                                      : "bg-muted/50 border-border"
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <span className="font-bold mr-2 text-primary">
                                      {String.fromCharCode(65 + index)}.
                                    </span>
                                    <span>{option}</span>
                                    {index === quiz.correctOptionIndex && (
                                      <CheckCircle className="ml-auto h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {quiz.explanation && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <FileText className="h-4 w-4 text-secondary" />
                                <span className="font-medium">解説:</span>
                              </div>
                              <p className="mt-1 text-sm bg-muted/50 p-2 rounded-md border">
                                {quiz.explanation}
                              </p>
                            </div>
                          )}

                          {quiz.file && (
                            <div className="text-sm">
                              <span className="font-medium">元ファイル:</span>{" "}
                              <Badge
                                variant="outline"
                                className="ml-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              >
                                {quiz.file.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex pt-6 justify-between border-t bg-muted/20">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz.id as number)}
                          disabled={isDeleting === quiz.id}
                          className="text-destructive hover:bg-destructive/100"
                        >
                          {isDeleting === quiz.id ? (
                            <>
                              <span className="animate-spin mr-1">⏳</span>{" "}
                              削除中...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              削除
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuiz(quiz.id as number)}
                          className="text-primary hover:bg-primary/100"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      aria-disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {renderPaginationLinks()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      aria-disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <Card className="border-2 border-dashed p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-primary/10 p-3">
                <List className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">クイズがありません</h3>
                <p className="text-muted-foreground">
                  \
                  {searchTerm || selectedCategory !== "all"
                    ? "検索条件に一致するクイズがありません。"
                    : "クイズがありません。ファイル管理画面からファイルを選択し、クイズを作成してください。"}
                </p>
              </div>
              <div className="flex gap-4 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                  className="bg-secondary/10 hover:bg-secondary/20 text-secondary hover:text-secondary"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  インポート
                </Button>
                <Link href="/files">
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    ファイル管理へ
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* エクスポートダイアログ */}
      <QuizExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        quizzes={quizzesWithFiles || []}
      />

      {/* インポートダイアログ */}
      <QuizImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />

      {/* 全クイズ削除確認ダイアログ */}
      <Dialog
        open={isDeleteAllDialogOpen}
        onOpenChange={setIsDeleteAllDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>すべてのクイズを削除</DialogTitle>
            <DialogDescription>
              すべてのクイズと関連する回答履歴を削除します。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteAllDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllQuizzes}>
              すべて削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
