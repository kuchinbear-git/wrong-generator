const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

/**
 * PDF의 첫 페이지를 PNG로 변환
 */
async function convertFirstPageToPng(pdfPath, outputDir) {
  try {
    console.log(`[PDF 변환 시작] ${pdfPath}`);

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    const pageNumber = 1;
    const page = await pdfDocument.getPage(pageNumber);

    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `page_${pageNumber}.png`);

    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(outputPath);
      canvas.createPNGStream().pipe(out);

      out.on("finish", resolve);
      out.on("error", reject);
    });

    console.log(`[PNG 저장 완료] ${outputPath}`);

    return {
      success: true,
      outputPath,
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: error.message,
    };

  }
}

/**
 * PDF 전체 페이지를 PNG로 변환
 */
async function convertPdfToImages(pdfPath, outputDir) {

  try {

    console.log(`[전체 PDF 변환] ${pdfPath}`);

    const data = new Uint8Array(fs.readFileSync(pdfPath));

    const loadingTask = pdfjsLib.getDocument({ data });

    const pdfDocument = await loadingTask.promise;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {

      console.log(`페이지 ${pageNumber} 변환`);

      const page = await pdfDocument.getPage(pageNumber);

      const scale = 2.0;

      const viewport = page.getViewport({ scale });

      const canvas = createCanvas(viewport.width, viewport.height);

      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const outputPath = path.join(
        outputDir,
        `page_${String(pageNumber).padStart(3, "0")}.png`
      );

      await new Promise((resolve, reject) => {

        const out = fs.createWriteStream(outputPath);

        canvas.createPNGStream().pipe(out);

        out.on("finish", resolve);

        out.on("error", reject);

      });

      pages.push({
        page: pageNumber,
        image: outputPath,
        width: viewport.width,
        height: viewport.height
      });

      console.log(`저장 완료 : ${outputPath}`);

    }

    return {

      success: true,

      totalPages: pdfDocument.numPages,

      pages,

    };

  } catch (error) {

    console.error(error);

    return {

      success: false,

      message: error.message,

    };

  }

}

/**
 * PDF 전체 페이지 수만 확인
 * 실제 PNG 변환은 하지 않음
 */
async function getPdfPageCount(pdfPath) {

  try {

    const data =
      new Uint8Array(fs.readFileSync(pdfPath));

    const loadingTask =
      pdfjsLib.getDocument({ data });

    const pdfDocument =
      await loadingTask.promise;

    return {
      success: true,
      totalPages: pdfDocument.numPages
    };

  } catch (error) {

    console.error(
      "[PDF 페이지 수 확인 실패]",
      error
    );

    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {

  convertFirstPageToPng,

  convertPdfToImages,

  getPdfPageCount,

};