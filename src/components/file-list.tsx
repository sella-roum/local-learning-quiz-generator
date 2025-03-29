"use client";

import type { FileItem } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, formatDate } from "@/lib/utils";
import {
  FileText,
  Image,
  FileType,
  Trash2,
  BookOpen,
  Info,
  Calendar,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface FileListProps {
  files: FileItem[];
  onCreateQuiz: (fileId: number) => void;
  onDeleteFile: (fileId: number) => void;
}

export function FileList({ files, onCreateQuiz, onDeleteFile }: FileListProps) {
  // ファイルタイプに応じたアイコンとカラーを取得
  const getFileIconAndColor = (fileType: string) => {
    if (fileType.startsWith("text/")) {
      return {
        icon: <FileText className="h-8 w-8" />,
        color: "text-blue-500",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
      };
    } else if (fileType.startsWith("image/")) {
      return {
        icon: <Image className="h-8 w-8" />,
        color: "text-purple-500",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
      };
    } else if (fileType === "application/pdf") {
      return {
        icon: <FileType className="h-8 w-8" />,
        color: "text-red-500",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      };
    } else {
      return {
        icon: <FileType className="h-8 w-8" />,
        color: "text-gray-500",
        bgColor: "bg-gray-100 dark:bg-gray-800",
      };
    }
  };

  return (
    // return 文を追加
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {files.map((file, index) => {
        const { icon, color, bgColor } = getFileIconAndColor(file.type);

        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="file-card border-2 h-full">
              <CardHeader className="file-card-header">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${bgColor}`}>{icon}</div>
                  <div>
                    <CardTitle className="file-card-title">
                      {file.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="file-card-meta">
                        {formatFileSize(file.size)} •{" "}
                        {formatDate(file.uploadedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <Tag className="h-3 w-3 text-primary" />
                      <span className="font-medium">キーワード:</span>
                    </div>
                    <div className="file-card-keywords">
                      {file.keywords && file.keywords.length > 0 ? (
                        file.keywords.slice(0, 5).map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {keyword}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          キーワードがありません
                        </span>
                      )}
                      {file.keywords && file.keywords.length > 5 && (
                        <Badge variant="outline">
                          +{file.keywords.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {file.summary && (
                    <div className="text-sm">
                      <span className="font-medium">概要:</span>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {file.summary}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="file-card-actions">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteFile(file.id as number)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                  <Link href={`/files/${file.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-secondary hover:bg-secondary/10"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      詳細
                    </Button>
                  </Link>
                </div>
                <Button
                  size="sm"
                  onClick={() => onCreateQuiz(file.id as number)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  クイズを作成
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
