const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { createCanvas, loadImage } = require("canvas");
const { electron } = require("process");

/**
 * 저장된 문제 이미지들을 PDF로 생성
 *
 * @param {Array} problems
 * @param {string} outputPath
 */
async function createWrongProblemPdf(problems, outputPath) {

  if (!Array.isArray(problems) || problems.length === 0) {
    throw new Error("PDF로 만들 문제가 없습니다.");
  }

  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 30
  });

  // Windows 기본 한글 폰트 등록
  const koreanFontPath = path.join(
    process.env.WINDIR || "C:\\Windows",
    "Fonts",
    "malgun.ttf"
  );

  if (!fs.existsSync(koreanFontPath)) {
    throw new Error(`한글 폰트를 찾을 수 없습니다: ${koreanFontPath}`);
  }

  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  for (let i = 0; i < problems.length; i++) {

    const problem = problems[i];

    if (!problem.image_path) {
      console.warn(
        `[PDF 제외] 이미지 경로가 없습니다: ${problem.question_num}`
      );
      continue;
    }

    if (!fs.existsSync(problem.image_path)) {
      console.warn(
        `[PDF 제외] 이미지 파일이 없습니다: ${problem.image_path}`
      );
      continue;
    }

    if (i > 0) {
      doc.addPage();
    }

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 30;

    const maxWidth = pageWidth - margin * 2;

    let imageTop = margin;
    let maxHeight = pageHeight - margin * 2;

    // 첫 페이지에만 제목 / 학생명 / 날짜 표시
    if (i === 0) {

      const pathParts = outputPath
        .replace(/\\/g, "/")
        .split("/");

      const dateText =
        pathParts.length >= 2
          ? pathParts[pathParts.length - 2]
          : "";

      const studentName =
        pathParts.length >= 3
          ? pathParts[pathParts.length - 3]
          : "학생";

      const titleCanvas = createCanvas(800, 180);
      const titleCtx = titleCanvas.getContext("2d");

      titleCtx.font = "bold 36px 'Malgun Gothic'";
      titleCtx.fillStyle = "black";

      titleCtx.fillText("오답 문제", 0, 40);

      titleCtx.font = "22px 'Malgun Gothic'";
      titleCtx.fillText(`학생: ${studentName}`, 0, 85);
      titleCtx.fillText(`생성일: ${dateText}`, 0, 125);

      const titleImage = titleCanvas.toBuffer("image/png");

      doc.image(
        titleImage,
        margin,
        margin,
        {
          width: maxWidth
        }
      );

      imageTop = margin + 95;
      maxHeight = pageHeight - imageTop - margin;
    }

    doc.image(
      problem.image_path,
      margin,
      imageTop,
      {
        fit: [maxWidth, maxHeight],
        align: "center",
        valign: "center"
      }
    );
  }

  doc.end();

  await new Promise((resolve, reject) => {

    stream.on("finish", resolve);
    stream.on("error", reject);

  });

  console.log(`[PDF 생성 완료] ${outputPath}`);

  return {
    success: true,
    outputPath,
    count: problems.length
  };
}

async function calculateExamLayout(problems) {

  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const margin = 30;
  const headerHeight = 65;
  const columnGap = 15;
  const rowGap = 15;

  const contentTop = margin + headerHeight;
  const contentBottom = pageHeight - margin;

  const columnWidth =
    (pageWidth - margin * 2 - columnGap) / 2;

  const columnX = [
    margin,
    margin + columnWidth + columnGap
  ];

  const layout = [];

  let problemIndex = 0;
  let page = 1;

  while (problemIndex < problems.length) {

    const leftItems = [];
    const rightItems = [];

    let leftY = contentTop;
    let rightY = contentTop;

    /*
     * 현재 페이지의 왼쪽 열을 먼저 채웁니다.
     */
    while (problemIndex < problems.length) {

      const problem = problems[problemIndex];

      if (
        !problem.image_path ||
        !fs.existsSync(problem.image_path)
      ) {
        problemIndex++;
        continue;
      }

      const image = await loadImage(problem.image_path);

      const originalWidth = image.width;
      const originalHeight = image.height;

      const scale =
        columnWidth / originalWidth;

      const displayWidth = columnWidth;
      const displayHeight =
        originalHeight * scale;

      const answerHeight =
        problem.answer ? 25 : 0;

      const totalHeight =
        displayHeight +
        answerHeight;

      if (
        leftItems.length > 0 &&
        leftY + totalHeight > contentBottom
      ) {
        break;
      }

      leftItems.push({
        problem,
        originalWidth,
        originalHeight,
        displayWidth,
        displayHeight,
        answerHeight,
        totalHeight
      });

      leftY += totalHeight + rowGap;
      problemIndex++;
    }

    /*
     * 현재 페이지의 오른쪽 열을
     * 왼쪽에 이어지는 문제부터 채웁니다.
     */
    while (problemIndex < problems.length) {

      const problem = problems[problemIndex];

      if (
        !problem.image_path ||
        !fs.existsSync(problem.image_path)
      ) {
        problemIndex++;
        continue;
      }

      const image = await loadImage(problem.image_path);

      const originalWidth = image.width;
      const originalHeight = image.height;

      const scale =
        columnWidth / originalWidth;

      const displayWidth = columnWidth;
      const displayHeight =
        originalHeight * scale;

      const answerHeight =
        problem.answer ? 25 : 0;

      const totalHeight =
        displayHeight +
        answerHeight;

      if (
        rightItems.length > 0 &&
        rightY + totalHeight > contentBottom
      ) {
        break;
      }

      rightItems.push({
        problem,
        originalWidth,
        originalHeight,
        displayWidth,
        displayHeight,
        answerHeight,
        totalHeight
      });

      rightY += totalHeight + rowGap;
      problemIndex++;
    }

    /*
     * 왼쪽 열을 최종 layout에 추가합니다.
     */
    let y = contentTop;

    for (const item of leftItems) {

      layout.push({
        question_num: item.problem.question_num,
        page_num: item.problem.page_num,
        wrong_count: item.problem.wrong_count,
        correct_count: item.problem.correct_count,
        answer: item.problem.answer,
        image_path: item.problem.image_path,
        originalWidth: item.originalWidth,
        originalHeight: item.originalHeight,
        column: 1,
        x: columnX[0],
        y,
        displayWidth: item.displayWidth,
        displayHeight: item.displayHeight,
        page,
        pageBreak: page > 1
      });

      y += item.totalHeight + rowGap;
    }

    /*
     * 오른쪽 열을 최종 layout에 추가합니다.
     */
    y = contentTop;

    for (const item of rightItems) {

      layout.push({
        question_num: item.problem.question_num,
        page_num: item.problem.page_num,
        wrong_count: item.problem.wrong_count,
        correct_count: item.problem.correct_count,
        answer: item.problem.answer,
        image_path: item.problem.image_path,
        originalWidth: item.originalWidth,
        originalHeight: item.originalHeight,
        column: 2,
        x: columnX[1],
        y,
        displayWidth: item.displayWidth,
        displayHeight: item.displayHeight,
        page,
        pageBreak: page > 1
      });

      y += item.totalHeight + rowGap;
    }

    /*
     * 어떤 문제도 배치하지 못했다면
     * 무한 루프 방지를 위해 한 문제를 강제로 처리합니다.
     */
    if (
      leftItems.length === 0 &&
      rightItems.length === 0
    ) {
      problemIndex++;
    }

    page++;
  }

  console.log("===== 최종 시험지 레이아웃 =====");
  console.table(layout);

  // 시험지에 들어갈 이미지가 하나도 없는 경우
  if (layout.length === 0) {
    const diagnostic = problems
      .slice(0, 5)
      .map((problem, index) => {
        const imagePath =
          problem.image_path || "(image_path 없음)";

        const exists =
          imagePath !== "(image_path 없음)" &&
          fs.existsSync(imagePath);

        return (
          `${index + 1}번 문제\n` +
          `번호: ${problem.question_num}\n` +
          `경로: ${imagePath}\n` +
          `파일 존재: ${exists ? "YES" : "NO"}`
        );
      })
      .join("\n\n");

    throw new Error(
      "시험지에 넣을 문제 이미지를 찾지 못했습니다.\n\n" +
      diagnostic
    );
  }

  return layout;
}

async function createExamPdf(
  problems,
  outputPath,
  academyName
) {

  console.log("wrongProblemPdf 받은 academyName =", academyName);

  if (!Array.isArray(problems) || problems.length === 0) {
    throw new Error("시험지로 만들 문제가 없습니다.");
  }

  // 시험지 생성 시 문제 이미지 경로 복구
  for (const problem of problems) {
    if (
      problem.image_path &&
      fs.existsSync(problem.image_path)
    ) {
      continue;
    }

    const fileName =
      problem.image_path
        ? path.basename(problem.image_path)
        : `${problem.book_id}_${problem.page_num}_${problem.question_num}.png`;

    const fallbackPath = path.join(
      __dirname,
      "output",
      "problems",
      fileName
    );

    if (fs.existsSync(fallbackPath)) {
      console.log(
        "문제 이미지 경로 복구:",
        problem.image_path,
        "→",
        fallbackPath
      );

      problem.image_path = fallbackPath;
    } else {
      console.error(
        "문제 이미지 파일 없음:",
        fileName
      );
    }
  }

  const examLayout = await calculateExamLayout(problems);

  console.log("===== 시험지 레이아웃 계산 =====");
  console.table(examLayout);

  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 30
  });

  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 30;

  const koreanFontPath = path.join(
    process.env.WINDIR || "C:\\Windows",
    "Fonts",
    "malgun.ttf"
  );

  const maxPage =
    examLayout.length > 0
      ? Math.max(...examLayout.map(item => item.page || 1))
      : 1;

  for (let page = 1; page <= maxPage; page++) {

    if (page > 1) {
      doc.addPage();
    }

    /*
     * -----------------------------
     * 페이지 헤더
     * -----------------------------
     */
    const headerCanvas = createCanvas(800, 95);
    const headerCtx = headerCanvas.getContext("2d");

    const pathParts = outputPath
      .replace(/\\/g, "/")
      .split("/");

    const studentName =
      pathParts.length >= 3
        ? pathParts[pathParts.length - 3]
        : "학생";

    headerCtx.fillStyle = "black";

    const koreanFontPath = path.join(
      process.env.WINDIR || "C:\\Windows",
      "Fonts",
      "malgun.ttf"
    );

    // 전체 헤더 박스
    headerCtx.lineWidth = 2;
    headerCtx.strokeRect(2, 2, 796, 91);

    // 구분선
    headerCtx.beginPath();
    headerCtx.moveTo(300, 2);
    headerCtx.lineTo(300, 93);
    headerCtx.moveTo(620, 2);
    headerCtx.lineTo(620, 93);
    headerCtx.stroke();

    // 제목
    headerCtx.font = `bold 26px "${koreanFontPath}"`;
    headerCtx.textAlign = "center";

    headerCtx.fillText(
      "오답관리시험",
      150,
      60
    );

    // 이름
    headerCtx.font = `18px "${koreanFontPath}"`;
    headerCtx.fillText(
      `이름: ${studentName}`,
      360,
      58
    );

    // 날짜
    headerCtx.fillText(
      "날짜:     월     일",
      510,
      58
    );

    // 점수
    headerCtx.textAlign = "center";

    headerCtx.font = `18px "${koreanFontPath}"`;

    headerCtx.fillText(
      "점수",
      710,
      38
    );

    headerCtx.fillText(
      `(     / ${problems.length})`,
      710,
      72
    );

    headerCtx.textAlign = "left";

    const headerImage =
      headerCanvas.toBuffer("image/png");

    doc.image(
      headerImage,
      margin,
      margin,
      {
        width: pageWidth - margin * 2
      }
    );

    /*
     * -----------------------------
     * 좌우 문제 영역 세로 분리선
     * -----------------------------
     */
    const dividerTop = margin + 65;

    doc
      .moveTo(pageWidth / 2, dividerTop)
      .lineTo(
        pageWidth / 2,
        pageHeight - 55
      )
      .lineWidth(0.5)
      .strokeColor("#999999")
      .stroke();

    /*
     * -----------------------------
     * 현재 페이지 문제 출력
     * -----------------------------
     */
    const pageItems = examLayout.filter(
      item => (item.page || 1) === page
    );

    for (const item of pageItems) {

      if (!item.image_path) {
        continue;
      }

      doc.image(
        item.image_path,
        item.x,
        item.y,
        {
          width: item.displayWidth,
          height: item.displayHeight
        }
      );

      // 문제별 통계 표시
      const testCount =
        (item.wrong_count || 0) +
        (item.correct_count || 0);

      const correctCount =
        item.correct_count || 0;

      const correctRate =
        testCount > 0
          ? Math.round((correctCount / testCount) * 100)
          : 0;

      doc
        .font(koreanFontPath)
        .fontSize(9)
        .fillColor("black")
        .text(
          `${item.page_num}p · 테스트 ${testCount}회 / 정답 ${correctCount}회 / 정답률 ${correctRate}%`,
          item.x,
          item.y + item.displayHeight + 3,
          {
            width: item.displayWidth,
            height: 14,
            align: "center",
            lineBreak: false
          }
        );

      doc
        .font(koreanFontPath)
        .fontSize(10)
        .fillColor("black")
        .text(
          `- ${page} -`,
          0,
          pageHeight - 50,
          {
            width: pageWidth,
            height: 12,
            align: "center",
            lineBreak: false
          }
        );

      // 우측 하단 학원명
      doc
        .font(koreanFontPath)
        .fontSize(9)
        .fillColor("black")
        .text(
          String(academyName || "").trim(),
          margin,
          pageHeight - 50,
          {
            width: pageWidth - margin * 2,
            height: 12,
            align: "right",
            lineBreak: false
          }
        );
    }
  }

  /*
* -----------------------------
* 정답지 출력
* -----------------------------
*/

  // 시험지 페이지가 홀수이면
  // 시험지와 정답지가 앞뒤로 붙지 않도록
  // 빈 페이지를 하나 삽입합니다.
  if (maxPage % 2 === 1) {
    doc.addPage();
  }

  for (let answerPage = 1; answerPage <= maxPage; answerPage++) {

    doc.addPage();

    /* 정답지 헤더 */
    const answerHeaderCanvas = createCanvas(800, 140);
    const answerHeaderCtx =
      answerHeaderCanvas.getContext("2d");

    answerHeaderCtx.fillStyle = "black";

    answerHeaderCtx.font =
      "bold 28px 'Malgun Gothic'";

    answerHeaderCtx.fillText(
      "정답지",
      0,
      35
    );

    answerHeaderCtx.font =
      "20px 'Malgun Gothic'";

    answerHeaderCtx.fillText(
      `총 문제수: ${problems.length}문제`,
      0,
      75
    );

    const answerPathParts = outputPath
      .replace(/\\/g, "/")
      .split("/");

    const answerStudentName =
      answerPathParts.length >= 3
        ? answerPathParts[answerPathParts.length - 3]
        : "학생";

    answerHeaderCtx.fillText(
      `학생: ${answerStudentName}`,
      400,
      75
    );

    const answerHeaderImage =
      answerHeaderCanvas.toBuffer("image/png");

    doc.image(
      answerHeaderImage,
      margin,
      margin,
      {
        width: pageWidth - margin * 2
      }
    );

    /*
     * 문제지와 동일한 페이지의 문제들
     */
    const answerItems =
      examLayout.filter(
        item =>
          (item.page || 1) === answerPage
      );

    for (const item of answerItems) {

      const problem = problems.find(
        p =>
          String(p.question_num) ===
          String(item.question_num)
      );

      if (!problem || !problem.image_path) {
        continue;
      }

      doc.image(
        item.image_path,
        item.x,
        item.y,
        {
          width: item.displayWidth,
          height: item.displayHeight
        }
      );

      if (item.answer) {

        const answerMap = {
          "1": "①",
          "2": "②",
          "3": "③",
          "4": "④",
          "5": "⑤"
        };

        const displayAnswer =
          answerMap[String(item.answer)] ||
          String(item.answer);

        const testCount =
          (item.wrong_count || 0) +
          (item.correct_count || 0);

        const correctCount =
          item.correct_count || 0;

        const correctRate =
          testCount > 0
            ? Math.round((correctCount / testCount) * 100)
            : 0;

        doc
          .font(koreanFontPath)
          .fontSize(11)
          .fillColor("black")
          .text(
            `정답: ${displayAnswer}`,
            item.x,
            item.y + item.displayHeight + 5,
            {
              width: item.displayWidth
            }
          );

        doc
          .font(koreanFontPath)
          .fontSize(9)
          .fillColor("black")
          .text(
            `${item.page_num}p · 테스트 ${testCount}회 / 정답 ${correctCount}회 / 정답률 ${correctRate}%`,
            item.x,
            item.y + item.displayHeight + 20,
            {
              width: item.displayWidth,
              height: 14,
              align: "center",
              lineBreak: false
            }
          );
      }
    }
  }

  doc.end();

  await new Promise((resolve, reject) => {

    stream.on("finish", resolve);
    stream.on("error", reject);

  });

  console.log(
    `[시험지 PDF 생성 완료] ${outputPath}`
  );

  return {
    success: true,
    outputPath,
    count: problems.length
  };
}

console.log("===== wrongProblemPdf exports 직전 =====");
console.log("createWrongProblemPdf:", typeof createWrongProblemPdf);
console.log("createExamPdf:", typeof createExamPdf);

module.exports = {
  createWrongProblemPdf,
  createExamPdf
};