const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

async function splitImage(imagePath, outputDir) {

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const image = await loadImage(imagePath);

  const width = image.width;
  const height = image.height;

  /*
   * 1. 원본 이미지를 canvas에 올려
   *    중앙 세로 분리선 위치를 찾습니다.
   */
  const analysisCanvas = createCanvas(width, height);
  const analysisCtx = analysisCanvas.getContext("2d");

  analysisCtx.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  const pixels = analysisCtx.getImageData(
    0,
    0,
    width,
    height
  ).data;

  /*
   * 중앙 부근만 검색합니다.
   * 이 교재는 좌우 2열 구조이므로
   * 페이지 정중앙 주변에 분리선이 있다고 가정합니다.
   */
  const searchStart = Math.floor(width * 0.40);
  const searchEnd = Math.floor(width * 0.60);

  /*
   * 제목/상단 장식과 하단 페이지 번호는 제외하고
   * 본문 영역에서 세로선을 찾습니다.
   */
  const scanTop = Math.floor(height * 0.15);
  const scanBottom = Math.floor(height * 0.92);

  let detectedSplitX = Math.floor(width / 2);
  let bestScore = 0;

  for (let x = searchStart; x <= searchEnd; x++) {

    let grayCount = 0;
    let currentRun = 0;
    let maxRun = 0;

    for (let y = scanTop; y <= scanBottom; y++) {

      const index =
        (y * width + x) * 4;

      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];

      /*
       * 교재의 중앙 분리선처럼
       * 무채색(gray)에 가까운 밝은 선을 찾습니다.
       */
      const isGrayLine =
        Math.abs(r - g) <= 5 &&
        Math.abs(g - b) <= 5 &&
        r >= 150 &&
        r <= 235;

      if (isGrayLine) {

        grayCount++;
        currentRun++;

        if (currentRun > maxRun) {
          maxRun = currentRun;
        }

      } else {

        currentRun = 0;

      }
    }

    /*
     * 단순히 픽셀 수만 보지 않고
     * 세로로 길게 이어지는 정도도 함께 평가합니다.
     */
    const score =
      grayCount + maxRun * 2;

    if (score > bestScore) {

      bestScore = score;
      detectedSplitX = x;

    }
  }

  console.log("===== 중앙 분리선 탐지 =====");
  console.log("원본 width =", width);
  console.log("탐지된 splitX =", detectedSplitX);
  console.log("분리선 score =", bestScore);

  /*
   * 중앙선 자체가 이미지에 포함되지 않도록
   * 좌우 각각 몇 픽셀씩 제거합니다.
   */
  const leftGap = 4;
  const rightGap = 20;

  const leftWidth =
    detectedSplitX - leftGap;

  const rightX =
    detectedSplitX + rightGap;

  const rightWidth =
    width - rightX;

  console.log("leftWidth =", leftWidth);
  console.log("rightX =", rightX);
  console.log("rightWidth =", rightWidth);

  /*
   * 2. 왼쪽 이미지
   */
  const leftCanvas = createCanvas(
    leftWidth,
    height
  );

  const leftCtx = leftCanvas.getContext("2d");

  leftCtx.drawImage(
    image,
    0,
    0,
    leftWidth,
    height,
    0,
    0,
    leftWidth,
    height
  );

  const baseName =
    path.basename(
      imagePath,
      path.extname(imagePath)
    );

  const leftPath = path.join(
    outputDir,
    `${baseName}_left.png`
  );

  fs.writeFileSync(
    leftPath,
    leftCanvas.toBuffer("image/png")
  );

  console.log("LEFT 저장:", leftPath);

  /*
   * 3. 오른쪽 이미지
   */
  const rightCanvas = createCanvas(
    rightWidth,
    height
  );

  const rightCtx = rightCanvas.getContext("2d");

  rightCtx.drawImage(
    image,
    rightX,
    0,
    rightWidth,
    height,
    0,
    0,
    rightWidth,
    height
  );

  const rightPath = path.join(
    outputDir,
    `${baseName}_right.png`
  );

  fs.writeFileSync(
    rightPath,
    rightCanvas.toBuffer("image/png")
  );

  console.log("RIGHT 저장:", rightPath);

  return {
    success: true,
    leftPath,
    rightPath,
    leftWidth,
    rightWidth,
    rightX,
    totalWidth: width,
    height
  };
}

module.exports = {
  splitImage
};