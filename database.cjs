const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// DB 파일 경로 설정
const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'database.sqlite')
  : path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("DB 연결 실패:", err);
  else console.log("SQLite DB 연결 성공 및 파일 생성 완료!");
});

// 테이블 생성 (동기화)
db.serialize(() => {
  // 1. 교재 테이블
  db.run(`CREATE TABLE IF NOT EXISTS Books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    pdf_path TEXT
  )`);

  // 2. 학생 테이블
  db.run(`CREATE TABLE IF NOT EXISTS Students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    class_name TEXT
  )`);

  // 3. 테스트(오답기록) 테이블
  db.run(`CREATE TABLE IF NOT EXISTS Tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  book_id INTEGER,
  page_num TEXT,
  question_num TEXT,
  wrong_count INTEGER DEFAULT 1,
  correct_count INTEGER DEFAULT 0
  )`);
  db.run(`
  ALTER TABLE Tests 
  ADD COLUMN wrong_count INTEGER DEFAULT 1
`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error(err);
    }
  });

  db.run(`
  ALTER TABLE Tests 
  ADD COLUMN correct_count INTEGER DEFAULT 0
`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error(err);

    }
  });

  // 4. 문제 목록 테이블
  db.run(`CREATE TABLE IF NOT EXISTS Problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  page_num INTEGER,
  question_num TEXT,
  image_path TEXT,
  ocr_text TEXT,
  ocr_words TEXT,
  x INTEGER,
  y INTEGER,
  width INTEGER,
  height INTEGER
)`);

  db.run(`
ALTER TABLE Problems
ADD COLUMN ocr_words TEXT
`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error(err);
    }
  });

  // 5. 학원 설정 테이블
  db.run(`
CREATE TABLE IF NOT EXISTS AcademySettings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  academy_name TEXT DEFAULT ''
);
`);

  // 6. 페이지별 OCR 분석 결과
  db.run(`
CREATE TABLE IF NOT EXISTS PageAnalyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  page_num INTEGER NOT NULL,
  problem_count INTEGER DEFAULT 0,
  problem_boxes TEXT,
  excluded INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  UNIQUE(book_id, page_num)
)
`, (err) => {
    if (err) {
      console.error("PageAnalyses 테이블 생성 실패:", err);
    } else {
      console.log("PageAnalyses 테이블 준비 완료");
    }
  });

}); // serialize 종료

// 특정 교재의 특정 페이지 문제 전체 삭제
db.deleteProblemsByPage = function (bookId, pageNum) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      DELETE FROM Problems
      WHERE book_id = ?
        AND page_num = ?
      `,
      [bookId, pageNum],
      function (err) {
        if (err) {
          console.error(
            "페이지 문제 삭제 실패:",
            err
          );
          reject(err);
          return;
        }

        console.log(
          `페이지 ${pageNum} 기존 문제 ${this.changes}개 삭제`
        );

        resolve({
          success: true,
          deletedCount: this.changes
        });
      }
    );
  });
};
// 학원명 조회
db.getAcademyName = function () {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT academy_name FROM AcademySettings WHERE id = 1`,
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(row ? row.academy_name : '');
      }
    );
  });
};

// 학원명 저장/수정
db.saveAcademyName = function (academyName) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO AcademySettings (id, academy_name)
      VALUES (1, ?)
      ON CONFLICT(id)
      DO UPDATE SET academy_name = excluded.academy_name
      `,
      [academyName],
      function (err) {
        console.log("DB에 저장하려는 학원명 =", academyName);
        if (err) {
          reject(err);
          return;
        }

        resolve({
          success: true
        });
      }
    );
  });
};
module.exports = db;