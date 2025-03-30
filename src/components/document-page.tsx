"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface DocumentPageProps {
  fileName: string;
}

const DocumentPage: React.FC<DocumentPageProps> = ({ fileName }) => {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // エラー表示用

  useEffect(() => {
    const fetchDocument = async () => {
      const currentDomain = window.location.origin;
      try {
        // APIルートではなく直接ファイルを取得
        const response = await fetch(`/documents/${fileName}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        let markdownContent = await response.text(); // JSONではなくテキストとして取得
        markdownContent = markdownContent.replace(
          /images\//g,
          "/documents/images/" // 画像パスの置換は必要に応じて維持
        );
        markdownContent = markdownContent.replace(
          /{domain}/g,
          `${currentDomain}`
        );
        setMarkdownContent(markdownContent);
      } catch (e: any) {
        console.error("Failed to fetch document:", e);
        setError("ドキュメントの読み込みに失敗しました。");
        setMarkdownContent(null);
      }
    };

    fetchDocument();
  }, [fileName]);

  if (error) {
    return <div>{error}</div>; // エラーメッセージを表示
  }

  if (markdownContent === null) {
    return <div>Loading document...</div>; // ローディング表示
  }

  return (
    <div className="mx-auto px-4 py-8 bg-white rounded-lg shadow-lg">
      <div className="container prose prose-sm max-w-none sm:prose lg:prose-lg xl:prose-xl">
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>
    </div>
  );
};

export default DocumentPage;
