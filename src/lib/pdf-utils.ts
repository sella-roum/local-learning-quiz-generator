import * as pdfjs from "pdfjs-dist";
import type {
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

// PDFからテキストを抽出する関数
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // PDFファイルをArrayBufferとして読み込む
    const arrayBuffer = await file.arrayBuffer();

    // PDFJSを初期化
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      // ワーカーのURLを設定（CDNを使用）
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    }

    // PDFドキュメントを読み込む（cMapのオプションを追加）
    try {
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;

      let extractedText = "";

      // 各ページからテキストを抽出
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: TextItem | TextMarkedContent) =>
              "str" in item ? item.str : ""
            )
            .join(" ");
          extractedText += pageText + "\n\n";
        } catch (pageError) {
          console.warn(
            `ページ ${i} のテキスト抽出中にエラーが発生しました:`,
            pageError
          );
          // 個別のページエラーは無視して続行
          continue;
        }
      }

      return extractedText.trim() || "テキストを抽出できませんでした";
    } catch (pdfError) {
      console.error("PDFの読み込み中にエラーが発生しました:", pdfError);
      return "";
    }
  } catch (error) {
    console.error("PDFからのテキスト抽出中にエラーが発生しました:", error);
    return "PDFからのテキスト抽出に失敗しました";
  }
}
