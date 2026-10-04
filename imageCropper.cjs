// imageCropper.cjs
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

/**
 * 원본 페이지 이미지에서 특정 좌표(문제 영역)만 잘라내어 저장
 * @param {string} sourceImagePath - 원본 페이지 이미지 경로
 * @param {string} outputDir - 잘라낸 이미지를 저장할 폴더
 * @param {string} outputFileName - 저장할 파일명 (예: book1_page3_q5.png)
 * @param {number} x - 시작 x 좌표
 * @param {number} y - 시작 y 좌표
 * @param {number} width - 잘라낼 너비
 * @param {number} height - 잘라낼 높이
 */
async function extractProblemRegion(
  sourceImagePath,
  outputPath,
  x,
  y,
  width,
  height
) {
  try {
    // 1. 원본 이미지 로드
    const image = await loadImage(sourceImagePath);

    // 2. 잘라낼 크기만큼의 캔버스 생성
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    // 3. 원본 이미지의 (x, y) 위치에서 (width, height) 크기만큼을
    //    새 캔버스의 (0, 0) 위치에 (width, height) 크기로 그리기
    context.drawImage(image, x, y, width, height, 0, 0, width, height);

    // 테스트용 : 잘라낸 문제 영역 테두리 표시
    context.strokeStyle = "red";
    context.lineWidth = 2;
    context.strokeRect(0, 0, width, height);

    // 4. 폴더가 없으면 생성
    // 4. 폴더가 없으면 생성
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 5. 이미지 파일로 저장
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);

    console.log(`[문제 추출 완료] ${outputPath}`);

    return {
      success: true,
      imagePath: outputPath
    };

  } catch (error) {
    console.error("[문제 추출 실패]:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

async function cropNumberArea(inputPath, outputPath) {

  const sharp = require("sharp");

  const image = sharp(inputPath);

  const meta = await image.metadata();

  await image
    .extract({
      left: 0,
      top: 0,
      width: 80,
      height: meta.height
    })
    .toFile(outputPath);

  return outputPath;
}

async function drawChangedNumbers(imagePath, changedTokens) {

  console.log("===== DRAW CHANGED NUMBERS =====");
  console.table(changedTokens);

  try {
    const image = await loadImage(imagePath);

    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext("2d");

    // 원본 이미지 복사
    context.drawImage(image, 0, 0);

    for (const token of changedTokens || []) {

      if (!token.bbox) continue;

      const x = token.bbox.x0;
      const y = token.bbox.y0;
      const width = token.bbox.x1 - token.bbox.x0;
      const height = token.bbox.y1 - token.bbox.y0;

      // 기존 숫자를 덮음
      context.fillStyle = "white";
      context.fillRect(
        x - 2,
        y - 2,
        width + 4,
        height + 4
      );

      // 변경된 숫자를 같은 위치에 그림
      context.fillStyle = "black";

      const fontSize = Math.max(12, Math.floor(height * 0.9));

      context.font = `${fontSize}px Arial`;
      context.textBaseline = "top";

      context.fillText(
        String(token.changed),
        x,
        y
      );
    }

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(imagePath, buffer);

    console.log("===== 변경 숫자 이미지 저장 완료 =====");
    console.log("imagePath:", imagePath);

    return {
      success: true,
      imagePath
    };

  } catch (error) {

    console.error("===== 숫자 변경 이미지 생성 실패 =====", error);

    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  extractProblemRegion,
  cropNumberArea,
  drawChangedNumbers
};