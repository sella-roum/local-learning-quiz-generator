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
        const response = await fetch(`/api/document?fileName=${fileName}`); // API ルートを呼び出す
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        let pageContent = data.content;
        pageContent = pageContent.replace(/{domain}/g, `${currentDomain}`);
        setMarkdownContent(pageContent);
      } catch (e: any) {
        console.error("Failed to fetch document:", e);
        setError("ドキュメントの読み込みに失敗しました。"); // エラーメッセージを設定
        setMarkdownContent(null); // markdownContent を null に設定
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
