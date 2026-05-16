import path from "node:path";
import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";

async function extractPdfText(filePath) {
  const data = await fs.readFile(filePath);
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText({ pageJoiner: "\n\n" });
    const text = result.text.trim();

    if (!text) {
      throw new Error("This PDF does not contain extractable text. Scanned image-only PDFs need OCR before comparison.");
    }

    return { text, pages: result.total || null };
  } finally {
    await parser.destroy();
  }
}

export async function readComparableFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    const pdf = await extractPdfText(filePath);
    return { text: pdf.text, type: "pdf", pages: pdf.pages };
  }

  return {
    text: await fs.readFile(filePath, "utf8"),
    type: "text",
    pages: null
  };
}
