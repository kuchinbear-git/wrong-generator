import { useState, useRef, useEffect } from 'react';
import './App.css';
console.log("===== App.css import 확인 =====");

function App() {
    const [activeMenu, setActiveMenu] = useState('교재관리');
    const [books, setBooks] = useState([]);
    const [students, setStudents] = useState([]);
    const [tests, setTests] = useState([]);

    const [problems, setProblems] = useState([]);
    const [selectedQuestionNums, setSelectedQuestionNums] = useState([]);
    // 시험 결과 등록용
    const [resultAnswers, setResultAnswers] = useState({});
    const [ocrResult, setOcrResult] = useState("");
    const [problemAnswers, setProblemAnswers] = useState({});
    const [openAnswerQuestion, setOpenAnswerQuestion] = useState(null);

    const [processSummary, setProcessSummary] = useState(null);
    const [excludedPages, setExcludedPages] = useState([]);
    const [ocrProgress, setOcrProgress] = useState("");
    const [processProgress, setProcessProgress] = useState("");
    const [saveProgress, setSaveProgress] = useState("");

    const [wrongProblems, setWrongProblems] = useState([]);
    const [savedProblemImages, setSavedProblemImages] = useState([]);
    const [selectedExamProblems, setSelectedExamProblems] = useState([]);
    const [wrongRateThreshold, setWrongRateThreshold] = useState(50);
    const [selectedExamStudentId, setSelectedExamStudentId] = useState(null);
    const [wrongResultIds, setWrongResultIds] = useState([]);
    const [testSheetId, setTestSheetId] = useState(null);
    const [academyName, setAcademyName] = useState('');
    const [academyNameInput, setAcademyNameInput] = useState("");

    const [newTest, setNewTest] = useState({ student_id: '', book_id: '', page_num: '', answer: '' });
    const [directAnswer, setDirectAnswer] = useState('');
    const [newStudent, setNewStudent] = useState({ name: '', class_name: '' });
    const fileInputRef = useRef(null);
    const resizeRef = useRef(null);
    const topResizeRef = useRef(null);
    const [problemBoxes, setProblemBoxes] = useState([]);
    const [deletedProblemBoxes, setDeletedProblemBoxes] = useState([]);
    const [pageMeta, setPageMeta] = useState({ w: 0, h: 0 });

    const [pdfPages, setPdfPages] = useState([]);
    const [manualBoxMode, setManualBoxMode] = useState(false);

    const [manualBoxStart, setManualBoxStart] = useState(null);
    const [manualBoxPreview, setManualBoxPreview] = useState(null);
    const [manualBoxNumber, setManualBoxNumber] = useState("");
    const [manualBoxPending, setManualBoxPending] = useState(false);

    const [pdfImages, setPdfImages] = useState([]);
    const [testImage, setTestImage] = useState(null);
    const [currentBookId, setCurrentBookId] = useState(null);
    const [selectedPdfName, setSelectedPdfName] = useState("");
    const [currentPage, setCurrentPage] = useState(8);
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(1);
    const [pageAnalyses, setPageAnalyses] = useState([]);

    const [splitNumber, setSplitNumber] = useState(null);
    const [editNumber, setEditNumber] = useState(null);

    useEffect(() => {

        // 교재가 변경되면 이전 교재의 화면 상태를 먼저 초기화
        setProcessSummary(null);
        setExcludedPages([]);
        setProblemBoxes([]);
        setDeletedProblemBoxes([]);
        setPageMeta({ w: 0, h: 0 });
        setPdfPages([]);
        setPdfImages([]);
        setTestImage(null);
        setPageAnalyses([]);

        if (!currentBookId) {
            return;
        }

        const loadPageAnalyses = async () => {

            try {

                const savedPageAnalyses =
                    await window.electronAPI.getPageAnalyses(
                        currentBookId
                    );

                setPageAnalyses(
                    savedPageAnalyses || []
                );

            } catch (error) {

                console.error(
                    "페이지 분석 결과 조회 실패:",
                    error
                );

                setPageAnalyses([]);
            }
        };

        loadPageAnalyses();

    }, [currentBookId]);

    useEffect(() => {

        if (!currentBookId || books.length === 0) {
            return;
        }

        const currentBook =
            books.find(
                book => Number(book.id) === Number(currentBookId)
            );

        if (!currentBook || !currentBook.pdf_path) {
            return;
        }

        const loadSelectedBookPdf = async () => {

            try {

                const result =
                    await window.electronAPI.analyzePdf(
                        currentBook.pdf_path
                    );

                if (!result.success) {
                    console.error(
                        "선택한 교재 PDF 불러오기 실패:",
                        result
                    );
                    return;
                }

                setPdfPages(result.pages);

                setStartPage(1);
                setEndPage(result.pages.length);

                const images = [];

                for (const page of result.pages) {

                    const img =
                        await window.electronAPI.getImageData(
                            page.image
                        );

                    images.push(img);
                }

                setPdfImages(images);

                if (images.length > 0) {
                    setTestImage(images[0]);
                }

            } catch (error) {

                console.error(
                    "선택한 교재 PDF 불러오기 실패:",
                    error
                );
            }
        };

        loadSelectedBookPdf();

    }, [currentBookId, books]);

    useEffect(() => {
        if (window.electronAPI) {

            window.electronAPI.getBooks().then(async (books) => {

                console.log("===== 앱 시작 교재 복원 진단 =====");
                console.log("books.length =", books.length);
                console.table(books);

                setBooks(books);
                // 앱 재실행 시 마지막으로 등록된 교재를 현재 교재로 복원
                if (books.length > 0) {

                    const latestBook = books[books.length - 1];

                    setCurrentBookId(latestBook.id);

                    console.log("===== 현재 교재 ID 복원 =====");
                    console.log("currentBookId =", latestBook.id);

                    let savedPageAnalyses = [];

                    try {

                        savedPageAnalyses =
                            await window.electronAPI.getPageAnalyses(
                                latestBook.id
                            );

                        console.log(
                            "===== 기존 페이지 분석 결과 복원 ====="
                        );

                        console.log(
                            "저장된 페이지 수 =",
                            savedPageAnalyses.length
                        );

                        setPageAnalyses(savedPageAnalyses);

                        const page8Analysis =
                            savedPageAnalyses.find(
                                item => Number(item.page_num) === 8
                            );

                        console.log(
                            "===== 8페이지 분석 결과 확인 ====="
                        );

                        console.log(
                            "8페이지 분석 결과 =",
                            page8Analysis
                        );

                    } catch (error) {

                        console.error(
                            "페이지 분석 결과 복원 실패:",
                            error
                        );

                    }

                    const savedPageCount =
                        savedPageAnalyses.length;

                    if (savedPageCount > 0) {

                        console.log(
                            "===== 실제 PDF 페이지 정보 복원 시작 ====="
                        );

                        const pdfResult =
                            await window.electronAPI.analyzePdf(
                                latestBook.pdf_path
                            );

                        if (
                            pdfResult?.success &&
                            pdfResult.pages?.length > 0
                        ) {

                            setPdfPages(
                                pdfResult.pages
                            );

                            setStartPage(1);

                            setEndPage(
                                pdfResult.pages.length
                            );

                            const imageIndex =
                                currentPage - 1;

                            if (
                                imageIndex >= 0 &&
                                imageIndex < pdfResult.pages.length
                            ) {

                                const pageInfo =
                                    pdfResult.pages[imageIndex];

                                const imageData =
                                    await window.electronAPI.getImageData(
                                        pageInfo.image
                                    );

                                if (imageData) {
                                    setTestImage(imageData);
                                }
                            }

                            console.log(
                                "===== 실제 PDF 페이지 정보 복원 완료 ====="
                            );

                            console.log(
                                "페이지 수 =",
                                pdfResult.pages.length
                            );

                            console.log(
                                "현재 페이지 경로 =",
                                pdfResult.pages[imageIndex]?.image
                            );

                        } else {

                            console.error(
                                "PDF 페이지 정보 복원 실패:",
                                pdfResult
                            );

                        }
                    }
                }
            });

            window.electronAPI.getStudents().then(setStudents);
            window.electronAPI.getTests().then(setTests);

            window.electronAPI.getProblems().then((data) => {
                console.log("===== Problems 전체 조회 =====");
                console.table(data);
                setProblems(data);
            });

            if (window.electronAPI.onOCRProgress) {
                window.electronAPI.onOCRProgress((data) => {
                    setOcrProgress(
                        `${data.status} ${Math.round(data.progress * 100)}%`
                    );
                });
            }
        }
    }, []);

    useEffect(() => {
        if (
            !newTest.book_id ||
            !newTest.page_num
        ) {
            setProblemAnswers({});
            return;
        }

        const existingAnswers = {};

        tests
            .filter(
                t =>
                    Number(t.book_id) === Number(newTest.book_id) &&
                    String(t.page_num) === String(newTest.page_num) &&
                    t.answer
            )
            .forEach(t => {
                existingAnswers[t.question_num] = String(t.answer);
            });

        setProblemAnswers(prev => ({
            ...prev,
            ...existingAnswers
        }));
    }, [
        tests,
        newTest.book_id,
        newTest.page_num
    ]);

    useEffect(() => {
        console.log("===== wrongProblems state 변경 =====");
        console.log("wrongProblems:", wrongProblems);
        console.log("개수:", wrongProblems.length);
    }, [wrongProblems]);

    const handleRegisterTestResult = async () => {
        if (!testSheetId) {
            alert("시험지가 선택되지 않았습니다.");
            return;
        }

        const sheetTests = tests.filter(
            t =>
                String(t.test_sheet_id) === String(testSheetId)
        );

        if (sheetTests.length === 0) {
            alert("등록할 시험 문제가 없습니다.");
            return;
        }

        try {
            for (const test of sheetTests) {
                if (wrongResultIds.includes(test.id)) {
                    await window.electronAPI.updateWrongCount({
                        id: test.id
                    });
                } else {
                    await window.electronAPI.updateCorrectCount({
                        id: test.id
                    });
                }
                await window.electronAPI.updateTestResultRegistered({
                    id: test.id
                });
            }

            setTests(
                await window.electronAPI.getTests()
            );

            setWrongResultIds([]);
            setSelectedExamProblems([]);

            alert(
                `${sheetTests.length}개 문제의 시험 결과가 등록되었습니다.`
            );

        } catch (error) {
            console.error(
                "시험 결과 등록 실패:",
                error
            );

            alert(
                `시험 결과 등록 실패: ${error.message}`
            );
        }
    };

    const processPage = async (pageNumber, pageList = pdfPages) => {

        console.log("★★★★★ processPage 실행 ★★★★★");

        try {

            const pageInfo =
                pageList[pageNumber - 1];

            const pageImagePath =
                pageInfo?.image;

            console.log("===== PDF PAGES 진단 =====");
            console.log("pdfPages.length =", pdfPages.length);
            console.log("pageInfo =", pageInfo);
            console.log("pageImagePath =", pageImagePath);

            console.log("===== 현재 처리 페이지 =====");
            console.log("pageNumber =", pageNumber);
            console.log("pageImagePath =", pageImagePath);

            const splitResult = await window.electronAPI.splitImage(
                pageImagePath
            );

            console.log("splitResult =", splitResult);

            console.log("===== SPLIT RESULT =====");
            console.log(splitResult);

            console.log("leftWidth =", splitResult.leftWidth);
            console.log("totalWidth =", splitResult.totalWidth);
            console.log("height =", splitResult.height);

            const leftResult = await window.electronAPI.ocrTest(
                splitResult.leftPath
            );

            console.log("LEFT numberTokens :", leftResult.numberTokens);
            console.log("LEFT changedTokens :", leftResult.changedTokens);

            const rightResult = await window.electronAPI.ocrTest(
                splitResult.rightPath
            );

            console.log("RIGHT numberTokens :", rightResult.numberTokens);
            console.log("RIGHT changedTokens :", rightResult.changedTokens);

            console.log("LEFT RESULT =", leftResult);
            console.log("RIGHT RESULT =", rightResult);

            console.log("LEFT problemStarts =", leftResult.problemStarts);
            console.log("RIGHT problemStarts =", rightResult.problemStarts);

            console.log("LEFT PATH =", splitResult.leftPath);
            console.log("RIGHT PATH =", splitResult.rightPath);

            console.log("===== LEFT OCR =====");
            console.log(leftResult);

            console.log("===== RIGHT OCR =====");
            console.log(rightResult);

            if (!leftResult?.success || !rightResult?.success) {
                throw new Error(`페이지 ${pageNumber} OCR 실패`);
            }

            // ==========================================
            // 좌우 병합 시 중복 문항번호 제거
            // 예: LEFT ... 15,16 / RIGHT 16,17,18
            // LEFT의 마지막 16은 오검출로 판단
            // ==========================================

            const leftBoxes =
                [...(leftResult.problemBoxes || [])]
                    .filter(box => box.y < splitResult.height * 0.86)
                    .filter(box => {
                        const num = parseInt(String(box.number).replace(/\D/g, ""), 10);
                        return Number.isNaN(num) || (num >= 1 && num <= 99);
                    });

            const rightBoxes =
                [...(rightResult.problemBoxes || [])]
                    .filter(box => box.y < splitResult.height * 0.86);

            const rightFirstNumber =
                String(rightBoxes[0]?.number ?? "");

            let cleanedLeftBoxes = [...leftBoxes];

            // ==========================================
            // 09번 누락 복원 및 첫 문항 정합성 보정
            // ==========================================
            if (
                cleanedLeftBoxes.length >= 1 &&
                rightBoxes.length >= 1
            ) {
                const firstLeftBox = cleanedLeftBoxes[0];
                const firstRightBox = rightBoxes[0];
                const firstLeftNumber = Number(firstLeftBox?.number);
                const firstRightNumber = Number(firstRightBox?.number);

                if (
                    firstLeftNumber === 10 &&
                    firstRightNumber === 13
                ) {
                    cleanedLeftBoxes.unshift({
                        ...firstLeftBox,
                        number: "09",
                        y: firstRightBox.y,
                        height: firstLeftBox.y - firstRightBox.y,
                        source: "forced-leading-left-09"
                    });
                }
            }

            // ==========================================
            // 첫 문항번호 OCR 누락 보완
            //
            // ① LEFT 첫 문항 누락
            // 예:
            // LEFT  : 26, 27
            // RIGHT : 28, 29, 30
            //
            // 실제:
            // LEFT  : 25, 26, 27
            //
            // ② RIGHT 첫 문항 누락
            // 예:
            // LEFT  : 43, 44, 45
            // RIGHT : 47, 48
            //
            // 실제:
            // LEFT  : 43, 44, 45
            // RIGHT : 46, 47, 48
            //
            // 두 경우를 독립적으로 처리한다.
            // ==========================================


            // ==========================================
            // ① LEFT 첫 문항번호 OCR 누락 보완
            // ==========================================

            if (
                cleanedLeftBoxes.length >= 2 &&
                rightBoxes.length >= 1
            ) {

                const firstLeftBox =
                    cleanedLeftBoxes[0];

                const secondLeftBox =
                    cleanedLeftBoxes[1];

                const firstRightBox =
                    rightBoxes[0];

                const firstLeftNumber =
                    Number(
                        firstLeftBox?.number
                    );

                const secondLeftNumber =
                    Number(
                        secondLeftBox?.number
                    );

                const firstRightNumber =
                    Number(
                        firstRightBox?.number
                    );

                let lastValidLeftNumber = firstLeftNumber;
                for (let i = 1; i < cleanedLeftBoxes.length; i++) {
                    if (Number(cleanedLeftBoxes[i].number) === lastValidLeftNumber + 1) {
                        lastValidLeftNumber++;
                    }
                }

                const isMissingLeftFirstProblem =
                    Number.isInteger(firstLeftNumber) &&
                    Number.isInteger(secondLeftNumber) &&
                    Number.isInteger(firstRightNumber) &&
                    secondLeftNumber === firstLeftNumber + 1 &&
                    firstRightNumber === lastValidLeftNumber + 1 &&
                    firstLeftBox.y > firstRightBox.y + 50;

                if (
                    isMissingLeftFirstProblem
                ) {

                    cleanedLeftBoxes.unshift({

                        ...firstLeftBox,

                        number:
                            String(
                                firstLeftNumber - 1
                            ).padStart(2, "0"),

                        y:
                            firstRightBox.y,

                        height:
                            firstLeftBox.y -
                            firstRightBox.y,

                        source:
                            "visual-leading-left"

                    });

                    console.log(
                        "===== LEFT 첫 문항번호 누락 복원 ====="
                    );

                    console.log(
                        "복원 번호 =",
                        cleanedLeftBoxes[0].number
                    );

                    console.log(
                        "복원 y =",
                        cleanedLeftBoxes[0].y
                    );

                    console.log(
                        "복원 height =",
                        cleanedLeftBoxes[0].height
                    );
                }
            }

            // ==========================================
            // LEFT 마지막 문항번호 1개 누락 보완
            // 예: LEFT 10, 11 / RIGHT 13
            // → LEFT에 12 복원
            // ==========================================

            if (
                cleanedLeftBoxes.length >= 2 &&
                rightBoxes.length >= 1
            ) {
                const lastLeftBox =
                    cleanedLeftBoxes[cleanedLeftBoxes.length - 1];

                const previousLeftBox =
                    cleanedLeftBoxes[cleanedLeftBoxes.length - 2];

                const lastLeftNumber =
                    Number(lastLeftBox?.number);

                const previousLeftNumber =
                    Number(previousLeftBox?.number);

                const firstRightNumber =
                    Number(rightBoxes[0]?.number);

                if (
                    Number.isInteger(previousLeftNumber) &&
                    Number.isInteger(lastLeftNumber) &&
                    Number.isInteger(firstRightNumber) &&
                    lastLeftNumber === previousLeftNumber + 1 &&
                    firstRightNumber === lastLeftNumber + 2
                ) {
                    cleanedLeftBoxes.push({
                        ...lastLeftBox,
                        number:
                            String(lastLeftNumber + 1).padStart(2, "0"),
                        y:
                            lastLeftBox.y +
                            lastLeftBox.height,
                        height:
                            rightBoxes[0].y -
                            (
                                lastLeftBox.y +
                                lastLeftBox.height
                            ),
                        source:
                            "visual-missing-left-internal"
                    });
                }
            }


            // ==========================================
            // ② RIGHT 첫 문항번호 OCR 누락 보완
            // ==========================================

            if (
                cleanedLeftBoxes.length >= 1 &&
                rightBoxes.length >= 2
            ) {

                const firstLeftBox =
                    cleanedLeftBoxes[0];

                const firstRightBox =
                    rightBoxes[0];

                const secondRightBox =
                    rightBoxes[1];

                const firstLeftNumber =
                    Number(
                        firstLeftBox?.number
                    );

                const firstRightNumber =
                    Number(
                        firstRightBox?.number
                    );

                const secondRightNumber =
                    Number(
                        secondRightBox?.number
                    );

                const isMissingRightFirstProblem =
                    Number.isInteger(firstLeftNumber) &&
                    Number.isInteger(firstRightNumber) &&
                    Number.isInteger(secondRightNumber) &&
                    firstRightNumber === secondRightNumber - 1 &&
                    firstRightNumber ===
                    firstLeftNumber +
                    cleanedLeftBoxes.length + 1;

                if (
                    isMissingRightFirstProblem
                ) {

                    rightBoxes.unshift({

                        ...firstRightBox,

                        number:
                            String(
                                firstRightNumber - 1
                            ).padStart(2, "0"),

                        y:
                            firstLeftBox.y,

                        height:
                            firstRightBox.y -
                            firstLeftBox.y,

                        source:
                            "visual-leading-right"

                    });

                    console.log(
                        "===== RIGHT 첫 문항번호 누락 복원 ====="
                    );

                    console.log(
                        "복원 번호 =",
                        rightBoxes[0].number
                    );

                    console.log(
                        "복원 y =",
                        rightBoxes[0].y
                    );

                    console.log(
                        "복원 height =",
                        rightBoxes[0].height
                    );
                }
            }


            const lastLeftBox =
                cleanedLeftBoxes[
                cleanedLeftBoxes.length - 1
                ];

            const lastLeftNumber =
                String(lastLeftBox?.number ?? "");

            const isDuplicateLastLeft =
                lastLeftNumber !== "" &&
                lastLeftNumber === rightFirstNumber;

            if (isDuplicateLastLeft) {

                console.log(
                    "===== 좌측 마지막 중복번호 제거 + 박스 확장 ====="
                );

                console.log(
                    "중복 번호 =",
                    lastLeftNumber
                );

                /*
                 * 현재 마지막 LEFT 박스가
                 * 가짜 중복번호 때문에 이미 잘려 있으므로,
                 * LEFT 이미지의 실제 마지막 텍스트까지 다시 확장한다.
                 */

                const startY =
                    lastLeftBox.y + 10;

                let endY =
                    startY;

                for (
                    const word of leftResult.words || []
                ) {

                    if (!word.bbox) {
                        continue;
                    }

                    if (
                        word.bbox.y1 < startY
                    ) {
                        continue;
                    }

                    if (
                        word.bbox.y1 >
                        splitResult.height * 0.95
                    ) {
                        continue;
                    }

                    endY = Math.max(
                        endY,
                        word.bbox.y1
                    );
                }

                endY += 20;

                const expandedLastLeftBox = {
                    ...lastLeftBox,
                    height:
                        endY - lastLeftBox.y
                };

                /*
                 * 마지막 LEFT가 가짜 중복번호라면
                 * 그것은 버리고, 그 바로 앞의 실제 문항을 확장해야 한다.
                 */

                if (cleanedLeftBoxes.length >= 2) {

                    const realLastIndex =
                        cleanedLeftBoxes.length - 2;

                    const realLastBox =
                        cleanedLeftBoxes[realLastIndex];

                    cleanedLeftBoxes[
                        realLastIndex
                    ] = {
                        ...realLastBox,
                        height:
                            endY - realLastBox.y
                    };

                    cleanedLeftBoxes.pop();
                }
            }

            // ==========================================
            // LEFT 마지막 내부 숫자 + RIGHT 첫 문항번호 연속 처리
            //
            // 예:
            // LEFT  ... 03, 97
            // RIGHT      04, 05, 06
            //
            // 실제:
            // LEFT  ... 03
            // RIGHT      04, 05, 06
            //
            // 즉 LEFT의 마지막 97은 03번 문제 내부 숫자
            // ==========================================

            if (
                cleanedLeftBoxes.length >= 2 &&
                rightBoxes.length >= 1
            ) {
                const lastLeft =
                    cleanedLeftBoxes[
                    cleanedLeftBoxes.length - 1
                    ];

                const previousLeft =
                    cleanedLeftBoxes[
                    cleanedLeftBoxes.length - 2
                    ];

                const rightFirst =
                    Number(rightBoxes[0]?.number);

                const previousNumber =
                    Number(previousLeft?.number);

                const lastLeftNumber =
                    Number(lastLeft?.number);

                const isLeftInternalNumber =
                    Number.isInteger(previousNumber) &&
                    Number.isInteger(lastLeftNumber) &&
                    Number.isInteger(rightFirst) &&
                    rightFirst === previousNumber + 1 &&
                    lastLeftNumber !== previousNumber + 1;

                if (isLeftInternalNumber) {

                    console.log(
                        "===== LEFT 마지막 내부 숫자 제거 ====="
                    );

                    console.log(
                        "실제 이전 문항 =",
                        previousLeft.number
                    );

                    console.log(
                        "오검출 숫자 =",
                        lastLeft.number
                    );

                    console.log(
                        "RIGHT 첫 문항 =",
                        rightBoxes[0].number
                    );

                    const startY =
                        previousLeft.y + 10;

                    let endY =
                        startY;

                    for (
                        const word of leftResult.words || []
                    ) {

                        if (!word.bbox) {
                            continue;
                        }

                        if (
                            word.bbox.y1 < startY
                        ) {
                            continue;
                        }

                        if (
                            word.bbox.y1 >
                            splitResult.height * 0.95
                        ) {
                            continue;
                        }

                        endY = Math.max(
                            endY,
                            word.bbox.y1
                        );
                    }

                    endY += 50;

                    cleanedLeftBoxes[
                        cleanedLeftBoxes.length - 2
                    ] = {
                        ...previousLeft,
                        height:
                            endY - previousLeft.y
                    };

                    cleanedLeftBoxes.pop();
                }
            }

            console.log(
                "===== 좌우 중복 문항번호 검사 ====="
            );

            console.log(
                "LEFT 원본 =",
                leftBoxes.map(b => b.number)
            );

            console.log(
                "RIGHT 원본 =",
                rightBoxes.map(b => b.number)
            );

            console.log(
                "LEFT 정리 =",
                cleanedLeftBoxes.map(b => b.number)
            );

            console.log(
                "LEFT 원본 상세 =",
                leftBoxes.map(b => ({
                    number: b.number,
                    y: b.y
                }))
            );

            console.log(
                "RIGHT 원본 상세 =",
                rightBoxes.map(b => ({
                    number: b.number,
                    y: b.y
                }))
            );

            const result = {
                success: true,

                words: [
                    ...(leftResult.words || []),

                    ...(rightResult.words || []).map(word => ({
                        ...word,
                        bbox: {
                            ...word.bbox,
                            x0:
                                word.bbox.x0 +
                                splitResult.leftWidth,

                            x1:
                                word.bbox.x1 +
                                splitResult.leftWidth
                        }
                    }))
                ],

                problemBoxes: [
                    ...cleanedLeftBoxes.map(box => ({
                        ...box,
                        sourceImagePath: splitResult.leftPath,
                        cropX: box.x
                    })),

                    ...rightBoxes.map((box, index) => {

                        const visualRight =
                            box.source === "visual";

                        const lastActualLeftNumber =
                            Number(
                                cleanedLeftBoxes[
                                    cleanedLeftBoxes.length - 1
                                ]?.number
                            );

                        return {
                            ...box,

                            number:
                                visualRight &&
                                    Number.isInteger(lastActualLeftNumber)
                                    ? String(
                                        lastActualLeftNumber +
                                        index +
                                        1
                                    ).padStart(2, "0")
                                    : box.number,

                            x:
                                box.x +
                                splitResult.leftWidth,

                            cropX:
                                box.x,

                            sourceImagePath:
                                splitResult.rightPath
                        };
                    })
                ],

                leftProblemBoxCount:
                    cleanedLeftBoxes.length,

                rightProblemBoxCount:
                    rightBoxes.length
            };

            console.log("===== merged problemBoxes =====");

            result.problemBoxes.forEach((box, i) => {

                console.log(
                    i,
                    "number=",
                    box.number,
                    "x=",
                    box.x,
                    "y=",
                    box.y,
                    "width=",
                    box.width,
                    "height=",
                    box.height
                );

            });

            console.log("leftWidth =", splitResult.leftWidth);

            console.table(result.problemBoxes);

            return {
                ...result,
                pageNumber,
                pageImagePath,
                splitResult,

                // 의심 페이지 판정용 최종 좌우 문항번호
                leftProblemNumbers:
                    result.problemBoxes
                        .slice(0, cleanedLeftBoxes.length)
                        .map(box => box.number),

                rightProblemNumbers:
                    result.problemBoxes
                        .slice(cleanedLeftBoxes.length)
                        .map(box => box.number),

                leftProblemStarts:
                    leftResult.problemStarts || [],

                rightProblemStarts:
                    rightResult.problemStarts || [],

                rightBlockCount:
                    rightResult.blockCount || 0,

                rightMappedWordCount:
                    rightResult.mappedWordCount || 0,

                rightOcrText:
                    rightResult.text || "",

                rightDebugNumberCandidates:
                    rightResult.debugNumberCandidates || [],

                rightDebugLeftWords:
                    rightResult.debugLeftWords || []
            };

        } catch (err) {

            console.error(
                `페이지 ${pageNumber} OCR ERROR:`,
                err
            );

            throw err;
        }
    };


    const handleOCRTest = async () => {

        try {

            const result = await processPage(currentPage);

            const savedAnalyses =
                await window.electronAPI.getPageAnalyses(
                    currentBookId
                );

            const currentAnalysis = savedAnalyses.find(
                item => Number(item.page_num) === Number(currentPage)
            );

            const isVerified =
                currentAnalysis?.verified === 1 ||
                currentAnalysis?.verified === true;

            const boxesToUse =
                isVerified
                    ? currentAnalysis.problem_boxes || []
                    : result.problemBoxes;

            await window.electronAPI.savePageAnalysis({
                book_id: currentBookId,
                page_num: currentPage,
                problem_count: boxesToUse.length,
                problem_boxes: boxesToUse,
                excluded: false,
                verified: isVerified
            });

            setPageMeta({
                w: result.splitResult.totalWidth,
                h: result.splitResult.height
            });

            setProblemBoxes(
                isVerified
                    ? currentAnalysis.problem_boxes || []
                    : result.problemBoxes
            );

            console.log(
                "problemBoxes state =",
                result.problemBoxes
            );

            setOcrResult(
                `페이지 ${currentPage}\n\n` +

                `LEFT 후보:\n` +
                `${(result.leftProblemStarts || [])
                    .map(p =>
                        `${p.number}(y=${p.y}, L=${p.debugLeftDigit}, R=${p.debugRightDigit})`
                    )
                    .join(", ") || "없음"
                }\n\n` +

                `RIGHT 후보:\n` +
                `${(result.rightProblemStarts || [])
                    .map(p =>
                        `${p.number}(y=${p.y})`
                    )
                    .join(", ") || "없음"
                }\n\n` +

                `RIGHT OCR 글자수: ` +
                `${result.rightOcrText?.length || 0}` +

                `\nRIGHT BLOCK 수: ` +
                `${result.rightBlockCount || 0}` +

                `\nRIGHT WORD 수: ` +
                `${result.rightMappedWordCount || 0}` +

                `\n\nRIGHT 숫자 후보:\n` +
                `${(result.rightDebugNumberCandidates || [])
                    .map(p =>
                        `${p.text}(x=${p.x}, y=${p.y}, w=${p.width}, h=${p.height})`
                    )
                    .join("\n") || "없음"
                }` +

                `\n\nRIGHT 왼쪽영역 OCR:\n` +
                `${(result.rightDebugLeftWords || [])
                    .map(p =>
                        `${p.text}(x=${p.x}, y=${p.y}, w=${p.width}, h=${p.height})`
                    )
                    .join("\n") || "없음"
                }` +

                `\n\nRIGHT OCR 원문:\n` +
                `${result.rightOcrText || "없음"}` +

                `\n\n최종 문항 수: ` +
                `${result.problemBoxes.length}개`
            );

        } catch (err) {

            alert(err.stack);

            setOcrResult(
                `런타임 에러:
        ${err.message}

${err.stack}`
            );
        }

    };

    // ==========================================
    // 페이지 분석 결과 의심 여부 판정
    // ==========================================
    const checkSuspiciousPage = (
        result,
        previousCount = null,
        nextCount = null
    ) => {

        const leftCount =
            Number(result.leftProblemBoxCount || 0);

        const rightCount =
            Number(result.rightProblemBoxCount || 0);

        const totalCount =
            Number(result.problemBoxes?.length || 0);

        const reasons = [];

        // ① 좌우 문항 수 불일치
        if (leftCount !== rightCount) {
            reasons.push(
                `좌우 문항 수 불일치 (${leftCount} / ${rightCount})`
            );
        }

        // ② 전체 문항 수가 2 이하 또는 9 이상
        if (
            totalCount <= 2 ||
            totalCount >= 9
        ) {
            reasons.push(
                `문항 수 이상 (${totalCount}개)`
            );
        }

        // ③ 전 페이지와 문항 수 차이
        if (
            previousCount !== null &&
            totalCount !== previousCount
        ) {
            reasons.push(
                `전 페이지 문항 수 차이 (${previousCount} → ${totalCount})`
            );
        }

        // ③ 다음 페이지와 문항 수 차이
        if (
            nextCount !== null &&
            totalCount !== nextCount
        ) {
            reasons.push(
                `다음 페이지 문항 수 차이 (${totalCount} → ${nextCount})`
            );
        }

        // ③ 다음 페이지와 문항 수 차이
        if (
            nextCount !== null &&
            totalCount !== nextCount
        ) {
            reasons.push(
                `다음 페이지 문항 수 차이 (${totalCount} → ${nextCount})`
            );
        }

        // ④ 페이지 전체 문항번호 연속성 검사
        const pageNumbers = [
            ...(result.leftProblemNumbers || []),
            ...(result.rightProblemNumbers || [])
        ]
            .map(n => Number(n))
            .filter(n => Number.isInteger(n));

        for (
            let i = 1;
            i < pageNumbers.length;
            i++
        ) {

            const previousNumber =
                pageNumbers[i - 1];

            const currentNumber =
                pageNumbers[i];

            if (
                currentNumber !== previousNumber + 1
            ) {
                reasons.push(
                    `페이지 문항번호 불연속 (${previousNumber} → ${currentNumber})`
                );
            }
        }

        return {
            suspicious: reasons.length > 0,
            reasons
        };

        return {
            suspicious: reasons.length > 0,
            reasons
        };
    };

    const handleAnalyzePagesTest = async () => {

        console.log(
            "===== 페이지 분석 전용 테스트 시작 ====="
        );

        if (!currentBookId) {
            alert("등록된 교재가 없습니다.");
            return;
        }

        const pageStart = startPage;
        const pageEnd = endPage;

        if (
            !Number.isInteger(pageStart) ||
            !Number.isInteger(pageEnd) ||
            pageStart < 1 ||
            pageEnd < pageStart
        ) {
            alert("분석 범위를 확인해주세요.");
            return;
        }

        const results = [];

        for (
            let page = pageStart;
            page <= pageEnd;
            page++
        ) {

            if (excludedPages.includes(page)) {

                console.log(
                    `===== 페이지 ${page} 분석 제외 ===== `
                );

                continue;
            }

            const currentIndex =
                page - pageStart + 1;

            const totalPages =
                pageEnd - pageStart + 1;

            const progressPercent =
                Math.round(
                    ((currentIndex - 1) / totalPages) * 100
                );

            setProcessProgress(
                `페이지 ${page} 분석 중...${progressPercent} % `
            );

            try {

                const result =
                    await processPage(page);

                results.push({
                    page,
                    success: true,

                    problemCount:
                        result.problemBoxes.length,

                    // 의심 판정에 필요한 전체 분석 결과 보관
                    analysisResult: result
                });

                setProcessProgress(
                    `페이지 ${page} 분석 완료: ` +
                    `${result.problemBoxes.length}개 검출`
                );

            } catch (error) {

                console.error(
                    `페이지 ${page} 분석 실패: `,
                    error
                );

                results.push({
                    page,
                    success: false,
                    problemCount: 0,
                    error: error.message
                });
            }
        }

        // ==========================================
        // 분석 완료 후 페이지별 의심 여부 판정 및 저장
        // 정상 페이지 → 자동 검증 완료
        // 의심 페이지 → 미검증 상태 유지
        // ==========================================

        for (const item of results) {

            if (!item.success || !item.analysisResult) {
                continue;
            }

            const page = item.page;
            const analysisResult = item.analysisResult;

            // 바로 앞 페이지의 분석 결과
            const previousResult =
                results.find(
                    result =>
                        result.success &&
                        result.page === page - 1
                );

            // 바로 다음 페이지의 분석 결과
            const nextResult =
                results.find(
                    result =>
                        result.success &&
                        result.page === page + 1
                );

            const previousSavedAnalysis =
                pageAnalyses.find(
                    analysis =>
                        Number(analysis.page_num) === page - 1
                );

            const nextSavedAnalysis =
                pageAnalyses.find(
                    analysis =>
                        Number(analysis.page_num) === page + 1
                );

            const previousCount =
                previousResult
                    ? previousResult.problemCount
                    : previousSavedAnalysis
                        ? Number(previousSavedAnalysis.problem_count || 0)
                        : null;

            const nextCount =
                nextResult
                    ? nextResult.problemCount
                    : nextSavedAnalysis
                        ? Number(nextSavedAnalysis.problem_count || 0)
                        : null;

            const suspiciousResult =
                checkSuspiciousPage(
                    analysisResult,
                    previousCount,
                    nextCount
                );

            const existingAnalysis =
                pageAnalyses.find(
                    analysis =>
                        Number(analysis.page_num) === page
                );

            const isExcluded =
                existingAnalysis?.excluded === 1 ||
                existingAnalysis?.excluded === true;

            await window.electronAPI.savePageAnalysis({

                book_id: currentBookId,

                page_num: page,

                problem_count:
                    analysisResult.problemBoxes.length,

                problem_boxes:
                    analysisResult.problemBoxes,

                excluded:
                    isExcluded,

                verified:
                    isExcluded
                        ? false
                        : !suspiciousResult.suspicious
            });

            console.log(
                `===== 페이지 ${page} 검증 판정 =====`
            );

            console.log(
                "문항 수 =",
                analysisResult.problemBoxes.length
            );

            console.log(
                "의심 여부 =",
                suspiciousResult.suspicious
            );

            console.log(
                "의심 이유 =",
                suspiciousResult.reasons
            );
        }

        // ==========================================
        // 저장된 PageAnalysis를 다시 읽어
        // 화면 상태를 최신 상태로 갱신
        // ==========================================

        const updatedAnalyses =
            await window.electronAPI.getPageAnalyses(
                currentBookId
            );

        setPageAnalyses(
            updatedAnalyses || []
        );

        const totalDetected =
            results.reduce(
                (sum, item) =>
                    sum + (item.problemCount || 0),
                0
            );

        setProcessProgress(
            `페이지 분석 완료: ${pageStart}~${pageEnd}페이지`
        );

        console.log(
            "===== 페이지 분석 전용 테스트 결과 ====="
        );

        console.table(results);

        alert(
            `${pageStart}~${pageEnd}페이지 분석이 완료되었습니다.\n\n` +
            `총 검출: ${totalDetected}개\n` +
            `Problems 저장: 없음`
        );
    };

    const handleSaveVerifiedProblems = async () => {

        setSaveProgress("");

        if (!currentBookId) {
            alert("현재 교재가 없습니다.");
            return;
        }

        try {

            const analyses =
                await window.electronAPI.getPageAnalyses(
                    currentBookId
                );

            if (!analyses || analyses.length === 0) {
                alert("저장할 페이지 분석 결과가 없습니다.");
                return;
            }

            const targetAnalyses =
                analyses.filter(analysis => {
                    const page = Number(analysis.page_num);

                    return (
                        page >= Number(startPage) &&
                        page <= Number(endPage)
                    );
                });

            if (targetAnalyses.length === 0) {
                alert(
                    `${startPage}~${endPage}페이지의 분석 결과가 없습니다.`
                );
                return;
            }

            const unverifiedPages =
                targetAnalyses.filter(
                    analysis =>
                        analysis.excluded !== 1 &&
                        analysis.excluded !== true &&
                        analysis.verified !== 1 &&
                        analysis.verified !== true
                );

            if (unverifiedPages.length > 0) {

                const pageText =
                    unverifiedPages
                        .map(analysis =>
                            `${analysis.page_num}페이지`
                        )
                        .join(", ");

                alert(
                    `아직 검증하지 않은 페이지가 있습니다.\n\n` +
                    `${pageText}\n\n` +
                    `모든 페이지를 확인하거나 제외한 후 최종 저장하세요.`
                );

                return;
            }
            console.log(
                "===== 최종 저장 직전 PageAnalyses 상태 ====="
            );

            console.table(
                analyses.map(analysis => ({
                    page: analysis.page_num,
                    problemCount: analysis.problem_count,
                    excluded: analysis.excluded,
                    verified: analysis.verified
                }))
            );
            const existingProblems =
                await window.electronAPI.getProblems();

            const currentBookProblems =
                existingProblems.filter(
                    problem =>
                        Number(problem.book_id) ===
                        Number(currentBookId)
                );

            let savedCount = 0;
            let skippedCount = 0;
            let failedCount = 0;

            for (let i = 0; i < targetAnalyses.length; i++) {

                const analysis = targetAnalyses[i];

                const page =
                    Number(analysis.page_num);

                setSaveProgress(
                    `저장 중... ${i + 1} / ${targetAnalyses.length}페이지 (${page}페이지)`
                );

                const isExcluded =
                    analysis.excluded === 1 ||
                    analysis.excluded === true;

                if (isExcluded) {

                    console.log(
                        `페이지 ${page} → 제외, 최종 저장 건너뜀`
                    );

                    continue;
                }

                const boxes =
                    analysis.problem_boxes || [];

                let pageComplete = true;

                // 해당 페이지의 기존 문제를 모두 삭제하고
                // 현재 검증된 박스를 기준으로 다시 저장
                try {
                    await window.electronAPI.deleteProblemsByPage(
                        currentBookId,
                        page
                    );
                } catch (error) {
                    pageComplete = false;
                    failedCount++;

                    console.error(
                        `페이지 ${page} 기존 문제 삭제 실패:`,
                        error
                    );

                    continue;
                }

                for (const box of boxes) {

                    const questionNum =
                        box.number;

                    const problemData = {
                        book_id: currentBookId,
                        page_num: page,
                        question_num: questionNum,
                        image_path:
                            pdfPages[page - 1]?.image || "",
                        ocr_text: "",
                        x: Math.round(box.x),
                        y: Math.round(box.y),
                        width: Math.round(box.width),
                        height: Math.round(box.height),
                        ocr_words: []
                    };

                    try {

                        const cropResult =
                            await window.electronAPI.extractProblem(
                                problemData
                            );

                        if (!cropResult.success) {

                            pageComplete = false;
                            failedCount++;

                            console.error(
                                `페이지 ${page} / 문제 ${questionNum} 이미지 추출 실패`
                            );

                            continue;
                        }

                        await window.electronAPI.saveProblem({

                            ...problemData,

                            image_path:
                                cropResult.imagePath,

                            ocr_text: "",

                            ocr_words: []
                        });

                        savedCount++;

                        currentBookProblems.push({
                            ...problemData
                        });

                    } catch (error) {

                        pageComplete = false;
                        failedCount++;

                        console.error(
                            `페이지 ${page} / 문제 ${questionNum} 최종 저장 실패: `,
                            error
                        );
                    }
                }

                if (pageComplete) {

                    await window.electronAPI.savePageAnalysis({

                        book_id: currentBookId,

                        page_num: page,

                        problem_count:
                            analysis.problem_count || boxes.length,

                        problem_boxes:
                            boxes,

                        excluded: false,

                        verified: true
                    });

                }
            }

            const updatedProblems =
                await window.electronAPI.getProblems();

            setProblems(updatedProblems);

            const updatedAnalyses =
                await window.electronAPI.getPageAnalyses(
                    currentBookId
                );

            setPageAnalyses(
                updatedAnalyses || []
            );

            setSaveProgress(
                `저장 완료 — ${targetAnalyses.length}페이지 처리`
            );

            alert(
                `검증 완료 페이지 문제 저장이 끝났습니다.\n\n` +
                `새로 저장: ${savedCount}개\n` +
                `기존 문제로 건너뜀: ${skippedCount}개\n` +
                `저장 실패: ${failedCount}개`
            );

        } catch (error) {

            console.error(
                "검증 완료 문제 저장 실패:",
                error
            );

            setSaveProgress(
                `저장 실패: ${error.message}`
            );

            alert(
                `검증 완료 문제 저장 실패: \n${error.message}`
            );
        }
    };

    const handleSelectExamProblem = (testId) => {
        setSelectedExamProblems(prev => {
            return prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId];
        });
    };

    const handleSelectAllExamProblems = (studentId) => {
        const studentTests = tests.filter(
            t => Number(t.student_id) === Number(studentId)
        );

        const studentTestIds = studentTests.map(
            t => t.id
        );

        const allSelected = studentTestIds.every(
            id => selectedExamProblems.includes(id)
        );

        if (allSelected) {
            setSelectedExamProblems(prev =>
                prev.filter(
                    id => !studentTestIds.includes(id)
                )
            );
        } else {
            setSelectedExamProblems(prev => [
                ...new Set([
                    ...prev,
                    ...studentTestIds
                ])
            ]);
        }
    };

    const handleSelectWrongRateProblems = () => {
        const selectedIds = tests
            .filter(t => {
                if (
                    Number(t.student_id) !==
                    Number(selectedExamStudentId)
                ) {
                    return false;
                }

                const total =
                    (t.wrong_count || 0) +
                    (t.correct_count || 0);

                const wrongRate =
                    total > 0
                        ? Math.round(
                            ((t.wrong_count || 0) / total) * 100
                        )
                        : 0;

                return wrongRate >= wrongRateThreshold;
            })
            .map(t => t.id);

        setSelectedExamProblems(selectedIds);
    };

    // 로깅이 필요하다면 별도의 useEffect 사용
    useEffect(() => {
        const selectedProblems = tests.filter(t => selectedExamProblems.includes(t.id));
        console.log("===== 시험지 선택 문제 =====");
        console.table(selectedProblems);
    }, [selectedExamProblems, tests]);

    const handleSplitTest = async () => {

        try {

            const pageImagePath =
                `output/page_${String(currentPage).padStart(3, '0')}.png`;

            console.log("===== 현재 분리 페이지 =====");
            console.log("currentPage =", currentPage);
            console.log("pageImagePath =", pageImagePath);

            const result =
                await window.electronAPI.splitImage(
                    pageImagePath
                );

            console.log(
                "===== 좌우분리 결과 ====="
            );

            console.log(result);

            if (!result || !result.success) {

                setOcrResult(
                    `좌우분리 실패\n\n` +
                    `${result?.error || "알 수 없는 오류"}`
                );

                return;
            }

            setOcrResult(
                `페이지 ${currentPage} 좌우분리 완료\n\n` +
                `원본 크기: ${result.totalWidth} × ${result.height} \n` +
                `왼쪽 너비: ${result.leftWidth} \n` +
                `오른쪽 너비: ${result.totalWidth - result.leftWidth
                } \n\n` +
                `LEFT: \n${result.leftPath} \n\n` +
                `RIGHT: \n${result.rightPath} `
            );

        } catch (err) {

            console.error(
                "좌우분리 테스트 실패:",
                err
            );

            setOcrResult(
                `좌우분리 테스트 오류\n\n${err.message} `
            );
        }

    };

    const handleFileChange = async () => {

        const file = await window.electronAPI.openFileDialog();

        if (!file) {
            return;
        }

        setSelectedPdfName(file.name);

        const savedBook = await window.electronAPI.saveBook({
            title: file.name,
            pdf_path: file.path
        });

        console.log("등록된 교재 ID:", savedBook.id);

        setCurrentBookId(savedBook.id);

        const updatedBooks = await window.electronAPI.getBooks();
        setBooks(updatedBooks);

        const result =
            await window.electronAPI.analyzePdf(file.path);

        if (!result.success) {
            console.error("PDF 분석 실패:", result);
            alert("PDF 분석에 실패했습니다.");
            return;
        }

        console.log("===== PDF 페이지 수 확인 =====");
        console.log(
            "result.pages.length =",
            result.pages.length
        );
        console.log(
            "result.pages =",
            result.pages
        );

        setPdfPages(result.pages);

        setStartPage(1);
        setEndPage(result.pages.length);

        const images = [];

        for (const page of result.pages) {

            const img =
                await window.electronAPI.getImageData(page.image);

            images.push(img);
        }

        setPdfImages(images);

        if (images.length > 0) {

            const imageIndex = currentPage - 1;

            if (
                imageIndex >= 0 &&
                imageIndex < images.length
            ) {
                setTestImage(images[imageIndex]);
            } else {
                setTestImage(images[0]);
            }
        }
    };

    const handleDeleteBook = async (id, title) => {
        if (window.confirm(`'${title}' 교재를 정말 삭제하시겠습니까 ? `)) {
            await window.electronAPI.deleteBook(id);
            const updatedBooks = await window.electronAPI.getBooks();
            setBooks(updatedBooks);
        }
    };

    const handleAddStudent = async () => {
        if (newStudent.name) {
            await window.electronAPI.saveStudent(newStudent);
            setStudents(await window.electronAPI.getStudents());
            setNewStudent({ name: '', class_name: '' });
        }
    };

    // 학생 삭제
    const handleDeleteStudent = async (id, name) => {
        const confirmed = window.confirm(
            `'${name}' 학생을 삭제하시겠습니까 ?\n\n학생의 오답 기록도 함께 삭제됩니다.`
        );

        if (!confirmed) return;

        try {
            await window.electronAPI.deleteStudent(id);

            const updatedStudents = await window.electronAPI.getStudents();
            setStudents(updatedStudents);

            // 화면에 표시되는 테스트 목록도 즉시 갱신
            const updatedTests = await window.electronAPI.getTests();
            setTests(updatedTests);

            alert(`'${name}' 학생이 삭제되었습니다.`);
        } catch (error) {
            console.error("학생 삭제 실패:", error);
            alert(`학생 삭제 실패: ${error.message} `);
        }
    };

    const handleSelectQuestion = (questionNum) => {
        // 이미 선택된 문제는 선택 해제
        if (selectedQuestionNums.includes(questionNum)) {
            setSelectedQuestionNums(prev =>
                prev.filter(num => num !== questionNum)
            );
            return;
        }

        // 정답이 입력되지 않은 문제는 선택 불가
        if (!problemAnswers[questionNum]) {
            alert(`${questionNum}번 문제의 정답을 먼저 입력해주세요.`);
            return;
        }

        setSelectedQuestionNums(prev => [
            ...prev,
            questionNum
        ]);
    };

    const handleAddSelectedTests = async () => {
        if (
            !newTest.student_id ||
            !newTest.book_id ||
            !newTest.page_num
        ) {
            alert("학생, 교재, 페이지를 먼저 선택해주세요.");
            return;
        }

        if (selectedQuestionNums.length === 0) {
            alert("등록할 문제를 선택해주세요.");
            return;
        }

        let successCount = 0;

        for (const questionNum of selectedQuestionNums) {

            const sameProblem = tests.find(
                t =>
                    Number(t.student_id) === Number(newTest.student_id) &&
                    Number(t.book_id) === Number(newTest.book_id) &&
                    String(t.page_num) === String(newTest.page_num) &&
                    String(t.question_num) === String(questionNum)
            );

            if (sameProblem) {
                await window.electronAPI.updateTestAnswer({
                    id: sameProblem.id,
                    answer: problemAnswers[questionNum]
                });
            } else {
                await window.electronAPI.saveTest({
                    ...newTest,
                    question_num: questionNum,
                    answer: problemAnswers[questionNum],
                    wrong_count: 0,
                    correct_count: 0
                });
            }

            successCount++;
        }

        setTests(await window.electronAPI.getTests());

        setSelectedQuestionNums([]);

        alert(`${successCount}개 문제가 오답 등록되었습니다.`);
    };

    // 학생별 오답 문제 조회 테스트
    const handleWrongProblemsTest = async () => {
        if (students.length === 0) {
            alert("등록된 학생이 없습니다.");

            return;
        }

        const studentId = Number(newTest.student_id);

        if (!studentId) {
            alert("학생을 먼저 선택하세요.");
            return;
        }

        try {
            const problems = await window.electronAPI.getWrongProblems(studentId);

            console.log("===== 학생별 오답 문제 조회 =====");
            console.log("학생 ID:", studentId);
            console.table(problems);

            // 오답 문제 이미지 로드
            const problemsWithImages = [];

            for (const problem of problems) {
                const imageData = await window.electronAPI.getLocalImage(
                    problem.image_path
                );

                problemsWithImages.push({
                    ...problem,
                    imageData
                });
            }

            console.log("===== 오답 문제 이미지 로드 결과 =====");
            console.table(
                problemsWithImages.map(problem => ({
                    test_id: problem.test_id,
                    book_id: problem.book_id,
                    page_num: problem.page_num,
                    question_num: problem.question_num,
                    image_loaded: !!problem.imageData
                }))
            );

            setWrongProblems(problemsWithImages);

            console.log("===== setWrongProblems 직전 =====");
            console.log("problemsWithImages:", problemsWithImages);
            console.log("problemsWithImages.length:", problemsWithImages.length);


            alert(
                `${students[0].name} 학생의 현재 오답 문제 ${problemsWithImages.length}개를 조회했습니다.`
            );
        } catch (error) {
            console.error("오답 문제 조회 실패:", error);
            alert(`오답 문제 조회 실패: ${error.message} `);
        }
    };

    const handleManualBoxPointerDown = (e) => {
        if (!manualBoxMode) return;

        const rect = e.currentTarget.getBoundingClientRect();

        setManualBoxStart({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        alert(
            `clientX=${e.clientX}, clientY=${e.clientY}\n` +
            `rect.left=${rect.left}, rect.top=${rect.top}\n` +
            `시작X=${e.clientX - rect.left}, 시작Y=${e.clientY - rect.top}`
        );

        setManualBoxPreview(null);
    };

    const handleManualBoxPointerMove = (e) => {
        if (!manualBoxMode || !manualBoxStart) return;

        const rect = e.currentTarget.getBoundingClientRect();

        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        setManualBoxPreview({
            x: Math.min(manualBoxStart.x, currentX),
            y: Math.min(manualBoxStart.y, currentY),
            width: Math.abs(currentX - manualBoxStart.x),
            height: Math.abs(currentY - manualBoxStart.y)
        });
    };

    const handleManualBoxPointerUp = (e) => {
        alert("PointerUp 실행됨");

        if (!manualBoxMode || !manualBoxStart) return;

        const rect = e.currentTarget.getBoundingClientRect();

        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const x = Math.min(manualBoxStart.x, currentX);
        const y = Math.min(manualBoxStart.y, currentY);
        const width = Math.abs(currentX - manualBoxStart.x);
        const height = Math.abs(currentY - manualBoxStart.y);

        alert(`width=${width}, height=${height}`);

        if (width < 10 || height < 10) {
            setManualBoxStart(null);
            setManualBoxPreview(null);
            return;
        }

        const scaleX = pageMeta.w / rect.width;
        const scaleY = pageMeta.h / rect.height;

        setManualBoxStart(prev => ({
            ...prev,
            x,
            y,
            width,
            height,
            scaleX,
            scaleY
        }));

        setManualBoxNumber("");
        setManualBoxPending(true);
        setManualBoxPreview(null);
    };

    return (
        <div className="app-container">
            <aside className="sidebar">
                <h2 className="logo">오답문제 생성기 v1.0</h2>
                <nav className="menu">
                    <button
                        className={`menu-btn ${activeMenu === '교재관리' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('교재관리')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            padding: '15px 20px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        📚 교재관리
                    </button>

                    <button
                        className={`menu-btn ${activeMenu === '학생관리' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('학생관리')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            padding: '15px 20px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        👨‍🎓 학생관리
                    </button>

                    <button
                        className={`menu-btn ${activeMenu === '테스트관리' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('테스트관리')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            padding: '15px 20px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        📝 테스트관리
                    </button>

                    <button
                        className={`menu-btn ${activeMenu === '오답관리' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('오답관리')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            padding: '15px 20px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        ❌ 오답관리
                    </button>

                    <button
                        className={`menu-btn ${activeMenu === '환경설정' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('환경설정')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            padding: '15px 20px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        ⚙ 환경설정
                    </button>
                </nav>
            </aside>

            <main className="content">
                {activeMenu === '교재관리' && (
                    <div className="management-section">
                        <h2>교재관리</h2>
                        <hr className="divider" />

                        <button className="action-btn" onClick={handleFileChange}>[ PDF 등록 ]</button>

                        {selectedPdfName && (
                            <div
                                style={{
                                    marginTop: "10px",
                                    fontWeight: "bold"
                                }}
                            >
                                선택된 PDF: {selectedPdfName}
                            </div>
                        )}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                                marginBottom: "10px"
                            }}
                        >
                            <span style={{ fontWeight: "bold" }}>
                                현재 페이지
                            </span>

                            <input
                                type="number"
                                min="1"
                                value={currentPage}
                                onChange={async e => {
                                    const page = Number(e.target.value);

                                    setCurrentPage(page);

                                    const imageIndex = page - 1;

                                    if (
                                        imageIndex >= 0 &&
                                        imageIndex < pdfPages.length
                                    ) {
                                        const pageInfo =
                                            pdfPages[imageIndex];

                                        const imageData =
                                            await window.electronAPI.getImageData(
                                                pageInfo.image
                                            );

                                        if (imageData) {
                                            setTestImage(imageData);
                                        }
                                    }
                                }}
                                style={{
                                    width: "80px",
                                    padding: "8px",
                                    fontSize: "15px",
                                    textAlign: "center"
                                }}
                            />

                            <span style={{ fontWeight: "bold", marginLeft: "15px" }}>
                                처리 범위
                            </span>

                            <input
                                type="number"
                                min="1"
                                value={startPage}
                                onChange={e =>
                                    setStartPage(
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value)
                                    )
                                }
                                style={{
                                    width: "70px",
                                    padding: "8px",
                                    fontSize: "15px",
                                    textAlign: "center"
                                }}
                            />

                            <span>~</span>

                            <input
                                type="number"
                                min="1"
                                value={endPage}
                                onChange={e =>
                                    setEndPage(
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value)
                                    )
                                }
                                style={{
                                    width: "70px",
                                    padding: "8px",
                                    fontSize: "15px",
                                    textAlign: "center"
                                }}
                            />

                            <button
                                className="action-btn"
                                onClick={handleOCRTest}
                            >
                                OCR 테스트
                            </button>

                            <button
                                className="action-btn"
                                onClick={handleSplitTest}
                                style={{ marginLeft: "10px" }}
                            >
                                좌우분리 테스트
                            </button>

                            {/* 기존 직접 저장 방식은 새 검증 흐름과 중복되므로 UI에서 사용하지 않음 */}
                            <button
                                className="action-btn"
                                onClick={handleAnalyzePagesTest}
                                style={{
                                    marginLeft: "10px",
                                    backgroundColor: "#6c757d"
                                }}
                            >
                                📊 페이지 분석
                            </button>
                            <button
                                className="action-btn"
                                onClick={handleSaveVerifiedProblems}
                                style={{
                                    marginLeft: "10px",
                                    backgroundColor: "#198754"
                                }}
                            >
                                ✅ 검증 완료 → 문제 저장
                            </button>
                        </div>

                        <div
                            style={{
                                marginTop: "20px",
                                fontWeight: "bold",
                                color: "#1976d2"
                            }}
                        >
                            {ocrProgress}
                        </div>

                        {processProgress && (
                            <div
                                style={{
                                    marginTop: "10px",
                                    fontWeight: "bold",
                                    color: "#d97706"
                                }}
                            >
                                {processProgress}
                            </div>
                        )}

                        {saveProgress && (
                            <div
                                style={{
                                    marginTop: "10px",
                                    fontWeight: "bold",
                                    color: "#198754"
                                }}
                            >
                                {saveProgress}
                            </div>
                        )}

                        <pre
                            style={{
                                marginTop: "10px",
                                background: "#eee",
                                padding: "10px",
                                whiteSpace: "pre-wrap",
                                maxHeight: "300px",
                                overflow: "auto"
                            }}
                        >
                            {ocrResult}
                        </pre>

                        {processSummary && (
                            <div
                                style={{
                                    marginTop: "15px",
                                    padding: "15px",
                                    background: "#f5f5f5",
                                    border: "1px solid #ccc",
                                    borderRadius: "5px"
                                }}
                            >
                                <h3 style={{ marginTop: 0 }}>
                                    📊 범위 자동처리 결과
                                </h3>

                                <div>
                                    처리 범위:{" "}
                                    {processSummary.startPage} ~{" "}
                                    {processSummary.endPage}페이지
                                </div>

                                <div>
                                    전체 페이지:{" "}
                                    {processSummary.totalPages}개
                                </div>

                                <div>
                                    정상 처리:{" "}
                                    {processSummary.processedPages}개
                                </div>

                                <div>
                                    총 검출:{" "}
                                    {processSummary.totalDetected}개
                                </div>

                                <div>
                                    총 저장:{" "}
                                    {processSummary.totalSaved}개
                                </div>

                                <div>
                                    실패 페이지:{" "}
                                    {processSummary.failedPages.length === 0
                                        ? "없음"
                                        : processSummary.failedPages.join(", ")}
                                </div>
                            </div>
                        )}

                        {(
                            pageAnalyses.length > 0 ||
                            (
                                processSummary?.pageResults &&
                                processSummary.pageResults.length > 0
                            )
                        ) && (
                                <div style={{ marginTop: "15px" }}>

                                    <h4 style={{ marginBottom: "8px" }}>
                                        📋 페이지별 상세 결과
                                    </h4>

                                    <div
                                        style={{
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                            border: "1px solid #ccc",
                                            marginTop: "10px"
                                        }}
                                    >
                                        <table
                                            style={{
                                                width: "100%",
                                                borderCollapse: "collapse",
                                                fontSize: "14px"
                                            }}
                                        >
                                            <thead
                                                style={{
                                                    position: "sticky",
                                                    top: 0,
                                                    background: "#f5f5f5",
                                                    zIndex: 1
                                                }}
                                            >
                                                <tr>
                                                    <th
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px"
                                                        }}
                                                    >
                                                        페이지
                                                    </th>

                                                    <th
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px"
                                                        }}
                                                    >
                                                        검출
                                                    </th>

                                                    <th
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px"
                                                        }}
                                                    >
                                                        저장
                                                    </th>

                                                    <th
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px"
                                                        }}
                                                    >
                                                        상태
                                                    </th>

                                                    <th
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px"
                                                        }}
                                                    >
                                                        관리
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {(
                                                    processSummary?.pageResults?.length > 0
                                                        ? processSummary.pageResults.map(item => {

                                                            const savedAnalysis =
                                                                pageAnalyses.find(
                                                                    analysis =>
                                                                        Number(analysis.page_num) ===
                                                                        Number(item.page)
                                                                );

                                                            return {
                                                                ...item,

                                                                problem_count:
                                                                    savedAnalysis?.problem_count ??
                                                                    item.problemCount,

                                                                problem_boxes:
                                                                    savedAnalysis?.problem_boxes ??
                                                                    [],

                                                                excluded:
                                                                    savedAnalysis?.excluded ??
                                                                    false,

                                                                verified:
                                                                    savedAnalysis?.verified ??
                                                                    false
                                                            };
                                                        })
                                                        : pageAnalyses
                                                ).map(item => {

                                                    const page =
                                                        item.page_num !== undefined
                                                            ? Number(item.page_num)
                                                            : Number(item.page);

                                                    const problemCount =
                                                        item.problem_count !== undefined
                                                            ? item.problem_count
                                                            : (item.problemCount || 0);

                                                    const savedCount =
                                                        problems.filter(
                                                            problem =>
                                                                Number(problem.book_id) ===
                                                                Number(currentBookId) &&
                                                                Number(problem.page_num) ===
                                                                Number(page)
                                                        ).length;

                                                    const success =
                                                        item.success !== undefined
                                                            ? item.success
                                                            : true;

                                                    const isExcluded =
                                                        excludedPages.includes(page) ||
                                                        item.excluded === 1 ||
                                                        item.excluded === true;

                                                    return (
                                                        <tr
                                                            key={page}
                                                            onClick={async () => {

                                                                setCurrentPage(page);

                                                                // 저장된 페이지 분석 결과를
                                                                // 시각적 검증 화면에 복원
                                                                setProblemBoxes(
                                                                    item.problem_boxes || []
                                                                );

                                                                const imageIndex = page - 1;

                                                                if (
                                                                    imageIndex >= 0 &&
                                                                    imageIndex < pdfPages.length
                                                                ) {

                                                                    const pageInfo =
                                                                        pdfPages[imageIndex];

                                                                    const imageData =
                                                                        await window.electronAPI.getImageData(
                                                                            pageInfo.image
                                                                        );

                                                                    if (imageData) {

                                                                        setTestImage(imageData);

                                                                        // 실제 PDF 이미지 크기를 읽어서
                                                                        // 시각적 검증 좌표계로 사용
                                                                        const imageSize =
                                                                            await new Promise(resolve => {

                                                                                const img =
                                                                                    new Image();

                                                                                img.onload = () => {

                                                                                    resolve({
                                                                                        width: img.naturalWidth,
                                                                                        height: img.naturalHeight
                                                                                    });

                                                                                };

                                                                                img.onerror = () => {

                                                                                    resolve({
                                                                                        width: 0,
                                                                                        height: 0
                                                                                    });

                                                                                };

                                                                                img.src = imageData;
                                                                            });

                                                                        setPageMeta({
                                                                            w: imageSize.width,
                                                                            h: imageSize.height
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                cursor: "pointer"
                                                            }}
                                                        >

                                                            <td
                                                                style={{
                                                                    border: "1px solid #ccc",
                                                                    padding: "6px",
                                                                    textAlign: "center"
                                                                }}
                                                            >
                                                                {page}
                                                            </td>

                                                            <td
                                                                style={{
                                                                    border: "1px solid #ccc",
                                                                    padding: "6px",
                                                                    textAlign: "center"
                                                                }}
                                                            >
                                                                {problemCount}
                                                            </td>

                                                            <td
                                                                style={{
                                                                    border: "1px solid #ccc",
                                                                    padding: "6px",
                                                                    textAlign: "center"
                                                                }}
                                                            >
                                                                {savedCount}
                                                            </td>

                                                            <td
                                                                style={{
                                                                    border: "1px solid #ccc",
                                                                    padding: "6px",
                                                                    textAlign: "center"
                                                                }}
                                                            >
                                                                {!success
                                                                    ? "실패"
                                                                    : isExcluded
                                                                        ? "제외"
                                                                        : item.verified === 1 ||
                                                                            item.verified === true
                                                                            ? "검증 완료"
                                                                            : "미검증"}
                                                            </td>

                                                            <td
                                                                style={{
                                                                    border: "1px solid #ccc",
                                                                    padding: "6px",
                                                                    textAlign: "center"
                                                                }}
                                                            >
                                                                <td
                                                                    style={{
                                                                        border: "1px solid #ccc",
                                                                        padding: "6px",
                                                                        textAlign: "center"
                                                                    }}
                                                                >
                                                                    {!isExcluded &&
                                                                        !(
                                                                            item.verified === 1 ||
                                                                            item.verified === true
                                                                        ) && (
                                                                            <>
                                                                                <button
                                                                                    onClick={async e => {
                                                                                        e.stopPropagation();

                                                                                        try {

                                                                                            await window.electronAPI.savePageAnalysis({
                                                                                                book_id: currentBookId,
                                                                                                page_num: page,

                                                                                                problem_count:
                                                                                                    Number(currentPage) === page
                                                                                                        ? problemBoxes.length
                                                                                                        : (
                                                                                                            item.problem_boxes
                                                                                                                ? item.problem_boxes.length
                                                                                                                : problemCount
                                                                                                        ),

                                                                                                problem_boxes:
                                                                                                    Number(currentPage) === page
                                                                                                        ? problemBoxes
                                                                                                        : (item.problem_boxes || []),

                                                                                                excluded: false,
                                                                                                verified: true
                                                                                            });

                                                                                            setPageAnalyses(prev =>
                                                                                                prev.map(analysis =>
                                                                                                    Number(analysis.page_num) === page
                                                                                                        ? {
                                                                                                            ...analysis,

                                                                                                            problem_count:
                                                                                                                Number(currentPage) === page
                                                                                                                    ? problemBoxes.length
                                                                                                                    : analysis.problem_count,

                                                                                                            problem_boxes:
                                                                                                                Number(currentPage) === page
                                                                                                                    ? problemBoxes
                                                                                                                    : analysis.problem_boxes,

                                                                                                            verified: 1,
                                                                                                            excluded: 0
                                                                                                        }
                                                                                                        : analysis
                                                                                                )
                                                                                            );

                                                                                        } catch (error) {

                                                                                            console.error(
                                                                                                "페이지 검증 상태 저장 실패:",
                                                                                                error
                                                                                            );

                                                                                            alert(
                                                                                                `페이지 검증 저장 실패: \n${error.message} `
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        padding: "4px 8px",
                                                                                        cursor: "pointer",
                                                                                        marginRight: "5px"
                                                                                    }}
                                                                                >
                                                                                    확인
                                                                                </button>

                                                                                <button
                                                                                    onClick={async e => {
                                                                                        e.stopPropagation();

                                                                                        try {

                                                                                            await window.electronAPI.savePageAnalysis({
                                                                                                book_id: currentBookId,
                                                                                                page_num: page,
                                                                                                problem_count: problemCount,
                                                                                                problem_boxes:
                                                                                                    item.problem_boxes || [],
                                                                                                excluded: true,
                                                                                                verified: false
                                                                                            });

                                                                                            setExcludedPages(prev =>
                                                                                                prev.includes(page)
                                                                                                    ? prev
                                                                                                    : [...prev, page]
                                                                                            );

                                                                                            setPageAnalyses(prev =>
                                                                                                prev.map(analysis =>
                                                                                                    Number(analysis.page_num) === page
                                                                                                        ? {
                                                                                                            ...analysis,
                                                                                                            excluded: 1,
                                                                                                            verified: 0
                                                                                                        }
                                                                                                        : analysis
                                                                                                )
                                                                                            );

                                                                                        } catch (error) {

                                                                                            console.error(
                                                                                                "페이지 제외 상태 저장 실패:",
                                                                                                error
                                                                                            );

                                                                                            alert(
                                                                                                `페이지 제외 저장 실패: \n${error.message} `
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        padding: "4px 8px",
                                                                                        cursor: "pointer"
                                                                                    }}
                                                                                >
                                                                                    제외
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                    {(
                                                                        item.verified === 1 ||
                                                                        item.verified === true
                                                                    ) && (
                                                                            <button
                                                                                onClick={async e => {
                                                                                    e.stopPropagation();

                                                                                    try {

                                                                                        await window.electronAPI.savePageAnalysis({
                                                                                            book_id: currentBookId,
                                                                                            page_num: page,
                                                                                            problem_count: problemCount,
                                                                                            problem_boxes:
                                                                                                item.problem_boxes || [],
                                                                                            excluded: false,
                                                                                            verified: false
                                                                                        });

                                                                                        setPageAnalyses(prev =>
                                                                                            prev.map(analysis =>
                                                                                                Number(analysis.page_num) === page
                                                                                                    ? {
                                                                                                        ...analysis,
                                                                                                        verified: 0,
                                                                                                        excluded: 0
                                                                                                    }
                                                                                                    : analysis
                                                                                            )
                                                                                        );

                                                                                        setExcludedPages(prev =>
                                                                                            prev.filter(p => p !== page)
                                                                                        );

                                                                                    } catch (error) {

                                                                                        console.error(
                                                                                            "페이지 검증취소 저장 실패:",
                                                                                            error
                                                                                        );

                                                                                        alert(
                                                                                            `검증취소 저장 실패: \n${error.message} `
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    padding: "4px 8px",
                                                                                    cursor: "pointer"
                                                                                }}
                                                                            >
                                                                                검증취소
                                                                            </button>
                                                                        )}

                                                                    {isExcluded && (
                                                                        <button
                                                                            onClick={async e => {
                                                                                e.stopPropagation();

                                                                                try {

                                                                                    await window.electronAPI.savePageAnalysis({
                                                                                        book_id: currentBookId,
                                                                                        page_num: page,
                                                                                        problem_count: problemCount,
                                                                                        problem_boxes:
                                                                                            item.problem_boxes || [],
                                                                                        excluded: false,
                                                                                        verified: false
                                                                                    });

                                                                                    setExcludedPages(prev =>
                                                                                        prev.filter(p => p !== page)
                                                                                    );

                                                                                    setPageAnalyses(prev =>
                                                                                        prev.map(analysis =>
                                                                                            Number(analysis.page_num) === page
                                                                                                ? {
                                                                                                    ...analysis,
                                                                                                    excluded: 0,
                                                                                                    verified: 0
                                                                                                }
                                                                                                : analysis
                                                                                        )
                                                                                    );

                                                                                } catch (error) {

                                                                                    console.error(
                                                                                        "페이지 제외취소 저장 실패:",
                                                                                        error
                                                                                    );

                                                                                    alert(
                                                                                        `페이지 제외취소 저장 실패: \n${error.message} `
                                                                                    );
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                padding: "4px 8px",
                                                                                cursor: "pointer"
                                                                            }}
                                                                        >
                                                                            제외취소
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </td>

                                                        </tr>
                                                    );
                                                })}

                                                <tr
                                                    style={{
                                                        fontWeight: "bold",
                                                        background: "#f5f5f5"
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        합계
                                                    </td>

                                                    <td
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        {(
                                                            pageAnalyses.length > 0
                                                                ? pageAnalyses
                                                                : (processSummary?.pageResults || [])
                                                        ).reduce(
                                                            (sum, item) => {
                                                                const page =
                                                                    item.page_num !== undefined
                                                                        ? Number(item.page_num)
                                                                        : Number(item.page);

                                                                const problemCount =
                                                                    item.problem_count !== undefined
                                                                        ? item.problem_count
                                                                        : (item.problemCount || 0);

                                                                const savedCount =
                                                                    problems.filter(
                                                                        problem =>
                                                                            Number(problem.book_id) ===
                                                                            Number(currentBookId) &&
                                                                            Number(problem.page_num) ===
                                                                            Number(page)
                                                                    ).length;

                                                                return (
                                                                    sum +
                                                                    (
                                                                        item.verified === 1 ||
                                                                            item.verified === true
                                                                            ? savedCount
                                                                            : problemCount
                                                                    )
                                                                );
                                                            },
                                                            0
                                                        )}
                                                    </td>

                                                    <td
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        {(
                                                            pageAnalyses.length > 0
                                                                ? pageAnalyses
                                                                : (processSummary?.pageResults || [])
                                                        ).reduce(
                                                            (sum, item) => {
                                                                const page =
                                                                    item.page_num !== undefined
                                                                        ? Number(item.page_num)
                                                                        : Number(item.page);

                                                                return (
                                                                    sum +
                                                                    problems.filter(
                                                                        problem =>
                                                                            Number(problem.book_id) ===
                                                                            Number(currentBookId) &&
                                                                            Number(problem.page_num) ===
                                                                            Number(page)
                                                                    ).length
                                                                );
                                                            },
                                                            0
                                                        )}
                                                    </td>

                                                    <td
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        -
                                                    </td>

                                                    <td
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        -
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        <div
                            style={{
                                marginTop: "20px",
                                padding: "15px",
                                background: "#fff",
                                border: "2px solid #444",
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >
                            <h3>📄 PDF 페이지 확인</h3>

                            {splitNumber !== null && (
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        background: '#fff',
                                        border: '2px solid #333',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                                        새 문항 번호를 입력하세요.
                                    </div>

                                    <input
                                        type="text"
                                        value={splitNumber}
                                        onChange={e => {
                                            e.stopPropagation();
                                            setSplitNumber(e.target.value);
                                        }}
                                        onPointerDown={e => {
                                            e.stopPropagation();
                                        }}
                                        onMouseDown={e => {
                                            e.stopPropagation();
                                        }}
                                        onClick={e => {
                                            e.stopPropagation();
                                            e.target.focus();
                                        }}
                                        autoFocus
                                        style={{
                                            width: '100px',
                                            padding: '8px',
                                            fontSize: '18px',
                                            textAlign: 'center',
                                            pointerEvents: 'auto',
                                            userSelect: 'text'
                                        }}
                                    />

                                    <div style={{ marginTop: '15px' }}>
                                        <button
                                            onClick={() =>
                                                setSplitNumber(null)
                                            }
                                            style={{ marginRight: '8px' }}
                                        >
                                            취소
                                        </button>

                                        <button
                                            onClick={() => {
                                                const number = splitNumber.trim();

                                                if (!number) {
                                                    alert("문항 번호를 입력하세요.");
                                                    return;
                                                }

                                                const resize = resizeRef.current;

                                                if (
                                                    resize &&
                                                    resize.splitY !== undefined &&
                                                    resize.firstHeight >= 20 &&
                                                    resize.secondHeight >= 20
                                                ) {
                                                    const box = problemBoxes[resize.index];

                                                    setProblemBoxes(prev => {
                                                        const next = [...prev];

                                                        next.splice(
                                                            resize.index,
                                                            1,
                                                            {
                                                                ...box,
                                                                height: resize.firstHeight
                                                            },
                                                            {
                                                                ...box,
                                                                number,
                                                                y: resize.splitY,
                                                                height: resize.secondHeight
                                                            }
                                                        );

                                                        return next;
                                                    });
                                                }

                                                setSplitNumber(null);
                                                resizeRef.current = null;
                                            }}
                                        >
                                            확인
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editNumber !== null && (
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        background: '#fff',
                                        border: '2px solid #333',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                                        문항 번호를 입력하세요.
                                    </div>

                                    <input
                                        type="text"
                                        value={editNumber.number}
                                        ref={el => {
                                            if (
                                                el &&
                                                document.activeElement !== el
                                            ) {
                                                el.focus();
                                            }
                                        }}
                                        onChange={e => {
                                            setEditNumber(prev => ({
                                                ...prev,
                                                number: e.target.value
                                            }));
                                        }}
                                        onPointerDown={e => {
                                            e.stopPropagation();
                                        }}
                                        onMouseDown={e => {
                                            e.stopPropagation();
                                        }}
                                        onClick={e => {
                                            e.stopPropagation();
                                            e.target.focus();
                                        }}
                                        onKeyDown={e => {
                                            e.stopPropagation();

                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                            }
                                        }}
                                        autoFocus
                                        style={{
                                            width: '100px',
                                            padding: '8px',
                                            fontSize: '18px',
                                            textAlign: 'center',
                                            pointerEvents: 'auto',
                                            userSelect: 'text'
                                        }}
                                    />

                                    <div style={{ marginTop: '15px' }}>
                                        <button
                                            onClick={() => {
                                                const number = editNumber.number.trim();

                                                if (!number) {
                                                    alert("문항 번호를 입력하세요.");
                                                    return;
                                                }

                                                const editIndex = editNumber.index;

                                                setProblemBoxes(prev =>
                                                    prev.map((item, i) =>
                                                        i === editIndex
                                                            ? {
                                                                ...item,
                                                                number
                                                            }
                                                            : item
                                                    )
                                                );

                                                setEditNumber(null);
                                            }}
                                        >
                                            확인
                                        </button>
                                    </div>
                                </div>
                            )}

                            {testImage && (
                                <div
                                    style={{
                                        marginBottom: "20px",
                                        order: 2
                                    }}
                                >

                                    <h4>페이지 {currentPage}</h4>

                                    <img
                                        src={testImage}
                                        alt={`page - ${currentPage} `}
                                        style={{
                                            width: "500px",
                                            border: "1px solid #ccc"
                                        }}
                                    />

                                </div>
                            )}
                            {problemBoxes.length > 0 && pageMeta.w > 0 && (
                                <div
                                    style={{
                                        marginTop: '20px',
                                        padding: '15px',
                                        background: '#fff',
                                        border: '2px dashed #666',
                                        order: 1
                                    }}
                                >
                                    <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>🔍 자동 분리 알고리즘 시각적 검증</h3>

                                    <div
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                            maxWidth: '700px',
                                            margin: '0 auto'
                                        }}
                                    >

                                        <img
                                            src={testImage}
                                            alt="test"
                                            draggable={false}
                                            onDragStart={e => e.preventDefault()}
                                            onPointerDown={handleManualBoxPointerDown}
                                            onPointerMove={handleManualBoxPointerMove}
                                            onPointerUp={handleManualBoxPointerUp}
                                            style={{
                                                width: "100%",
                                                display: "block",
                                                userSelect: "none",
                                                cursor: manualBoxMode ? 'crosshair' : 'default',
                                                touchAction: 'none'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', left: '50%', top: 0, bottom: 0,
                                            width: '2px', backgroundColor: '#dc3545', opacity: 0.5
                                        }} />

                                        {problemBoxes.map((box, index) => (
                                            <div
                                                key={`${box.number}-${index}`}


                                                onDoubleClick={() => {
                                                    setProblemBoxes(prev =>
                                                        prev.filter(item => item !== box)
                                                    );

                                                    setDeletedProblemBoxes(prev => [
                                                        ...prev,
                                                        box
                                                    ]);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${(box.x / pageMeta.w) * 100}% `,
                                                    top: `${(box.y / pageMeta.h) * 100}% `,
                                                    width: `${(box.width / pageMeta.w) * 100}% `,
                                                    height: `${(box.height / pageMeta.h) * 100}% `,
                                                    border: '2px solid #0d6efd',
                                                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                                                    boxSizing: 'border-box',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    padding: '10px',
                                                    pointerEvents: 'auto'
                                                }}
                                            >
                                                <span
                                                    onDoubleClick={e => {
                                                        e.stopPropagation();

                                                        setEditNumber({
                                                            index,
                                                            number: box.number
                                                        });
                                                    }}
                                                    style={{
                                                        background: '#0d6efd',
                                                        color: '#fff',
                                                        padding: '5px 10px',
                                                        borderRadius: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '1.2rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {box.number}번 영역
                                                </span>

                                                <div
                                                    onPointerDown={e => {
                                                        e.stopPropagation();
                                                        e.currentTarget.setPointerCapture(e.pointerId);

                                                        const containerRect =
                                                            e.currentTarget.parentElement.parentElement.getBoundingClientRect();

                                                        resizeRef.current = {
                                                            moveMode: true,
                                                            index,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startBoxX: box.x,
                                                            startBoxY: box.y,
                                                            scaleX: pageMeta.w / containerRect.width,
                                                            scaleY: pageMeta.h / containerRect.height
                                                        };
                                                    }}
                                                    onPointerMove={e => {
                                                        if (
                                                            !resizeRef.current ||
                                                            !resizeRef.current.moveMode
                                                        ) {
                                                            return;
                                                        }

                                                        const {
                                                            index,
                                                            startX,
                                                            startY,
                                                            startBoxX,
                                                            startBoxY,
                                                            scaleX,
                                                            scaleY
                                                        } = resizeRef.current;

                                                        const deltaX = e.clientX - startX;
                                                        const deltaY = e.clientY - startY;

                                                        setProblemBoxes(prev =>
                                                            prev.map((item, i) =>
                                                                i === index
                                                                    ? {
                                                                        ...item,
                                                                        x: startBoxX + deltaX * scaleX,
                                                                        y: startBoxY + deltaY * scaleY
                                                                    }
                                                                    : item
                                                            )
                                                        );
                                                    }}
                                                    onPointerUp={e => {
                                                        e.stopPropagation();

                                                        if (
                                                            resizeRef.current &&
                                                            resizeRef.current.moveMode
                                                        ) {
                                                            resizeRef.current = null;
                                                        }

                                                        e.currentTarget.releasePointerCapture(e.pointerId);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '5px',
                                                        top: '5px',
                                                        width: '25px',
                                                        height: '25px',
                                                        background: '#333',
                                                        cursor: 'move',
                                                        borderRadius: '4px',
                                                        zIndex: 10
                                                    }}
                                                />

                                                {/* 하단 경계 조정 손잡이 */}
                                                <div
                                                    onPointerDown={e => {
                                                        if (manualBoxMode) return;

                                                        e.stopPropagation();
                                                        e.currentTarget.setPointerCapture(e.pointerId);

                                                        const containerRect =
                                                            e.currentTarget.parentElement.parentElement.getBoundingClientRect();

                                                        resizeRef.current = {
                                                            index,
                                                            startY: e.clientY,
                                                            startHeight: box.height,
                                                            scaleY: pageMeta.h / containerRect.height,
                                                            splitMode: e.shiftKey
                                                        };
                                                    }}

                                                    onPointerMove={e => {
                                                        if (!resizeRef.current) return;

                                                        if (resizeRef.current.splitMode) {
                                                            return;
                                                        }

                                                        const {
                                                            index,
                                                            startY,
                                                            startHeight,
                                                            scaleY
                                                        } = resizeRef.current;

                                                        const deltaY = e.clientY - startY;

                                                        const newHeight = Math.max(
                                                            20,
                                                            startHeight + deltaY * scaleY
                                                        );

                                                        setProblemBoxes(prev =>
                                                            prev.map((item, i) =>
                                                                i === index
                                                                    ? { ...item, height: newHeight }
                                                                    : item
                                                            )
                                                        );
                                                    }}

                                                    onPointerUp={e => {
                                                        e.stopPropagation();

                                                        if (
                                                            resizeRef.current &&
                                                            resizeRef.current.splitMode
                                                        ) {
                                                            const {
                                                                index,
                                                                startY,
                                                                startHeight,
                                                                scaleY
                                                            } = resizeRef.current;

                                                            const box = problemBoxes[index];

                                                            console.log(
                                                                "분할 실행:",
                                                                index,
                                                                box,
                                                                "splitMode:",
                                                                resizeRef.current.splitMode
                                                            );

                                                            const deltaY = e.clientY - startY;

                                                            const originalBottom =
                                                                box.y + startHeight;

                                                            const splitY =
                                                                originalBottom + deltaY * scaleY;

                                                            const firstHeight =
                                                                splitY - box.y;

                                                            const secondHeight =
                                                                startHeight - firstHeight;

                                                            console.log(
                                                                "분할 계산값:",
                                                                "box.y =", box.y,
                                                                "box.height =", box.height,
                                                                "splitY =", splitY,
                                                                "firstHeight =", firstHeight,
                                                                "secondHeight =", secondHeight
                                                            );

                                                            if (
                                                                firstHeight >= 20 &&
                                                                secondHeight >= 20
                                                            ) {
                                                                resizeRef.current.splitY = splitY;
                                                                resizeRef.current.firstHeight = firstHeight;
                                                                resizeRef.current.secondHeight = secondHeight;

                                                                setSplitNumber("");
                                                            }
                                                        }

                                                        e.currentTarget.releasePointerCapture(e.pointerId);

                                                        if (
                                                            !resizeRef.current ||
                                                            !resizeRef.current.splitMode
                                                        ) {
                                                            resizeRef.current = null;
                                                        }
                                                    }}

                                                    onPointerCancel={e => {
                                                        e.stopPropagation();
                                                        resizeRef.current = null;
                                                    }}

                                                    onLostPointerCapture={() => {
                                                        if (
                                                            resizeRef.current &&
                                                            !resizeRef.current.splitMode
                                                        ) {
                                                            resizeRef.current = null;
                                                        }
                                                    }}

                                                    onDoubleClick={e => {
                                                        e.stopPropagation();
                                                    }}

                                                    style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        bottom: '-4px',
                                                        width: '100%',
                                                        height: '8px',
                                                        cursor: 'ns-resize',
                                                        zIndex: 10
                                                    }}
                                                />

                                            </div>
                                        ))}

                                        {manualBoxPreview && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: `${(manualBoxPreview.x / pageMeta.w) * 100}%`,
                                                    top: `${(manualBoxPreview.y / pageMeta.h) * 100}%`,
                                                    width: `${(manualBoxPreview.width / pageMeta.w) * 100}%`,
                                                    height: `${(manualBoxPreview.height / pageMeta.h) * 100}%`,
                                                    border: '2px dashed #198754',
                                                    backgroundColor: 'rgba(25, 135, 84, 0.08)',
                                                    pointerEvents: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        )}

                                        {manualBoxPending && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '20px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    background: 'white',
                                                    border: '2px solid #333',
                                                    padding: '15px',
                                                    zIndex: 1000
                                                }}
                                            >
                                                <div style={{ marginBottom: '8px' }}>
                                                    문항번호를 입력하세요.
                                                </div>

                                                <input
                                                    type="text"
                                                    value={manualBoxNumber}
                                                    onChange={e => setManualBoxNumber(e.target.value)}
                                                    onKeyDown={e => {

                                                        if (e.key !== "Enter") {
                                                            return;
                                                        }

                                                        const number =
                                                            manualBoxNumber.trim();

                                                        if (!number) {
                                                            return;
                                                        }

                                                        setProblemBoxes(prev => [
                                                            ...prev,
                                                            {
                                                                number:
                                                                    String(number).padStart(2, "0"),
                                                                x:
                                                                    manualBoxStart.x *
                                                                    manualBoxStart.scaleX,
                                                                y:
                                                                    manualBoxStart.y *
                                                                    manualBoxStart.scaleY,
                                                                width:
                                                                    manualBoxStart.width *
                                                                    manualBoxStart.scaleX,
                                                                height:
                                                                    manualBoxStart.height *
                                                                    manualBoxStart.scaleY,
                                                                source: "manual"
                                                            }
                                                        ]);

                                                        setManualBoxPending(false);
                                                        setManualBoxNumber("");
                                                        setManualBoxStart(null);
                                                    }}
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                            {/* ▼ 새로 추가할 자동 일괄 저장 버튼 ▼ */}
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>

                                <button
                                    className="action-btn"
                                    onClick={async () => {

                                        const problems =
                                            await window.electronAPI.getProblems();

                                        const currentBookProblems =
                                            problems.filter(
                                                problem =>
                                                    Number(problem.book_id) ===
                                                    Number(currentBookId)
                                            );

                                        const problemsWithImages = [];

                                        for (const problem of currentBookProblems) {
                                            const imageData =
                                                await window.electronAPI.getLocalImage(
                                                    problem.image_path
                                                );

                                            problemsWithImages.push({
                                                ...problem,
                                                imageData
                                            });
                                        }

                                        setSavedProblemImages(problemsWithImages);

                                        const currentBook =
                                            books.find(
                                                book =>
                                                    Number(book.id) ===
                                                    Number(currentBookId)
                                            );

                                        const pageProblems = {};

                                        for (const problem of currentBookProblems) {

                                            const page = Number(problem.page_num);

                                            if (!pageProblems[page]) {
                                                pageProblems[page] = [];
                                            }

                                            pageProblems[page].push(
                                                String(problem.question_num)
                                            );
                                        }

                                        const pageSummary =
                                            Object.entries(pageProblems)
                                                .sort(
                                                    (a, b) =>
                                                        Number(a[0]) - Number(b[0])
                                                )
                                                .map(([page, numbers]) => {

                                                    const sortedNumbers =
                                                        numbers.sort((a, b) => {

                                                            const na =
                                                                parseInt(a.replace(/\D/g, ""), 10);

                                                            const nb =
                                                                parseInt(b.replace(/\D/g, ""), 10);

                                                            return (
                                                                (Number.isNaN(na) ? 9999 : na) -
                                                                (Number.isNaN(nb) ? 9999 : nb)
                                                            );
                                                        });

                                                    return (
                                                        `${page} 페이지: ` +
                                                        `${sortedNumbers.join(", ")} `
                                                    );
                                                })
                                                .join("\n");

                                        console.log(
                                            "===== 현재 교재 저장 문제 확인 ====="
                                        );

                                        console.log(
                                            "currentBookId =",
                                            currentBookId
                                        );

                                        console.log(
                                            "currentBook =",
                                            currentBook
                                        );

                                        console.log(
                                            "현재 교재 전체 문제 수 =",
                                            currentBookProblems.length
                                        );

                                        console.log(
                                            "===== 현재 교재 페이지별 저장 문제번호 ====="
                                        );

                                        console.table(
                                            Object.entries(pageProblems)
                                                .sort(
                                                    (a, b) =>
                                                        Number(a[0]) - Number(b[0])
                                                )
                                                .map(([page, numbers]) => ({
                                                    page,
                                                    count: numbers.length,
                                                    question_nums:
                                                        numbers.join(", ")
                                                }))
                                        );

                                        alert(
                                            `${currentBook?.title || "현재 교재"} \n\n` +
                                            `전체 저장 문제: ${currentBookProblems.length} 개\n\n` +
                                            pageSummary
                                        );
                                    }}
                                    style={{
                                        marginLeft: '10px',
                                        backgroundColor: '#007bff',
                                        padding: '15px 30px',
                                        fontSize: '16px',
                                        color: 'white'
                                    }}
                                >

                                    📋 저장 확인
                                </button>

                                {savedProblemImages.length > 0 && (
                                    <div
                                        style={{
                                            marginTop: '20px',
                                            padding: '15px',
                                            border: '1px solid #ccc',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <h3>저장된 문제 이미지 확인</h3>

                                        {savedProblemImages.map((problem) => (
                                            <div
                                                key={problem.id}
                                                style={{
                                                    marginBottom: '25px',
                                                    paddingBottom: '20px',
                                                    borderBottom: '1px solid #ddd'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        marginBottom: '10px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {problem.page_num}페이지 / {problem.question_num}번
                                                </div>

                                                <img
                                                    src={problem.imageData}
                                                    alt={`문제 ${problem.question_num}`}
                                                    style={{
                                                        maxWidth: '600px',
                                                        width: '100%',
                                                        border: '1px solid #ccc'
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    className="action-btn"
                                    onClick={async () => {
                                        if (!currentBookId) {
                                            alert("현재 교재가 없습니다.");
                                            return;
                                        }

                                        const confirmed = window.confirm(
                                            "현재 교재의 Problems와 Tests를 모두 삭제합니다.\n\n계속하시겠습니까?"
                                        );

                                        if (!confirmed) {
                                            return;
                                        }

                                        try {

                                            const result =
                                                await window.electronAPI.clearBookData(
                                                    currentBookId
                                                );

                                            if (result.success) {

                                                const updatedProblems =
                                                    await window.electronAPI.getProblems();

                                                setProblems(updatedProblems);

                                                const updatedTests =
                                                    await window.electronAPI.getTests();

                                                setTests(updatedTests);

                                                alert("현재 교재의 Problems와 Tests를 초기화했습니다.");

                                            } else {

                                                alert(
                                                    `초기화 실패: \n${result.message || "알 수 없는 오류"} `
                                                );
                                            }

                                        } catch (error) {

                                            console.error(
                                                "현재 교재 데이터 초기화 실패:",
                                                error
                                            );

                                            alert(
                                                `초기화 실패: \n${error.message} `
                                            );
                                        }
                                    }}
                                    style={{
                                        marginLeft: "10px",
                                        backgroundColor: "#dc3545",
                                        padding: "15px 30px",
                                        fontSize: "16px",
                                        color: "white"
                                    }}
                                >
                                    🗑 현재 교재 데이터 초기화
                                </button>
                            </div>

                            <hr className="divider" />
                            <h3>등록된 교재</h3>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {books.map(b => (
                                    <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                                        <span
                                            onClick={() => {
                                                setCurrentBookId(b.id);
                                                setCurrentPage(1);

                                                // 이전 교재의 시각적 검증 화면 제거
                                                setTestImage(null);
                                                setProblemBoxes([]);
                                                setPageMeta({
                                                    w: 0,
                                                    h: 0
                                                });
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                fontWeight: currentBookId === b.id ? 'bold' : 'normal'
                                            }}
                                        >
                                            {b.title}
                                        </span>

                                        <button
                                            onClick={() => handleDeleteBook(b.id, b.title)}
                                        >
                                            삭제
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )
                }

                {
                    activeMenu === '학생관리' && (
                        <div className="management-section">
                            <h2>학생관리</h2>
                            <hr className="divider" />
                            <div className="input-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                    placeholder="이름"
                                    value={newStudent.name}
                                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                    style={{ padding: '10px', width: '150px', fontSize: '15px' }}
                                />
                                <input
                                    placeholder="반"
                                    value={newStudent.class_name}
                                    onChange={e => setNewStudent({ ...newStudent, class_name: e.target.value })}
                                    style={{ padding: '10px', width: '150px', fontSize: '15px' }}
                                />
                                <button className="action-btn" onClick={handleAddStudent} style={{ padding: '10px 20px', fontSize: '15px', cursor: 'pointer' }}>
                                    등록
                                </button>
                            </div>
                            <hr className="divider" />
                            <h3>등록된 학생</h3>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {students.map(s => (
                                    <li
                                        key={s.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px',
                                            padding: '10px',
                                            border: '1px solid #ddd',
                                            borderRadius: '5px'
                                        }}
                                    >
                                        <span>
                                            {s.name} ({s.class_name})
                                        </span>

                                        <button
                                            onClick={() => handleDeleteStudent(s.id, s.name)}
                                            style={{
                                                padding: '5px 10px',
                                                background: '#ff4d4d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            삭제
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                }

                {
                    activeMenu === '테스트관리' && (
                        <div className="management-section">
                            <h2>📝 테스트(오답) 관리</h2>
                            <hr className="divider" />
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    alignItems: 'center'
                                }}
                            >
                                {/* 1행: 학생 / 교재 / 페이지 */}
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <select
                                        value={newTest.student_id}
                                        onChange={e =>
                                            setNewTest({
                                                ...newTest,
                                                student_id: e.target.value
                                            })
                                        }
                                        style={{
                                            padding: '10px',
                                            width: '130px',
                                            fontSize: '15px'
                                        }}
                                    >
                                        <option value="">학생 선택</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={newTest.book_id}
                                        onChange={e =>
                                            setNewTest({
                                                ...newTest,
                                                book_id: e.target.value
                                            })
                                        }
                                        style={{
                                            padding: '10px',
                                            width: '250px',
                                            fontSize: '15px'
                                        }}
                                    >
                                        <option value="">교재 선택</option>
                                        {books.map(b => (
                                            <option key={b.id} value={b.id}>
                                                [{b.id}] {b.title}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="페이지"
                                        value={newTest.page_num}
                                        onChange={e =>
                                            setNewTest({
                                                ...newTest,
                                                page_num: e.target.value
                                            })
                                        }
                                        style={{
                                            padding: '10px',
                                            width: '90px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                {/* 3행: 문제 선택 */}
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '12px',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 'bold',
                                            marginRight: '5px'
                                        }}
                                    >
                                        문제 선택
                                    </span>

                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'center',
                                            padding: '10px 15px',
                                            border: '1px solid #ccc',
                                            borderRadius: '5px',
                                            minWidth: '220px',
                                            minHeight: '20px'
                                        }}
                                    >
                                        {problems
                                            .filter(
                                                p =>
                                                    String(p.book_id) === String(newTest.book_id) &&
                                                    String(p.page_num) === String(newTest.page_num)
                                            )
                                            .sort((a, b) =>
                                                String(a.question_num).localeCompare(
                                                    String(b.question_num),
                                                    undefined,
                                                    { numeric: true }
                                                )
                                            )
                                            .map(problem => (
                                                <div
                                                    key={problem.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedQuestionNums.includes(
                                                                problem.question_num
                                                            )}
                                                            disabled={!problemAnswers[problem.question_num]}
                                                            onChange={() =>
                                                                handleSelectQuestion(problem.question_num)
                                                            }
                                                        />
                                                        {problem.question_num}
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenAnswerQuestion(problem.question_num)
                                                        }
                                                        style={{
                                                            padding: '4px 10px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            backgroundColor: problemAnswers[problem.question_num]
                                                                ? '#28a745'
                                                                : '#f0f0f0',
                                                            color: problemAnswers[problem.question_num]
                                                                ? 'white'
                                                                : 'black',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '4px'
                                                        }}
                                                    >
                                                        {problemAnswers[problem.question_num]
                                                            ? `정답: ${problemAnswers[problem.question_num]}`
                                                            : '정답'}
                                                    </button>
                                                </div>

                                            ))}
                                    </div>

                                    {openAnswerQuestion !== null && (
                                        <div
                                            style={{
                                                position: 'fixed',
                                                top: '65%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                backgroundColor: 'white',
                                                border: '1px solid #ccc',
                                                borderRadius: '8px',
                                                padding: '15px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                zIndex: 1000
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 'bold',
                                                    marginBottom: '10px',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                {openAnswerQuestion}번 정답
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '5px',
                                                    justifyContent: 'center',
                                                    marginBottom: '10px'
                                                }}
                                            >
                                                {[1, 2, 3, 4, 5].map(num => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={async () => {
                                                            const newAnswer = String(num);

                                                            const sameProblems = tests.filter(
                                                                t =>
                                                                    Number(t.book_id) === Number(newTest.book_id) &&
                                                                    String(t.page_num) === String(newTest.page_num) &&
                                                                    String(t.question_num) === String(openAnswerQuestion)
                                                            );

                                                            for (const sameProblem of sameProblems) {
                                                                await window.electronAPI.updateTestAnswer({
                                                                    id: sameProblem.id,
                                                                    answer: newAnswer
                                                                });
                                                            }

                                                            setTests(prev =>
                                                                prev.map(item =>
                                                                    sameProblems.some(problem => problem.id === item.id)
                                                                        ? {
                                                                            ...item,
                                                                            answer: newAnswer
                                                                        }
                                                                        : item
                                                                )
                                                            );

                                                            setProblemAnswers(prev => ({
                                                                ...prev,
                                                                [openAnswerQuestion]: newAnswer
                                                            }));

                                                            setOpenAnswerQuestion(null);
                                                        }}
                                                        style={{
                                                            padding: '7px 10px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '4px',
                                                    justifyContent: 'center',
                                                    marginBottom: '8px',
                                                    maxWidth: '320px'
                                                }}
                                            >
                                                {[
                                                    '＋',
                                                    '−',
                                                    '×',
                                                    '÷',
                                                    '±',
                                                    '＝',
                                                    '≠',
                                                    '≤',
                                                    '≥',
                                                    '√',
                                                    '∞',
                                                    'π',
                                                    'θ',
                                                    '°',
                                                    'α',
                                                    'β',
                                                    'γ',
                                                    '²',
                                                    '³',
                                                    'ⁿ'
                                                ].map(symbol => (
                                                    <button
                                                        key={symbol}
                                                        type="button"
                                                        onClick={() => {
                                                            setProblemAnswers(prev => ({
                                                                ...prev,
                                                                [openAnswerQuestion]:
                                                                    (prev[openAnswerQuestion] || '') + symbol
                                                            }));
                                                        }}
                                                        style={{
                                                            padding: '5px 8px',
                                                            cursor: 'pointer',
                                                            minWidth: '32px'
                                                        }}
                                                    >
                                                        {symbol}
                                                    </button>
                                                ))}
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '4px',
                                                    justifyContent: 'center',
                                                    marginBottom: '8px',
                                                    maxWidth: '320px'
                                                }}
                                            >
                                                {[
                                                    'sin(',
                                                    'cos(',
                                                    'tan(',
                                                    'log(',
                                                    'ln(',
                                                    'log₂(',
                                                    'log₃(',
                                                    'eˣ',
                                                    ')'
                                                ].map(func => (
                                                    <button
                                                        key={func}
                                                        type="button"
                                                        onClick={() => {
                                                            setProblemAnswers(prev => ({
                                                                ...prev,
                                                                [openAnswerQuestion]:
                                                                    (prev[openAnswerQuestion] || '') + func
                                                            }));
                                                        }}
                                                        style={{
                                                            padding: '5px 8px',
                                                            cursor: 'pointer',
                                                            minWidth: '48px'
                                                        }}
                                                    >
                                                        {func}
                                                    </button>
                                                ))}
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="직접입력"
                                                value={problemAnswers[openAnswerQuestion] || ''}
                                                onChange={e => {
                                                    setProblemAnswers({
                                                        ...problemAnswers,
                                                        [openAnswerQuestion]: e.target.value
                                                    });
                                                }}
                                                style={{
                                                    width: '100px',
                                                    padding: '6px',
                                                    pointerEvents: 'auto',
                                                    userSelect: 'text'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setOpenAnswerQuestion(null)}
                                                style={{
                                                    marginLeft: '5px',
                                                    padding: '6px 10px'
                                                }}
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        className="action-btn"
                                        onClick={handleAddSelectedTests}
                                        style={{
                                            padding: '10px 20px',
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            backgroundColor: '#28a745',
                                            color: 'white'
                                        }}
                                    >
                                        선택 문제 일괄 등록
                                    </button>
                                </div>

                            </div>
                            <hr className="divider" />
                            <h3>오답 기록 목록</h3>
                            <ul>
                                {Object.values(
                                    tests.reduce((groups, t) => {
                                        const key = t.student_id;

                                        if (!groups[key]) {
                                            groups[key] = {
                                                student_id: t.student_id,
                                                student_name: t.student_name,
                                                records: []
                                            };
                                        }

                                        groups[key].records.push(t);

                                        return groups;
                                    }, {})
                                ).map(group => (
                                    <li
                                        key={group.student_id}
                                        style={{ marginBottom: '8px' }}
                                    >
                                        <details>
                                            <summary
                                                style={{
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {group.student_name}
                                            </summary>

                                            <ul style={{ marginTop: '8px' }}>
                                                {group.records.map(t => (
                                                    <li key={t.id} style={{ marginBottom: '5px' }}>
                                                        {t.book_title} | {t.page_num}p | {t.question_num}번
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    </li>
                                ))}
                            </ul>
                            <button
                                className="action-btn"
                                onClick={handleWrongProblemsTest}
                                style={{
                                    marginTop: '15px',
                                    padding: '12px 24px',
                                    fontSize: '15px',
                                    cursor: 'pointer'
                                }}
                            >
                                📚 현재 오답 문제 보기
                            </button>

                            {wrongProblems.length > 0 && (
                                <div
                                    style={{
                                        marginTop: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px'
                                    }}
                                >
                                    {wrongProblems.map((problem) => (
                                        <div
                                            key={problem.test_id}
                                            style={{
                                                padding: '15px',
                                                border: '1px solid #ddd',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                                                {problem.book_id}번 교재 / {problem.page_num}페이지 / {problem.question_num}번
                                            </div>

                                            <img
                                                src={problem.imageData}
                                                alt={`문제 ${problem.question_num} `}
                                                style={{
                                                    maxWidth: '600px',
                                                    width: '100%',
                                                    border: '1px solid #ccc'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    activeMenu === '오답관리' && (
                        <div className="management-section">
                            <h2>❌ 오답관리</h2>
                            <hr className="divider" />

                            <h3>학생별 오답 현황</h3>

                            <div style={{ marginTop: '20px' }}>
                                {Object.values(
                                    tests.reduce((groups, t) => {
                                        const key = t.student_id;

                                        if (!groups[key]) {
                                            groups[key] = {
                                                student_id: t.student_id,
                                                student_name: t.student_name,
                                                tests: []
                                            };
                                        }

                                        groups[key].tests.push(t);

                                        return groups;
                                    }, {})
                                ).map(group => (
                                    <details
                                        key={group.student_id}
                                        open={
                                            Number(selectedExamStudentId) ===
                                            Number(group.student_id)
                                        }
                                        onToggle={e => {
                                            if (e.currentTarget.open) {
                                                setSelectedExamStudentId(group.student_id);
                                                setSelectedExamProblems([]);
                                            } else if (
                                                Number(selectedExamStudentId) ===
                                                Number(group.student_id)
                                            ) {
                                                setSelectedExamStudentId(null);
                                                setSelectedExamProblems([]);
                                            }
                                        }}
                                        style={{
                                            marginBottom: '10px',
                                            border: '1px solid #ccc',
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <summary
                                            style={{
                                                padding: '12px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {group.student_name}
                                        </summary>

                                        <table
                                            style={{
                                                width: '100%',
                                                borderCollapse: 'collapse'
                                            }}
                                        >
                                            <thead>
                                                <tr>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>교재</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>페이지</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>문제번호</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>테스트횟수</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>정답횟수</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>오답률</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>정답</th>
                                                    <th style={{ border: '1px solid #ccc', padding: '10px' }}>상태</th>
                                                    <th
                                                        style={{
                                                            border: '1px solid #ccc',
                                                            padding: '10px',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                group.tests.length > 0 &&
                                                                group.tests.every(
                                                                    t => selectedExamProblems.includes(t.id)
                                                                )
                                                            }
                                                            onChange={() =>
                                                                handleSelectAllExamProblems(
                                                                    group.student_id
                                                                )
                                                            }
                                                        />
                                                        {' '}시험지
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {group.tests.map(t => (
                                                    <tr key={t.id}>
                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            {t.book_title}
                                                        </td>

                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            {t.page_num}p
                                                        </td>

                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            {t.question_num}번
                                                        </td>

                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            {(t.wrong_count || 0) + (t.correct_count || 0)}회
                                                        </td>

                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            {t.correct_count || 0}회
                                                        </td>

                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            {(() => {
                                                                const total =
                                                                    (t.wrong_count || 0) +
                                                                    (t.correct_count || 0);

                                                                const wrong = t.wrong_count || 0;

                                                                return total === 0
                                                                    ? '0%'
                                                                    : `${Math.round((wrong / total) * 100)}%`;
                                                            })()}
                                                        </td>

                                                        <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                                                            <input
                                                                type="text"
                                                                value={t.answer || ''}
                                                                onChange={e => {
                                                                    setTests(prev =>
                                                                        prev.map(item =>
                                                                            item.id === t.id
                                                                                ? {
                                                                                    ...item,
                                                                                    answer: e.target.value
                                                                                }
                                                                                : item
                                                                        )
                                                                    );
                                                                }}

                                                                onBlur={async e => {
                                                                    await window.electronAPI.updateTestAnswer({
                                                                        id: t.id,
                                                                        answer: e.target.value
                                                                    });
                                                                }}
                                                                style={{
                                                                    width: '60px',
                                                                    padding: '5px',
                                                                    textAlign: 'center'
                                                                }}
                                                            />
                                                        </td>

                                                        <td
                                                            style={{
                                                                border: '1px solid #ccc',
                                                                padding: '10px',
                                                                textAlign: 'center'
                                                            }}
                                                        >
                                                            <label style={{ cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={wrongResultIds.includes(t.id)}
                                                                    onChange={() => {
                                                                        setWrongResultIds(prev =>
                                                                            prev.includes(t.id)
                                                                                ? prev.filter(id => id !== t.id)
                                                                                : [...prev, t.id]
                                                                        );
                                                                    }}
                                                                />
                                                                {' '}틀림
                                                            </label>
                                                        </td>

                                                        <td
                                                            style={{
                                                                border: '1px solid #ccc',
                                                                padding: '10px',
                                                                textAlign: 'center'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedExamProblems.includes(t.id)}
                                                                onChange={() => handleSelectExamProblem(t.id)}
                                                            />

                                                            {(() => {
                                                                const testCount =
                                                                    (t.wrong_count || 0) +
                                                                    (t.correct_count || 0);

                                                                const wrongRate =
                                                                    testCount > 0
                                                                        ? Math.round(
                                                                            ((t.wrong_count || 0) / testCount) * 100
                                                                        )
                                                                        : 0;

                                                                return wrongRate >= 50 ? (
                                                                    <span
                                                                        style={{
                                                                            color: 'red',
                                                                            marginLeft: '5px',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                        title={`오답률 ${wrongRate}%`}
                                                                    >
                                                                        ●
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </details>
                                ))}

                                {tests.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        등록된 오답이 없습니다.
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    marginTop: '15px',
                                    fontWeight: 'bold',
                                    textAlign: 'right'
                                }}
                            >
                                시험지 선택 문제: {selectedExamProblems.length}개

                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={wrongRateThreshold}
                                    onChange={e =>
                                        setWrongRateThreshold(
                                            Math.min(
                                                100,
                                                Math.max(0, Number(e.target.value))
                                            )
                                        )
                                    }
                                    style={{
                                        width: '60px',
                                        marginLeft: '15px',
                                        padding: '5px',
                                        textAlign: 'center'
                                    }}
                                />
                                {' '}% 이상

                                <button
                                    className="action-btn"
                                    onClick={handleSelectWrongRateProblems}
                                    style={{
                                        marginLeft: '10px'
                                    }}
                                >
                                    오답률 기준 선택
                                </button>

                                <button
                                    className="action-btn"
                                    disabled={selectedExamProblems.length === 0}
                                    onClick={async () => {
                                        try {

                                            const testSheetId =
                                                `${Date.now()}-${Math.random()
                                                    .toString(36)
                                                    .slice(2, 8)}`;

                                            setTestSheetId(testSheetId);

                                            const selectedTests = tests.filter(t =>
                                                selectedExamProblems.includes(t.id) &&
                                                Number(t.student_id) === Number(selectedExamStudentId)
                                            );

                                            const selectedProblems = selectedTests
                                                .map(test => {
                                                    const problem = problems.find(p =>
                                                        String(p.book_id) === String(test.book_id) &&
                                                        String(p.page_num) === String(test.page_num) &&
                                                        String(p.question_num) === String(test.question_num)
                                                    );

                                                    if (!problem) {
                                                        console.warn(
                                                            "시험지 문제 이미지 찾기 실패:",
                                                            test.book_id,
                                                            test.page_num,
                                                            test.question_num
                                                        );
                                                        return null;
                                                    }

                                                    return {
                                                        ...test,
                                                        image_path: problem.image_path,
                                                        test_sheet_id: testSheetId
                                                    };
                                                })
                                                .filter(Boolean)
                                                .sort((a, b) => {
                                                    const pageCompare =
                                                        Number(a.page_num) - Number(b.page_num);

                                                    if (pageCompare !== 0) {
                                                        return pageCompare;
                                                    }

                                                    return String(a.question_num).localeCompare(
                                                        String(b.question_num),
                                                        undefined,
                                                        { numeric: true }
                                                    );
                                                });

                                            if (selectedProblems.length === 0) {
                                                alert("시험지에 넣을 문제를 선택하세요.");
                                                return;
                                            }

                                            const student = students.find(
                                                s => Number(s.id) === Number(selectedProblems[0].student_id)
                                            );

                                            const studentName = (student?.name || "학생")
                                                .replace(/[\\/:*?"<>|]/g, "_")
                                                .trim();

                                            const now = new Date();

                                            const dateText =
                                                `${now.getFullYear()} -` +
                                                `${String(now.getMonth() + 1).padStart(2, '0')} -` +
                                                `${String(now.getDate()).padStart(2, '0')} `;

                                            const timeText =
                                                `${String(now.getHours()).padStart(2, '0')} ` +
                                                `${String(now.getMinutes()).padStart(2, '0')} ` +
                                                `${String(now.getSeconds()).padStart(2, '0')} `;

                                            const outputPath =
                                                `output/exams/${studentName}/${dateText}/` +
                                                `${studentName}_시험지_${timeText}.pdf`;

                                            const academyName =
                                                await window.electronAPI.getAcademyName();

                                            console.log("시험지 생성용 학원명:", academyName);

                                            const result =
                                                await window.electronAPI.createExamPdf(
                                                    selectedProblems,
                                                    outputPath,
                                                    academyName
                                                );

                                            if (result.success) {

                                                alert(
                                                    `${result.count}개 문제가 시험지 PDF로 생성되었습니다.\n\n${result.outputPath} `
                                                );

                                                await window.electronAPI.assignTestSheet({
                                                    testSheetId,
                                                    testIds: selectedExamProblems
                                                });

                                                setTests(
                                                    await window.electronAPI.getTests()
                                                );

                                                await window.electronAPI.openPdf(
                                                    result.outputPath
                                                );

                                            } else {

                                                alert(
                                                    `시험지 PDF 생성 실패: \n${result.message} `
                                                );

                                            }

                                        } catch (error) {

                                            console.error("시험지 PDF 생성 오류:", error);

                                            alert(
                                                `시험지 PDF 생성 오류: \n${error.message} `
                                            );

                                        }
                                    }}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '10px 20px',
                                        fontSize: '15px',
                                        cursor: selectedExamProblems.length === 0
                                            ? 'not-allowed'
                                            : 'pointer'
                                    }}
                                >
                                    📄 선택 문제로 시험지 만들기
                                </button>

                                <button
                                    className="action-btn"
                                    disabled={!testSheetId}
                                    onClick={handleRegisterTestResult}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '10px 20px',
                                        fontSize: '15px',
                                        cursor: !testSheetId
                                            ? 'not-allowed'
                                            : 'pointer'
                                    }}
                                >
                                    ✅ 시험 결과 등록
                                </button>
                            </div>
                        </div>
                    )
                }
                {
                    activeMenu === '환경설정' && (
                        <div className="management-section">
                            <h2>⚙ 환경설정</h2>
                            <hr className="divider" />

                            <div style={{ marginTop: '20px' }}>
                                <h3>학원명</h3>

                                <input
                                    type="text"
                                    value={academyNameInput}
                                    onChange={e =>
                                        setAcademyNameInput(e.target.value)
                                    }
                                    placeholder="학원명을 입력하세요"
                                    style={{
                                        width: '300px',
                                        padding: '8px',
                                        fontSize: '15px'
                                    }}
                                />

                                <button
                                    onClick={async () => {
                                        const name =
                                            academyNameInput.trim();

                                        if (!name) {
                                            alert("학원명을 입력하세요.");
                                            return;
                                        }

                                        try {
                                            const result =
                                                await window.electronAPI.saveAcademyName(
                                                    name
                                                );

                                            if (result?.success) {
                                                setAcademyName(name);
                                                console.log(
                                                    "저장 직후 DB에서 다시 읽은 학원명 =",
                                                    await window.electronAPI.getAcademyName()
                                                );

                                                alert("학원명이 저장되었습니다.");

                                            } else {
                                                alert("학원명 저장에 실패했습니다.");
                                            }
                                        } catch (error) {
                                            console.error(
                                                "학원명 저장 오류:",
                                                error
                                            );
                                            alert(
                                                `학원명 저장 오류:\n${error.message}`
                                            );
                                        }
                                    }}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '8px 16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}

export default App;