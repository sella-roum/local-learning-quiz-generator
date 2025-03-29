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
    // const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry");
    // pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    // PDFドキュメントを読み込む
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let extractedText = "";

    // 各ページからテキストを抽出
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: TextItem | TextMarkedContent) =>
          "str" in item ? item.str : ""
        )
        .join(" ");

      extractedText += pageText + "\n\n";
    }

    return extractedText.trim();
  } catch (error) {
    console.error("PDFからのテキスト抽出中にエラーが発生しました:", error);
    throw new Error("PDFからのテキスト抽出に失敗しました");
  }
}
