const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const db = require('./database.cjs'); // DB 연결
const fs = require("fs");
const pdfReader = require('./pdfReader.cjs');
const ocrReader = require("./ocrReader.cjs");
const imageCropper = require('./imageCropper.cjs'); // 이 줄 추가
const imageSplitter = require("./imageSplitter.cjs");
const { electron } = require('process');
const pdfModulePath = require.resolve("./wrongProblemPdf.cjs");
const pdfModule = require(pdfModulePath);

const {
  createWrongProblemPdf,
  createExamPdf
} = pdfModule;

console.log("===== PDF 함수 확인 =====");
console.log("실제 로드 파일:", pdfModulePath);
console.log("exports:", Object.keys(pdfModule));
console.log("createWrongProblemPdf:", typeof createWrongProblemPdf);
console.log("createExamPdf:", typeof createExamPdf);

function createWindow() {

  console.log("__dirname =", __dirname);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
}

ipcMain.handle('delete-problems-by-page', async (event, data) => {
  try {
    return await db.deleteProblemsByPage(
      data.bookId,
      data.pageNum
    );
  } catch (err) {
    console.error("페이지 문제 삭제 IPC 실패:", err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.handle('save-problem', async (event, data) => {
  return new Promise((resolve, reject) => {

    // 같은 교재 + 페이지 + 문제번호가 이미 있는지 확인
    db.get(
      `
      SELECT id, image_path
      FROM Problems
      WHERE book_id = ?
        AND page_num = ?
        AND question_num = ?
      LIMIT 1
      `,
      [
        data.book_id,
        data.page_num,
        data.question_num
      ],
      (err, existing) => {

        if (err) {
          console.error("기존 문제 확인 실패:", err);
          reject(err);
          return;
        }

        // 이미 존재하면 기존 레코드를 새 이미지 정보로 갱신
        if (existing) {

          console.log("===== 기존 문제 갱신 =====");
          console.log("problem_id:", existing.id);
          console.log("book_id:", data.book_id);
          console.log("page_num:", data.page_num);
          console.log("question_num:", data.question_num);

          db.run(
            `
    UPDATE Problems
    SET image_path = ?,
        ocr_text = ?,
        ocr_words = ?,
        x = ?,
        y = ?,
        width = ?,
        height = ?
    WHERE id = ?
    `,
            [
              data.image_path,
              data.ocr_text,
              JSON.stringify(data.ocr_words || []),
              data.x,
              data.y,
              data.width,
              data.height,
              existing.id
            ],
            function (updateErr) {

              if (updateErr) {

                console.error(
                  "기존 문제 갱신 실패:",
                  updateErr
                );

                reject(updateErr);
                return;
              }

              console.log(
                "===== 기존 문제 갱신 완료 ====="
              );

              console.log(
                "problem_id:",
                existing.id
              );

              console.log(
                "새 image_path:",
                data.image_path
              );

              resolve({
                id: existing.id,
                imagePath: data.image_path,
                alreadyExists: true,
                updated: true
              });
            }
          );

          return;
        }

        // 존재하지 않을 때만 INSERT
        db.run(
          `
          INSERT INTO Problems (
            book_id,
            page_num,
            question_num,
            image_path,
            ocr_text,
            ocr_words,
            x,
            y,
            width,
            height
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            data.book_id,
            data.page_num,
            data.question_num,
            data.image_path,
            data.ocr_text,
            JSON.stringify(data.ocr_words || []),
            data.x,
            data.y,
            data.width,
            data.height
          ],
          function (err) {

            if (err) {
              console.error("문제 저장 실패:", err);
              reject(err);
              return;
            }

            console.log("===== 새 문제 저장 =====");
            console.log("problem_id:", this.lastID);
            console.log("book_id:", data.book_id);
            console.log("page_num:", data.page_num);
            console.log("question_num:", data.question_num);

            resolve({
              id: this.lastID,
              imagePath: data.image_path,
              alreadyExists: false
            });
          }
        );
      }
    );
  });
});

ipcMain.handle(
  "create-wrong-problem-pdf",
  async (event, problems, outputPath) => {

    try {

      console.log("===== 오답 문제 PDF 생성 =====");
      console.log("문제 수:", problems?.length);
      console.table(problems);

      const result = await createWrongProblemPdf(
        problems,
        outputPath
      );

      return result;

    } catch (error) {

      console.error("오답 문제 PDF 생성 실패:", error);

      return {
        success: false,
        message: error.message
      };

    }

  }
);

// 학원명 조회
ipcMain.handle(
  "get-academy-name",
  async () => {
    try {
      return await db.getAcademyName();
    } catch (err) {
      console.error("학원명 조회 실패:", err);
      return "";
    }
  }
);

// 학원명 저장/수정
ipcMain.handle(
  "save-academy-name",
  async (event, academyName) => {
    try {
      return await db.saveAcademyName(academyName);
    } catch (err) {
      console.error("학원명 저장 실패:", err);

      return {
        success: false,
        error: err.message
      };
    }
  }
);

ipcMain.handle(
  "create-exam-pdf",
  async (event, problems, outputPath, academyName) => {
    try {
      console.log("===== 시험지 PDF 생성 =====");
      console.log("문제 수:", problems?.length);
      console.table(problems);

      console.log("main.cjs 받은 academyName =", academyName);

      const result = await createExamPdf(
        problems,
        outputPath,
        academyName
      );

      return result;

    } catch (error) {

      console.error("시험지 PDF 생성 실패:", error);

      return {
        success: false,
        message: error.message
      };

    }

  }
);

// 테스트 개별 삭제
ipcMain.handle('delete-test', async (event, testId) => {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM Tests WHERE id = ?",
      [testId],
      function (err) {
        if (err) {
          console.error("테스트 삭제 실패:", err);
          reject(err);
          return;
        }

        resolve({
          success: true,
          deletedCount: this.changes
        });
      }
    );
  });
});

// IPC 핸들러 등록
ipcMain.handle('save-book', async (event, data) => {
  return new Promise((resolve) => {
    db.run("INSERT INTO Books (title, pdf_path) VALUES (?, ?)", [data.title, data.pdf_path], function (err) {
      if (err) console.error(err);
      resolve({ id: this.lastID });
    });
  });
});

ipcMain.handle('get-books', async () => {
  return new Promise((resolve) => {
    db.all("SELECT * FROM Books", [], (err, rows) => {
      if (err) console.error(err);
      resolve(rows || []);
    });
  });
});

ipcMain.handle('get-local-image', async (event, imagePath) => {
  try {
    const fullPath = path.resolve(__dirname, imagePath);

    const buffer = fs.readFileSync(fullPath);

    return `data:image/png;base64,${buffer.toString('base64')}`;

  } catch (error) {
    console.error("이미지 로드 실패:", error);
    return null;
  }
});

ipcMain.handle("ocr-test", async (event, imagePath) => {
  try {

    console.log("OCR 시작 경로:", imagePath);

    // 번호 영역 잘라내기
    const numberImagePath = path.join(
      path.dirname(imagePath),
      "numberArea.png"
    );

    await imageCropper.cropNumberArea(
      imagePath,
      numberImagePath
    );

    // 번호 영역만 OCR
    const result = await ocrReader.testOCR(
      imagePath,
      (progress) => {
        console.log("main 전송:", progress);
        event.sender.send("ocr-progress", progress);
      }
    );

    console.log("OCR 최종 반환값:", result);

    return {
      ...result,
      numberImagePath
    };

  } catch (error) {

    console.error("OCR 핸들러 오류:", error);

    return {
      success: false,
      message: error.message
    };

  }
});

ipcMain.handle('get-problem-count', async () => {
  return new Promise((resolve, reject) => {

    db.all(
      `
      SELECT
        P.book_id,
        B.title,
        COUNT(P.id) AS problem_count
      FROM Problems P
      LEFT JOIN Books B
        ON P.book_id = B.id
      GROUP BY P.book_id, B.title
      ORDER BY P.book_id
      `,
      [],
      (err, rows) => {

        if (err) {
          console.error(
            "교재별 문제 수 조회 실패:",
            err
          );

          reject(err);
          return;
        }

        console.log("===== 교재별 Problems 개수 =====");
        console.table(rows);

        resolve(rows || []);
      }
    );
  });
});

ipcMain.handle('get-problems', async () => {
  return new Promise((resolve, reject) => {

    db.all(
      "SELECT * FROM Problems ORDER BY id ASC",
      [],
      (err, rows) => {

        if (err) {
          console.error(
            "Problems 전체 조회 실패:",
            err
          );

          reject(err);
          return;
        }

        console.log(
          "===== Problems 전체 조회 ====="
        );

        console.log(
          "문제 수 =",
          rows.length
        );

        resolve(rows || []);
      }
    );
  });
});

ipcMain.handle('save-page-analysis', async (event, data) => {
  return new Promise((resolve, reject) => {

    const problemBoxes =
      JSON.stringify(data.problem_boxes || []);

    const excluded =
      data.excluded ? 1 : 0;

    const verified =
      data.verified ? 1 : 0;

    db.run(
      `
      UPDATE PageAnalyses
      SET
        problem_count = ?,
        problem_boxes = ?,
        excluded = ?,
        verified = ?
      WHERE book_id = ?
        AND page_num = ?
      `,
      [
        data.problem_count || 0,
        problemBoxes,
        excluded,
        verified,
        data.book_id,
        data.page_num
      ],
      function (updateErr) {

        if (updateErr) {

          console.error(
            "페이지 분석 UPDATE 실패:",
            updateErr
          );

          reject(updateErr);
          return;
        }

        if (this.changes > 0) {

          resolve({
            success: true,
            updated: true
          });

          return;
        }

        db.run(
          `
          INSERT INTO PageAnalyses (
            book_id,
            page_num,
            problem_count,
            problem_boxes,
            excluded,
            verified
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            data.book_id,
            data.page_num,
            data.problem_count || 0,
            problemBoxes,
            excluded,
            verified
          ],
          function (insertErr) {

            if (insertErr) {

              console.error(
                "페이지 분석 INSERT 실패:",
                insertErr
              );

              reject(insertErr);
              return;
            }

            resolve({
              success: true,
              inserted: true
            });
          }
        );
      }
    );
  });
});

ipcMain.handle('get-page-analyses', async (event, bookId) => {
  return new Promise((resolve, reject) => {

    db.all(
      `
      SELECT
        id,
        book_id,
        page_num,
        problem_count,
        problem_boxes,
        excluded,
        verified
      FROM PageAnalyses
      WHERE book_id = ?
      ORDER BY page_num ASC
      `,
      [bookId],
      (err, rows) => {

        if (err) {
          console.error(
            "페이지 분석 결과 조회 실패:",
            err
          );

          reject(err);
          return;
        }

        resolve(
          (rows || []).map(row => ({
            ...row,
            problem_boxes: row.problem_boxes
              ? JSON.parse(row.problem_boxes)
              : []
          }))
        );
      }
    );
  });
});

ipcMain.handle('delete-book', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM Books WHERE id = ?", [id], function (err) {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('clear-book-data', async (event, bookId) => {
  return new Promise((resolve, reject) => {

    db.serialize(() => {

      db.run(
        "DELETE FROM Tests WHERE book_id = ?",
        [bookId],
        function (testErr) {

          if (testErr) {
            reject(testErr);
            return;
          }

          db.run(
            "DELETE FROM Problems WHERE book_id = ?",
            [bookId],
            function (problemErr) {

              if (problemErr) {
                reject(problemErr);
                return;
              }

              console.log("===== 현재 교재 데이터 초기화 =====");
              console.log("book_id =", bookId);
              console.log("삭제된 Tests =", this.changes);

              resolve({
                success: true
              });
            }
          );
        }
      );
    });
  });
});

ipcMain.handle('save-student', async (event, data) => {
  return new Promise((resolve) => {
    db.run("INSERT INTO Students (name, class_name) VALUES (?, ?)", [data.name, data.class_name], function (err) {
      if (err) console.error(err);
      resolve({ id: this.lastID });
    });
  });
});

ipcMain.handle('get-students', async () => {
  return new Promise((resolve) => {
    db.all("SELECT * FROM Students", [], (err, rows) => {
      if (err) console.error(err);
      resolve(rows || []);
    });
  });
});

// 학생 삭제
ipcMain.handle('delete-student', async (event, studentId) => {
  return new Promise((resolve, reject) => {

    // 학생의 오답 기록 먼저 삭제
    db.run(
      "DELETE FROM Tests WHERE student_id = ?",
      [studentId],
      function (err) {

        if (err) {
          console.error("학생 오답 기록 삭제 실패:", err);
          reject(err);
          return;
        }

        // 학생 삭제
        db.run(
          "DELETE FROM Students WHERE id = ?",
          [studentId],
          function (err) {

            if (err) {
              console.error("학생 삭제 실패:", err);
              reject(err);
              return;
            }

            resolve({
              success: true,
              deletedTests: this.changes
            });
          }
        );
      }
    );
  });
});

ipcMain.handle("analyze-pdf", async (event, pdfPath) => {

  try {

    const debugLogPath = path.join(
      app.getPath("userData"),
      "analyze-pdf-debug.txt"
    );

    const debugLog = (message) => {
      const text =
        `[${new Date().toISOString()}] ${message}\n`;

      console.log(message);

      try {
        fs.appendFileSync(
          debugLogPath,
          text,
          "utf8"
        );
      } catch (error) {
        console.error(
          "분석 디버그 로그 저장 실패:",
          error
        );
      }
    };

    debugLog("===== PDF 분석 시작 =====");
    debugLog(`pdfPath = ${pdfPath}`);

    const outputDir = app.isPackaged
      ? path.join(app.getPath("userData"), "output")
      : path.join(__dirname, "output");

    // PDF 파일별로 별도의 캐시 폴더 사용
    const pdfCacheKey = Buffer
      .from(pdfPath)
      .toString("base64")
      .replace(/[/+=]/g, "_");

    const pdfOutputDir = path.join(
      outputDir,
      "pdf-cache",
      pdfCacheKey
    );

    if (!fs.existsSync(pdfOutputDir)) {
      fs.mkdirSync(pdfOutputDir, { recursive: true });
    }

    const cacheInfoPath =
      path.join(pdfOutputDir, "pdf-cache-info.json");

    const pageCountResult =
      await pdfReader.getPdfPageCount(
        pdfPath
      );

    if (!pageCountResult.success) {
      return {
        success: false,
        message: pageCountResult.message
      };
    }

    const totalPages =
      pageCountResult.totalPages;

    let cacheValid = true;

    const pages = [];

    let pdfStat = null;

    try {
      pdfStat = fs.statSync(pdfPath);
    } catch (error) {

      console.error(
        "PDF 파일 정보 확인 실패:",
        error
      );

      return {
        success: false,
        message: error.message
      };
    }

    let cacheInfo = null;

    if (fs.existsSync(cacheInfoPath)) {

      try {

        cacheInfo = JSON.parse(
          fs.readFileSync(
            cacheInfoPath,
            "utf8"
          )
        );

      } catch (error) {

        console.warn(
          "기존 PDF 캐시 정보 읽기 실패"
        );

        cacheInfo = null;
      }
    }

    const samePdf =
      cacheInfo &&
      cacheInfo.pdfPath === pdfPath &&
      cacheInfo.fileSize === pdfStat.size &&
      cacheInfo.modifiedTime === pdfStat.mtimeMs &&
      cacheInfo.totalPages === totalPages;
    console.log("===== PDF 캐시 판정 =====");
    console.log("현재 PDF =", pdfPath);
    console.log("캐시 PDF =", cacheInfo?.pdfPath);
    console.log("현재 파일크기 =", pdfStat.size);
    console.log("캐시 파일크기 =", cacheInfo?.fileSize);
    console.log("현재 수정시간 =", pdfStat.mtimeMs);
    console.log("캐시 수정시간 =", cacheInfo?.modifiedTime);
    console.log("현재 페이지수 =", totalPages);
    console.log("캐시 페이지수 =", cacheInfo?.totalPages);
    console.log("samePdf =", samePdf);

    if (!samePdf) {

      cacheValid = false;

      console.log(
        "===== 기존 PDF 캐시와 현재 PDF가 다름 ====="
      );

    } else {

      console.log(
        "===== 현재 PDF와 캐시 정보 일치 ====="
      );
    }

    if (cacheValid) {

      for (
        let pageNumber = 1;
        pageNumber <= totalPages;
        pageNumber++
      ) {

        const imagePath = path.join(
          pdfOutputDir,
          `page_${String(pageNumber).padStart(3, "0")}.png`
        );

        if (!fs.existsSync(imagePath)) {

          cacheValid = false;

          console.log(
            "PNG 캐시 없음:",
            imagePath
          );

          break;
        }

        pages.push({
          page: pageNumber,
          image: imagePath
        });
      }
    }

    /*
     * 3. 모든 PNG가 있으면
     *    PDF를 다시 변환하지 않습니다.
     */
    if (cacheValid) {

      console.log(
        "===== 기존 PDF 페이지 이미지 재사용 ====="
      );

      console.log(
        "pages.length =",
        pages.length
      );

      return {
        success: true,
        totalPages,
        pages
      };
    }

    /*
     * 4. PNG가 하나라도 없으면
     *    기존 PDF 전체 변환을 실행합니다.
     */
    console.log(
      "===== PNG 캐시 불완전 → PDF 전체 변환 ====="
    );

    const result =
      await pdfReader.convertPdfToImages(
        pdfPath,
        pdfOutputDir
      );

    if (result.success) {

      try {

        fs.writeFileSync(
          cacheInfoPath,
          JSON.stringify(
            {
              pdfPath,
              fileSize: pdfStat.size,
              modifiedTime: pdfStat.mtimeMs,
              totalPages: result.totalPages
            },
            null,
            2
          ),
          "utf8"
        );

        console.log(
          "===== PDF 캐시 정보 저장 완료 ====="
        );

      } catch (error) {

        console.error(
          "PDF 캐시 정보 저장 실패:",
          error
        );
      }
    }

    console.log(
      "===== PDF 변환 결과 ====="
    );

    console.log(
      "success =",
      result.success
    );

    console.log(
      "totalPages =",
      result.totalPages
    );

    console.log(
      "===== PDF 분석 최종 결과 ====="
    );

    console.log(
      "PDF:",
      pdfPath
    );

    console.log(
      "페이지 수:",
      result.pages?.length
    );

    console.log(
      "캐시 사용:",
      cacheValid ? "YES" : "NO"
    );

    if (cacheValid) {
      console.log(
        ">>> 기존 PNG 재사용"
      );
    } else {
      console.log(
        ">>> PDF → PNG 변환 실행"
      );
    }

    return result;

  } catch (error) {

    console.error(
      "PDF 분석 실패:",
      error
    );

    return {
      success: false,
      message: error.message
    };

  }

});


// 추가: 이미지 좌우 분리 기능
ipcMain.handle("split-image", async (event, imagePath) => {

  try {
    const outputDir = app.isPackaged
      ? path.join(app.getPath("userData"), "output", "split")
      : path.join(__dirname, "output", "split");

    const fullImagePath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(__dirname, imagePath);

    const result = await imageSplitter.splitImage(
      fullImagePath,
      outputDir
    );

    console.log("이미지 분리 결과:", result);

    return result;

  } catch (error) {

    console.error("이미지 분리 오류:", error);

    return {
      success: false,
      message: error.message
    };

  }

});

ipcMain.handle(
  "draw-changed-numbers",
  async (event, imagePath, changedTokens) => {

    return await imageCropper.drawChangedNumbers(
      imagePath,
      changedTokens
    );

  }
);

// 이미지를 읽어오는 핵심 기능
const readImageFile = async (event, imagePath) => {
  // 실제 파일이 어디 있는지 콘솔에 출력 (디버깅용)
  const fileName = path.basename(imagePath);

  const fullPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.join(__dirname, "output", fileName);

  console.log("--- 이미지 로드 시도 ---");
  console.log("원본 이미지 경로:", imagePath);
  console.log("최종 검색 경로:", fullPath);

  try {

    console.log("===== 이미지 파일 실제 확인 =====");
    console.log("imagePath =", imagePath);
    console.log("fullPath =", fullPath);
    console.log("exists =", fs.existsSync(fullPath));

    const data = fs.readFileSync(fullPath);

    console.log("file size =", data.length);

    return `data:image/png;base64,${data.toString("base64")}`;

  } catch (error) {

    console.error("===== 이미지 파일 읽기 실패 =====");
    console.error("imagePath =", imagePath);
    console.error("fullPath =", fullPath);
    console.error("error =", error);

    return null;
  }
};

// 앞단에서 getImageData로 부르든, get-image-data로 부르든 모두 대답하도록 2개 모두 등록!
ipcMain.handle("getImageData", readImageFile);
ipcMain.handle("get-image-data", readImageFile);

app.whenReady().then(async () => {
  createWindow();

  // 자동 업데이트 이벤트
  autoUpdater.on('update-available', () => {
    console.log('새로운 업데이트가 있습니다.');
  });

  autoUpdater.on('update-not-available', () => {
    console.log('현재 최신 버전입니다.');
  });

  autoUpdater.on('error', (error) => {
    console.error('자동 업데이트 오류:', error);
  });

  // Tests 테이블에 정답 필드가 없으면 추가
  await new Promise((resolve) => {
    db.all(
      "PRAGMA table_info(Tests)",
      [],
      (err, columns) => {
        if (err) {
          console.error(
            "Tests 테이블 구조 확인 실패:",
            err
          );
          resolve();
          return;
        }

        const hasAnswer =
          columns.some(
            column => column.name === "answer"
          );

        if (hasAnswer) {
          resolve();
          return;
        }

        db.run(
          "ALTER TABLE Tests ADD COLUMN answer TEXT",
          [],
          (alterErr) => {
            if (alterErr) {
              console.error(
                "Tests answer 필드 추가 실패:",
                alterErr
              );
            } else {
              console.log(
                "Tests answer 필드 추가 완료"
              );
            }

            resolve();
          }
        );
      }
    );
  });

  // Tests 테이블에 시험지 ID 필드가 없으면 추가
  await new Promise((resolve) => {
    db.all(
      "PRAGMA table_info(Tests)",
      [],
      (err, columns) => {
        if (err) {
          console.error(
            "Tests 테이블 구조 확인 실패:",
            err
          );
          resolve();
          return;
        }

        const hasTestSheetId =
          columns.some(
            column => column.name === "test_sheet_id"
          );

        if (hasTestSheetId) {
          resolve();
          return;
        }

        db.run(
          "ALTER TABLE Tests ADD COLUMN test_sheet_id TEXT",
          [],
          (alterErr) => {
            if (alterErr) {
              console.error(
                "Tests test_sheet_id 필드 추가 실패:",
                alterErr
              );
            } else {
              console.log(
                "Tests test_sheet_id 필드 추가 완료"
              );
            }

            resolve();
          }
        );
      }
    );
  });

  // Tests 테이블에 시험 결과 등록 여부 필드가 없으면 추가
  await new Promise((resolve) => {
    db.all(
      "PRAGMA table_info(Tests)",
      [],
      (err, columns) => {
        if (err) {
          console.error(
            "Tests 테이블 정보 조회 실패:",
            err
          );
          resolve();
          return;
        }

        const hasResultRegistered =
          columns.some(
            column =>
              column.name === "result_registered"
          );

        if (hasResultRegistered) {
          resolve();
          return;
        }

        db.run(
          `
        ALTER TABLE Tests
        ADD COLUMN result_registered INTEGER DEFAULT 0
        `,
          [],
          (alterErr) => {
            if (alterErr) {
              console.error(
                "result_registered 필드 추가 실패:",
                alterErr
              );
            }

            resolve();
          }
        );
      }
    );
  });

  // 앱 시작 시 DB 문제 현황을 터미널 마지막에 표시


  // ▼ 테스트(오답기록) 등록 및 조회 핸들러 ▼
  ipcMain.handle('save-test', async (event, data) => {
    return new Promise((resolve) => {
      db.run(
        `
      INSERT INTO Tests
      (student_id, book_id, page_num, question_num, wrong_count, correct_count,answer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          data.student_id,
          data.book_id,
          data.page_num,
          data.question_num,
          data.wrong_count ?? 0,
          data.correct_count ?? 0,
          data.answer ?? null
        ],

        function (err) {
          if (err) console.error(err);
          resolve({ id: this.lastID });
        }
      );
    });
  });

  // 시험지 ID를 여러 테스트에 일괄 연결
  ipcMain.handle('assign-test-sheet', async (event, data) => {
    return new Promise((resolve, reject) => {
      if (
        !data ||
        !data.testSheetId ||
        !Array.isArray(data.testIds) ||
        data.testIds.length === 0
      ) {
        resolve({
          success: false,
          message: "시험지 ID 또는 테스트 목록이 없습니다."
        });
        return;
      }

      const placeholders = data.testIds
        .map(() => "?")
        .join(", ");

      db.run(
        `
      UPDATE Tests
      SET test_sheet_id = ?
      WHERE id IN (${placeholders})
      `,
        [
          data.testSheetId,
          ...data.testIds
        ],
        function (err) {
          if (err) {
            console.error(
              "시험지 ID 연결 실패:",
              err
            );
            reject(err);
            return;
          }

          resolve({
            success: true,
            updatedCount: this.changes
          });
        }
      );
    });
  });

  ipcMain.handle('get-tests', async () => {
    return new Promise((resolve) => {
      db.all(`       SELECT Tests.*, Students.name as student_name, Books.title as book_title 
      FROM Tests 
      LEFT JOIN Students ON Tests.student_id = Students.id 
      LEFT JOIN Books ON Tests.book_id = Books.id
    `, [], (err, rows) => {
        if (err) console.error(err);
        resolve(rows || []);
      });
    });
  });

  // 학생별 현재 오답 문제 조회
  ipcMain.handle('get-wrong-problems', async (event, studentId) => {
    return new Promise((resolve, reject) => {

      console.log("===== get-wrong-problems 진단 =====");
      console.log("studentId:", studentId);

      db.all(
        `
SELECT
  Tests.id AS test_id,
  Tests.student_id,
  Tests.book_id,
  Tests.page_num,
  Tests.question_num,
  Tests.wrong_count,
  Tests.correct_count,

  Problems.id AS problem_id,
  Problems.image_path,
  Problems.ocr_text

FROM Tests

INNER JOIN Problems
ON Tests.book_id = Problems.book_id
AND Tests.page_num = Problems.page_num
AND Tests.question_num = Problems.question_num

WHERE Tests.student_id = ?
AND COALESCE(Tests.wrong_count, 0) > COALESCE(Tests.correct_count, 0)
ORDER BY Tests.page_num, Tests.question_num
`,
        [studentId],
        (err, rows) => {

          if (err) {
            console.error("학생별 오답 문제 조회 실패:", err);
            reject(err);
            return;
          }

          resolve(rows || []);
        }
      );

    });
  });

  ipcMain.handle('update-wrong-count', async (event, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `
      UPDATE tests
      SET wrong_count = COALESCE(wrong_count, 0) + 1
      WHERE id = ?
        `,
        [data.id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMain.handle('update-correct-count', async (event, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `
      UPDATE Tests
      SET correct_count = COALESCE(correct_count, 0) + 1
      WHERE id = ?
        `,
        [data.id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMain.handle('update-test-answer', async (event, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `
      UPDATE Tests
      SET answer = ?
      WHERE id = ?
      `,
        [data.answer, data.id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMain.handle('update-test-result-registered', async (event, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE Tests
        SET result_registered = 1
        WHERE id = ?
        `,
        [data.id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMain.handle("extract-problem", async (event, problem) => {

    const imageCropper = require("./imageCropper.cjs");

    const fs = require("fs");
    const path = require("path");

    const outputDir = path.join(
      app.getPath("userData"),
      "output",
      "problems"
    );

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(
      outputDir,
      `${problem.book_id}_${problem.page_num}_${problem.question_num}.png`
    );

    // 원본 페이지 이미지 실제 경로 복구
    const sourceImagePath =
      path.isAbsolute(problem.image_path)
        ? problem.image_path
        : app.isPackaged
          ? path.join(
            app.getPath("userData"),
            problem.image_path
          )
          : path.join(
            __dirname,
            problem.image_path
          );

    console.log("===== 문제 이미지 재생성 =====");
    console.log("원본 상대경로:", problem.image_path);
    console.log("실제 원본경로:", sourceImagePath);
    console.log(
      "원본 파일 존재:",
      fs.existsSync(sourceImagePath)
    );
    console.log("새 문제 이미지:", outputPath);

    await imageCropper.extractProblemRegion(

      sourceImagePath,

      outputPath,

      problem.x,

      problem.y,

      problem.width,

      problem.height

    );

    return {
      success: true,
      imagePath: outputPath
    };

  });

  // ▼ 파일 선택기 네이티브 창 띄우기 ▼
  ipcMain.handle('open-file-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'PDF 교재 선택',
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (canceled) return null;

    return {
      path: filePaths[0],
      name: path.basename(filePaths[0])
    };
  });

});

ipcMain.handle('open-pdf', async (event, pdfPath) => {
  try {
    const { shell } = require('electron');

    const fullPath = path.resolve(pdfPath);

    console.log("PDF 열기:", fullPath);

    await shell.openPath(fullPath);

    return {
      success: true,
      path: fullPath
    };

  } catch (error) {

    console.error("PDF 열기 실패:", error);

    return {
      success: false,
      message: error.message
    };

  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});