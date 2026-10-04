const { contextBridge, ipcRenderer } = require('electron');

console.log("★★★★ PRELOAD LOADED ★★★★");

contextBridge.exposeInMainWorld('electronAPI', {
  saveBook: (data) => ipcRenderer.invoke('save-book', data),
  getBooks: () => ipcRenderer.invoke('get-books'),
  deleteBook: (id) => ipcRenderer.invoke('delete-book', id),

  clearBookData: (bookId) =>
    ipcRenderer.invoke('clear-book-data', bookId),

  savePageAnalysis: (data) =>
    ipcRenderer.invoke(
      'save-page-analysis',
      data
    ),

  getPageAnalyses: (bookId) =>
    ipcRenderer.invoke(
      'get-page-analyses',
      bookId
    ),

  saveProblem: (data) =>
    ipcRenderer.invoke('save-problem', data),

  deleteProblemsByPage: (bookId, pageNum) =>
    ipcRenderer.invoke(
      'delete-problems-by-page',
      {
        bookId,
        pageNum
      }
    ),

  getProblems: () =>
    ipcRenderer.invoke('get-problems'),

  saveStudent: (studentData) => ipcRenderer.invoke('save-student', studentData),
  getStudents: () => ipcRenderer.invoke('get-students'),
  getAcademyName: () =>
    ipcRenderer.invoke(
      'get-academy-name'
    ),

  saveAcademyName: (academyName) =>
    ipcRenderer.invoke(
      'save-academy-name',
      academyName
    ),


  deleteStudent: (studentId) =>
    ipcRenderer.invoke('delete-student', studentId),


  saveTest: (testData) => ipcRenderer.invoke('save-test', testData),

  getTests: () => ipcRenderer.invoke('get-tests'),

  deleteTest: (testId) =>
    ipcRenderer.invoke('delete-test', testId),

  getWrongProblems: (studentId) =>
    ipcRenderer.invoke('get-wrong-problems', studentId),

  updateWrongCount: (data) => ipcRenderer.invoke('update-wrong-count', data),

  analyzePdf: (pdfPath) => ipcRenderer.invoke('analyze-pdf', pdfPath),
  updateCorrectCount: (data) => ipcRenderer.invoke('update-correct-count', data),
  updateTestAnswer: (data) =>
    ipcRenderer.invoke('update-test-answer', data),

  assignTestSheet: (data) =>
    ipcRenderer.invoke('assign-test-sheet', data),
  updateTestResultRegistered: (data) =>
    ipcRenderer.invoke(
      'update-test-result-registered',
      data
    ),

  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  getImageData: (pagePath) => ipcRenderer.invoke('getImageData', pagePath),

  ocrTest: (imagePath) => ipcRenderer.invoke('ocr-test', imagePath),

  onOCRProgress: (callback) =>
    ipcRenderer.on("ocr-progress", (event, data) => {
      console.log("preload 수신:", data);
      callback(data);
    }),

  // preload.cjs
  // preload.cjs
  getLocalImage: (imagePath) =>
    ipcRenderer.invoke('get-local-image', imagePath),

  splitImage: (imagePath) =>
    ipcRenderer.invoke('split-image', imagePath),

  extractProblem: (problemData) =>
    ipcRenderer.invoke('extract-problem', problemData),

  drawChangedNumbers: (imagePath, changedTokens) =>
    ipcRenderer.invoke(
      'draw-changed-numbers',
      imagePath,
      changedTokens
    ),

  createWrongProblemPdf: (problems, outputPath) =>
    ipcRenderer.invoke(
      'create-wrong-problem-pdf',
      problems,
      outputPath
    ),

  createExamPdf: (problems, outputPath, academyName) =>
    ipcRenderer.invoke(
      'create-exam-pdf',
      problems,
      outputPath,
      academyName
    ),

  openPdf: (pdfPath) =>
    ipcRenderer.invoke('open-pdf', pdfPath)

});