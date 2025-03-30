"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBytes, formatDate } from "@/lib/utils";
import type { FileItem } from "@/lib/db";
import {
  FileText,
  Image,
  FileArchive,
  File,
  Trash2,
  Info,
  PlusCircle,
  CheckSquare,
} from "lucide-react";
import { motion } from "framer-motion";

interface FileListProps {
  files: FileItem[];
  onCreateQuiz: (fileId: number) => void;
  onDeleteFile: (fileId: number) => void;
  onCreateMultiQuiz?: (fileIds: number[]) => void;
}

export function FileList({
  files,
  onCreateQuiz,
  onDeleteFile,
  onCreateMultiQuiz,
}: FileListProps) {
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // ファイルタイプに応じたアイコンを返す関数
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("text/")) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (fileType.startsWith("image/")) {
      return <Image className="h-5 w-5 text-green-500" />;
    } else if (fileType === "application/pdf") {
      return <FileArchive className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // ファイル選択の切り替え
  const toggleFileSelection = (fileId: number) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter((id) => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };

  // 選択モードの切り替え
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedFiles([]);
    }
  };

  // 複数ファイルからクイズを作成
  const handleCreateMultiQuiz = () => {
    if (selectedFiles.length > 0 && onCreateMultiQuiz) {
      onCreateMultiQuiz(selectedFiles);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectionMode}
          className={isSelectionMode ? "bg-primary/20 text-primary" : ""}
        >
          <CheckSquare className="mr-2 h-4 w-4" />
          {isSelectionMode ? "選択モード終了" : "複数選択"}
        </Button>

        {isSelectionMode && (
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {selectedFiles.length}個のファイルを選択中
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateMultiQuiz}
              disabled={selectedFiles.length === 0}
              className="bg-accent/100 hover:bg-primary/100 text-accent-foreground"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              選択したファイルからクイズを作成
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-2">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-background p-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isSelectionMode && (
                      <Checkbox
                        checked={selectedFiles.includes(file.id as number)}
                        onCheckedChange={() =>
                          toggleFileSelection(file.id as number)
                        }
                        className="mr-1"
                      />
                    )}
                    {getFileIcon(file.type)}
                    <CardTitle className="text-base truncate max-w-[200px]">
                      {file.name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">サイズ:</span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      アップロード日:
                    </span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                  {file.keywords && file.keywords.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">キーワード:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.keywords.slice(0, 3).map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {keyword}
                          </Badge>
                        ))}
                        {file.keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{file.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-4 border-t bg-muted/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteFile(file.id as number)}
                  className="text-destructive hover:bg-destructive/100"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  削除
                </Button>
                <Link href={`/files/${file.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-secondary hover:bg-secondary/100"
                  >
                    <Info className="h-4 w-4 mr-1" />
                    詳細
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateQuiz(file.id as number)}
                  className="bg-primary/10 hover:bg-primary/100 text-primary"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  クイズ作成
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
