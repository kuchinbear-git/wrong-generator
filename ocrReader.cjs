const { createWorker } = require("tesseract.js");
const { loadImage, createCanvas } = require("canvas");

// 숫자 토큰 추출
function extractNumberTokens(words) {

    return words
        .filter(word => /^\d+$/.test(word.text))
        .map(word => ({

            text: word.text,

            value: Number(word.text),

            bbox: word.bbox

        }));

}

// 숫자 변경
function changeNumbers(tokens) {

    return tokens.map(token => {

        const add = Math.floor(Math.random() * 9) + 1;

        return {

            ...token,

            original: token.text,

            changed: String(token.value + add)

        };

    });

}

async function testOCR(imagePath, progressCallback) {
    console.log("★★★★★ OCRReader VERSION 2 ★★★★★");
    console.log("OCR START :", imagePath);
    console.log("★★★★★ OCRReader 실행 ★★★★★");
    let worker;

    try {
        // 1. Tesseract Worker 생성
        worker = await createWorker(
            "kor+eng",
            1,
            {
                logger: (m) => {
                    if (progressCallback) {
                        progressCallback(m);
                    }
                }
            }
        );

        // 2. OCR 실행
        // 세 번째 인수에서 blocks 출력 활성화
        const result = await worker.recognize(
            imagePath,
            {},
            {
                blocks: true
            }
        );

        console.log("===== RAW BLOCKS =====");
        console.dir(result.data.blocks, { depth: null });

        console.log("========== OCR 결과 ==========");
        console.dir(result.data, { depth: null });
        console.log("==============================");

        // 3. blocks 내부의 words를 모두 꺼내기
        // 3. blocks 내부의 words를 모두 꺼내기
        const mappedWords = [];

        console.log("blocks =", result.data.blocks?.length);

        if (result.data.blocks) {

            result.data.blocks.forEach((block, i) => {

                console.log(
                    "block",
                    i,
                    "paragraphs =",
                    block.paragraphs?.length
                );
                block.paragraphs?.forEach((paragraph) => {
                    paragraph.lines?.forEach((line) => {
                        line.words?.forEach((word) => {

                            mappedWords.push({
                                text: word.text.trim(),
                                bbox: word.bbox
                            });

                        });
                    });
                });
            });
        }

        console.log("mappedWords.length =", mappedWords.length);

        console.log("OCR 원문 길이 =", result.data.text?.length);
        console.log("OCR 원문 =", result.data.text);

        console.log(
            mappedWords.slice(0, 20).map(w => ({
                text: w.text,
                bbox: w.bbox
            }))
        );

        // 숫자 토큰만 추출
        const numberTokens = extractNumberTokens(mappedWords);

        const changedTokens = changeNumbers(numberTokens);

        console.log("===== CHANGED TOKENS =====");

        console.log("===== CHANGED TOKENS =====");

        console.table(
            changedTokens.map(token => ({
                original: token.original,
                changed: token.changed,
                x0: token.bbox.x0,
                y0: token.bbox.y0,
                x1: token.bbox.x1,
                y1: token.bbox.y1
            }))
        );

        console.log("===== NUMBER TOKENS =====");

        console.log("===== NUMBER TOKENS =====");
        console.table(
            numberTokens.map(word => ({
                text: word.text,
                x: word.bbox?.x0,
                y: word.bbox?.y0
            }))
        );

        console.log("===== 왼쪽 영역 OCR 후보 =====");

        console.table(
            mappedWords
                .filter(word =>
                    word.bbox &&
                    word.bbox.x0 < 150
                )
                .map(word => ({
                    text: word.text,
                    x: word.bbox.x0,
                    y: word.bbox.y0,
                    width:
                        word.bbox.x1 - word.bbox.x0,
                    height:
                        word.bbox.y1 - word.bbox.y0
                }))
        );

        const problemBoxes = [];

        const image = await loadImage(imagePath);

        const isLeftPage = imagePath.includes("left.png");
        const isRightPage = imagePath.includes("right.png");

        console.log("imagePath :", imagePath);
        console.log("LEFT PAGE :", isLeftPage);
        console.log("RIGHT PAGE :", isRightPage);
        console.log("image.width =", image.width, "image.height =", image.height);

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0);

        const { data, width, height } =
            ctx.getImageData(
                0,
                0,
                image.width,
                image.height
            );

        // ===============================
        // 검은색 문항번호 박스 후보 탐색
        // ===============================

        const numberBoxCandidates = [];

        const scanWidth =
            Math.floor(width * 0.30);

        const visited = new Uint8Array(
            scanWidth * height
        );

        const isDarkPixel = (x, y) => {

            if (
                x < 0 ||
                x >= scanWidth ||
                y < 0 ||
                y >= height
            ) {
                return false;
            }

            const idx =
                (y * width + x) * 4;

            return (
                data[idx] < 70 &&
                data[idx + 1] < 70 &&
                data[idx + 2] < 70
            );
        };

        for (let y = 0; y < height; y++) {

            for (let x = 0; x < scanWidth; x++) {

                const visitIndex =
                    y * scanWidth + x;

                if (
                    visited[visitIndex] ||
                    !isDarkPixel(x, y)
                ) {
                    continue;
                }

                const queue = [[x, y]];

                visited[visitIndex] = 1;

                let minX = x;
                let maxX = x;
                let minY = y;
                let maxY = y;

                let pixelCount = 0;

                while (queue.length > 0) {

                    const [cx, cy] =
                        queue.pop();

                    pixelCount++;

                    minX = Math.min(minX, cx);
                    maxX = Math.max(maxX, cx);
                    minY = Math.min(minY, cy);
                    maxY = Math.max(maxY, cy);

                    const neighbors = [
                        [cx + 1, cy],
                        [cx - 1, cy],
                        [cx, cy + 1],
                        [cx, cy - 1]
                    ];

                    for (
                        const [nx, ny]
                        of neighbors
                    ) {

                        if (
                            nx < 0 ||
                            nx >= scanWidth ||
                            ny < 0 ||
                            ny >= height
                        ) {
                            continue;
                        }

                        const nIndex =
                            ny * scanWidth + nx;

                        if (
                            visited[nIndex] ||
                            !isDarkPixel(nx, ny)
                        ) {
                            continue;
                        }

                        visited[nIndex] = 1;

                        queue.push([
                            nx,
                            ny
                        ]);
                    }
                }

                const boxWidth =
                    maxX - minX + 1;

                const boxHeight =
                    maxY - minY + 1;

                const area =
                    boxWidth * boxHeight;

                const density =
                    pixelCount / area;

                console.log(
                    "===== 검은 영역 검사 =====",
                    {
                        x: minX,
                        y: minY,
                        width: boxWidth,
                        height: boxHeight,
                        pixels: pixelCount,
                        density:
                            Number(density.toFixed(2))
                    }
                );

                if (
                    boxWidth >= 15 &&
                    boxWidth <= 60 &&
                    boxHeight >= 10 &&
                    boxHeight <= 40 &&
                    density >= 0.55
                ) {

                    numberBoxCandidates.push({
                        x: minX,
                        y: minY,
                        width: boxWidth,
                        height: boxHeight,
                        pixels: pixelCount,
                        density:
                            Number(density.toFixed(2))
                    });
                }
            }
        }

        console.log(
            "===== 검은색 문항번호 박스 후보 ====="
        );

        console.table(
            numberBoxCandidates
        );

        // ==========================================
        // 검정박스 문항번호 인식
        // ==========================================

        for (const box of numberBoxCandidates) {

            const padding = 2;

            const cropX = Math.max(
                0,
                box.x - padding
            );

            const cropY = Math.max(
                0,
                box.y - padding
            );

            const cropWidth = Math.min(
                width - cropX,
                box.width + padding * 2
            );

            const cropHeight = Math.min(
                height - cropY,
                box.height + padding * 2
            );

            const numberCanvas = createCanvas(
                cropWidth * 5,
                cropHeight * 5
            );

            const numberCtx =
                numberCanvas.getContext("2d");

            numberCtx.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth * 5,
                cropHeight * 5
            );

            const halfWidth =
                Math.floor(
                    numberCanvas.width / 2
                );

            const readDigit = async (
                startX,
                digitWidth
            ) => {

                const digitCanvas =
                    createCanvas(
                        digitWidth,
                        numberCanvas.height
                    );

                const digitCtx =
                    digitCanvas.getContext("2d");

                digitCtx.drawImage(
                    numberCanvas,
                    startX,
                    0,
                    digitWidth,
                    numberCanvas.height,
                    0,
                    0,
                    digitWidth,
                    numberCanvas.height
                );

                await worker.setParameters({
                    tessedit_char_whitelist:
                        "0123456789",
                    tessedit_pageseg_mode: "10"
                });                

                const result =
                    await worker.recognize(
                        digitCanvas.toBuffer(
                            "image/png"
                        )
                    );

                return String(
                    result.data.text || ""
                )
                    .replace(/\D/g, "")
                    .trim();
            };

            const overlap =
                Math.floor(
                    numberCanvas.width * 0.05
                );

            let leftDigit =
                await readDigit(
                    0,
                    halfWidth
                );

            let rightDigit =
                await readDigit(
                    Math.max(
                        0,
                        halfWidth - overlap
                    ),
                    numberCanvas.width -
                    halfWidth +
                    overlap
                );

            // 각 영역은 한 자리 숫자만 사용
            if (leftDigit.length > 1) {
                leftDigit = leftDigit.charAt(0);
            }

            if (rightDigit.length > 1) {
                rightDigit =
                    rightDigit.charAt(
                        rightDigit.length - 1
                    );
            }

            // 01~09 형태에서 첫 번째 숫자를
            // OCR이 놓친 경우 0으로 보정
            if (
                !leftDigit &&
                rightDigit
            ) {
                leftDigit = "0";
            }

            console.log(
                "분리 OCR 결과:",
                {
                    leftDigit,
                    rightDigit
                }
            );

            console.log(
                "분리 OCR 결과:",
                {
                    x: box.x,
                    y: box.y,
                    leftDigit,
                    rightDigit
                }
            );

            box.debugLeftDigit = leftDigit;
            box.debugRightDigit = rightDigit;

            box.recognizedNumber =
                leftDigit + rightDigit;

            console.log(
                "검정박스 문항번호:",
                {
                    x: box.x,
                    y: box.y,
                    number:
                        box.recognizedNumber
                }
            );

            console.log(
                "===== 검정박스 문항번호 결과 ====="
            );

            console.table(
                numberBoxCandidates.map(box => ({
                    x: box.x,
                    y: box.y,
                    number:
                        box.recognizedNumber
                }))
            );
        }

        const hasBlackNumberBox =
            numberBoxCandidates.length >= 2;

        console.log(
            "===== 페이지 유형 판정 ====="
        );

        console.log(
            hasBlackNumberBox
                ? "검은박스 페이지"
                : "일반 OCR 페이지"
        );

        // ===============================
        // 주 문제번호(01,02,03...) 검출
        // ===============================

        const problemStarts = [];

        const LEFT_RATIO = 0.25;
        const MIN_NUMBER_HEIGHT = 18;

        // ==========================================
        // RIGHT 페이지 숫자 후보 진단
        // ==========================================

        const debugNumberCandidates = mappedWords
            .filter(word => {
                if (!word?.bbox) return false;

                return /\d/.test(
                    String(word.text).trim()
                );
            })
            .map(word => ({
                text: word.text,
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0
            }));
        console.log(
            "===== 숫자 후보 좌표 진단 ====="
        );

        console.table(
            debugNumberCandidates
        );

        // ==========================================
        // RIGHT 페이지 왼쪽 영역 OCR 원문 진단
        //
        // 문항번호가 숫자가 아닌 형태로 OCR되었는지 확인
        // ==========================================

        const debugLeftWords = mappedWords
            .filter(word => {
                if (!word?.bbox) return false;

                return word.bbox.x0 < 180;
            })
            .map(word => ({
                text: word.text,
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0
            }))
            .sort((a, b) => a.y - b.y);

        console.log(
            "===== LEFT AREA OCR WORDS ====="
        );

        console.table(
            debugLeftWords
        );

        for (const word of mappedWords) {

            const text = word.text;

            if (!/^\d{2}$/.test(text)) {
                continue;
            }

            const bbox = word.bbox;

            if (!bbox) {
                continue;
            }

            // 페이지 하단의 숫자는 페이지 번호로 간주하여 제외
            if (
                bbox.y0 > height * 0.90 &&
                bbox.x0 > width * 0.30 &&
                bbox.x1 < width * 0.70
            ) {
                continue;
            }

            // 번호 주변 여백 검사
            const margin = 15;

            const left =
                Math.max(0, bbox.x0 - margin);

            const right =
                Math.min(width - 1, bbox.x1 + margin);

            let leftBlack = 0;
            let rightBlack = 0;

            // 왼쪽 검사
            for (
                let y = bbox.y0;
                y <= bbox.y1;
                y++
            ) {
                for (
                    let x = left;
                    x < bbox.x0;
                    x++
                ) {

                    const idx =
                        (y * width + x) * 4;

                    if (
                        data[idx] < 180 &&
                        data[idx + 1] < 180 &&
                        data[idx + 2] < 180
                    ) {
                        leftBlack++;
                    }
                }
            }

            // 오른쪽 검사
            for (
                let y = bbox.y0;
                y <= bbox.y1;
                y++
            ) {
                for (
                    let x = bbox.x1;
                    x <= right;
                    x++
                ) {

                    const idx =
                        (y * width + x) * 4;

                    if (
                        data[idx] < 180 &&
                        data[idx + 1] < 180 &&
                        data[idx + 2] < 180
                    ) {
                        rightBlack++;
                    }
                }
            }

            // 좌우에 글자가 너무 붙어있으면 제외
            if (
                leftBlack > 20 ||
                rightBlack > 20
            ) {
                continue;
            }

            // 왼쪽 영역만 검사
            if (
                bbox.x0 > width * LEFT_RATIO
            ) {
                continue;
            }

            const wordHeight =
                bbox.y1 - bbox.y0;

            if (
                wordHeight < MIN_NUMBER_HEIGHT
            ) {
                continue;
            }

            problemStarts.push({
                number: text,
                x: bbox.x0,
                y: bbox.y0,
                width: bbox.x1 - bbox.x0,
                height: wordHeight,
                leftBlack,
                rightBlack
            });
        }

        // ==========================================
        // OCR에서 한 자리 숫자로 잘못 인식된
        // 문항번호 복원
        //
        // 예:
        // 4  → 41
        // 42
        // 3  → 43
        // 44
        // ==========================================

        const singleDigitCandidates =
            mappedWords
                .filter(word => {
                    if (!word?.bbox) return false;

                    const text =
                        String(word.text).trim();

                    if (!/^\d$/.test(text)) {
                        return false;
                    }

                    if (
                        word.bbox.x0 >
                        width * LEFT_RATIO
                    ) {
                        return false;
                    }

                    const height =
                        word.bbox.y1 -
                        word.bbox.y0;

                    return (
                        height >=
                        MIN_NUMBER_HEIGHT
                    );
                })
                .map(word => ({
                    number: word.text.trim(),
                    x: word.bbox.x0,
                    y: word.bbox.y0,
                    width:
                        word.bbox.x1 -
                        word.bbox.x0,
                    height:
                        word.bbox.y1 -
                        word.bbox.y0
                }));

        // ------------------------------------------
        // 첫 문항 앞의 번호 복원
        // 예: 4 → 41 → 42
        // ------------------------------------------

        if (problemStarts.length >= 1) {

            const firstNumber =
                Number(problemStarts[0].number);

            const expectedNumber =
                firstNumber - 1;

            if (
                Number.isInteger(firstNumber) &&
                expectedNumber >= 1
            ) {

                const expectedTens =
                    Math.floor(
                        expectedNumber / 10
                    ).toString();

                const candidate =
                    singleDigitCandidates.find(
                        item =>
                            item.number ===
                            expectedTens &&
                            item.y <
                            problemStarts[0].y
                    );

                if (candidate) {

                    problemStarts.unshift({
                        number: String(
                            expectedNumber
                        ).padStart(2, "0"),
                        x: candidate.x,
                        y: candidate.y,
                        width: candidate.width,
                        height: candidate.height
                    });

                    console.log(
                        "문항번호 복원:",
                        expectedNumber,
                        "y=",
                        candidate.y
                    );
                }
            }
        }

        // ------------------------------------------
        // 두 문항 사이의 번호 복원
        // 예: 42 → 3 → 44
        // ------------------------------------------

        for (
            let i = 0;
            i < problemStarts.length - 1;
            i++
        ) {

            const currentNumber =
                Number(
                    problemStarts[i].number
                );

            const nextNumber =
                Number(
                    problemStarts[i + 1].number
                );

            if (
                nextNumber !==
                currentNumber + 2
            ) {
                continue;
            }

            const expectedNumber =
                currentNumber + 1;

            const expectedOnes =
                (
                    expectedNumber % 10
                ).toString();

            const candidate =
                singleDigitCandidates.find(
                    item =>
                        item.number ===
                        expectedOnes &&
                        item.y >
                        problemStarts[i].y &&
                        item.y <
                        problemStarts[i + 1].y
                );

            if (candidate) {

                problemStarts.splice(
                    i + 1,
                    0,
                    {
                        number: String(
                            expectedNumber
                        ).padStart(2, "0"),
                        x: candidate.x,
                        y: candidate.y,
                        width: candidate.width,
                        height: candidate.height
                    }
                );

                console.log(
                    "문항번호 복원:",
                    expectedNumber,
                    "y=",
                    candidate.y
                );

                i++;
            }
        }

        problemStarts.sort(
            (a, b) => a.y - b.y
        );

        // ==========================================
        // 문항번호 OCR 실패 시 시각적 문항 시작점 보완
        //
        // 조건:
        // - 일반 OCR 페이지
        // - 문항번호 후보가 하나도 없음
        //
        // 방법:
        // 1. OCR Word를 y 기준으로 줄 단위로 묶음
        // 2. 줄 사이의 큰 세로 간격을 찾음
        // 3. 큰 간격 뒤의 첫 줄을 새로운 문항 시작으로 판단
        //
        // 주의:
        // 문항번호가 정상 검출되는 페이지에는 영향을 주지 않는다.
        // ==========================================

        if (
            !hasBlackNumberBox &&
            problemStarts.length === 0 &&
            mappedWords.length > 0
        ) {

            console.log(
                "===== 문항번호 OCR 실패 → 시각적 fallback 시작 ====="
            );

            const visualWords = mappedWords
                .filter(word => {
                    if (!word?.bbox) {
                        return false;
                    }

                    return word.bbox.y0 < height * 0.95;
                })
                .sort(
                    (a, b) =>
                        a.bbox.y0 - b.bbox.y0
                );

            const lines = [];

            const LINE_TOLERANCE = 12;

            for (const word of visualWords) {

                const centerY =
                    (
                        word.bbox.y0 +
                        word.bbox.y1
                    ) / 2;

                let targetLine = null;

                for (const line of lines) {

                    if (
                        Math.abs(
                            line.centerY - centerY
                        ) <= LINE_TOLERANCE
                    ) {
                        targetLine = line;
                        break;
                    }
                }

                if (!targetLine) {

                    targetLine = {
                        centerY,
                        minX: word.bbox.x0,
                        maxY: word.bbox.y1,
                        words: []
                    };

                    lines.push(targetLine);
                }

                targetLine.words.push(word);

                targetLine.minX =
                    Math.min(
                        targetLine.minX,
                        word.bbox.x0
                    );

                targetLine.maxY =
                    Math.max(
                        targetLine.maxY,
                        word.bbox.y1
                    );

                targetLine.centerY =
                    targetLine.words.reduce(
                        (sum, currentWord) =>
                            sum +
                            (
                                currentWord.bbox.y0 +
                                currentWord.bbox.y1
                            ) / 2,
                        0
                    ) /
                    targetLine.words.length;
            }

            lines.sort(
                (a, b) =>
                    a.centerY - b.centerY
            );

            console.log(
                "===== OCR 줄 분석 ====="
            );

            console.table(
                lines.map((line, index) => ({
                    index,
                    y: Math.round(line.centerY),
                    x: Math.round(line.minX),
                    words: line.words.length
                }))
            );

            const gaps = [];

            for (
                let i = 1;
                i < lines.length;
                i++
            ) {

                gaps.push({
                    index: i,
                    gap:
                        lines[i].centerY -
                        lines[i - 1].centerY
                });
            }

            const positiveGaps =
                gaps
                    .map(item => item.gap)
                    .filter(gap => gap > 0);

            const sortedGaps =
                [...positiveGaps].sort(
                    (a, b) => a - b
                );

            const medianGap =
                sortedGaps.length > 0
                    ? sortedGaps[
                    Math.floor(
                        sortedGaps.length / 2
                    )
                    ]
                    : 30;

            const VISUAL_GAP_THRESHOLD =
                Math.max(
                    45,
                    medianGap * 2.2
                );

            console.log(
                "medianGap =",
                medianGap
            );

            console.log(
                "VISUAL_GAP_THRESHOLD =",
                VISUAL_GAP_THRESHOLD
            );

            const visualStarts = [];

            // 첫 번째 OCR 줄은
            // 페이지 제목/머리말일 가능성이 높으므로
            // 문항 시작점으로 강제 추가하지 않는다.

            if (lines.length === 0) {
                console.log(
                    "===== 시각적 fallback: OCR 줄 없음 ====="
                );
            }

            for (
                let i = 1;
                i < lines.length;
                i++
            ) {

                const gap =
                    lines[i].centerY -
                    lines[i - 1].centerY;

                if (
                    gap >=
                    VISUAL_GAP_THRESHOLD
                ) {

                    visualStarts.push({
                        y: Math.max(
                            0,
                            lines[i].centerY - 47
                        ),
                        number:
                            `V${visualStarts.length + 1}`,
                        source: "visual"
                    });

                }
            }

            problemStarts.push(
                ...visualStarts
            );

            problemStarts.sort(
                (a, b) => a.y - b.y
            );

            console.log(
                "===== 시각적 fallback 결과 ====="
            );

            console.table(
                problemStarts
            );
        }

        // ==========================================
        // 문항번호 사이의 내부 숫자 오검출 제거
        //
        // 예:
        // 03 → 97 → 04
        // 05 → 86 → 06
        //
        // 앞뒤 번호가 정상적으로 연속되면
        // 그 사이의 숫자는 문항 내부 숫자로 판단
        // ==========================================

        const filteredProblemStarts = [];

        for (let i = 0; i < problemStarts.length; i++) {

            const current =
                Number(problemStarts[i].number);

            const previous =
                i > 0
                    ? Number(problemStarts[i - 1].number)
                    : null;

            const next =
                i < problemStarts.length - 1
                    ? Number(problemStarts[i + 1].number)
                    : null;

            // ------------------------------------------
            // 1. 같은 번호가 연속해서 다시 나온 경우
            //    뒤쪽 숫자를 문항 내부 숫자로 판단
            // ------------------------------------------
            const isDuplicateNumber =
                Number.isInteger(previous) &&
                Number.isInteger(current) &&
                current === previous;

            if (isDuplicateNumber) {

                console.log(
                    "문항 내부 중복 숫자 제거:",
                    problemStarts[i].number,
                    "y=",
                    problemStarts[i].y
                );

                continue;
            }

            // ------------------------------------------
            // 2. 앞뒤 문항번호 사이에 끼어든 숫자 제거
            //    예: 03 → 97 → 04
            // ------------------------------------------
            const isInternalNumber =
                Number.isInteger(previous) &&
                Number.isInteger(current) &&
                Number.isInteger(next) &&
                next === previous + 1 &&
                current !== previous + 1;

            if (isInternalNumber) {

                console.log(
                    "문항 내부 숫자 오검출 제거:",
                    problemStarts[i].number,
                    "y=",
                    problemStarts[i].y
                );

                continue;
            }

            filteredProblemStarts.push(
                problemStarts[i]
            );
        }

        problemStarts.length = 0;

        problemStarts.push(
            ...filteredProblemStarts
        );

        console.log(
            "========== Problem Starts =========="
        );

        problemStarts.forEach(p => {
            console.log(
                `${p.number}   y=${p.y}   h=${p.height}`
            );
        });

        // ==========================================
        // 연속 문항번호 사이의 내부 오검출 제거
        //
        // 예:
        // 05 -> 86 -> 06
        //
        // 실제 문항은 05 -> 06이고,
        // 86은 05번 내부의 숫자로 판단한다.
        // ==========================================

        const sequenceFilteredStarts = [];

        for (let i = 0; i < problemStarts.length; i++) {

            const current = Number(
                problemStarts[i].number
            );

            const previous =
                i > 0
                    ? Number(problemStarts[i - 1].number)
                    : null;

            const next =
                i < problemStarts.length - 1
                    ? Number(problemStarts[i + 1].number)
                    : null;

            const isInternalOutlier =
                Number.isInteger(previous) &&
                Number.isInteger(current) &&
                Number.isInteger(next) &&
                next === previous + 1 &&
                current !== previous + 1;

            if (isInternalOutlier) {

                console.log(
                    "문항번호 내부 오검출 제거:",
                    problemStarts[i]
                );

                continue;
            }

            sequenceFilteredStarts.push(
                problemStarts[i]
            );
        }

        problemStarts.length = 0;

        problemStarts.push(
            ...sequenceFilteredStarts
        );

        // ==========================================
        // 마지막 후보의 내부 숫자 오검출 제거
        //
        // 예:
        // 06 -> 12
        // 실제 문항은 06으로 끝나고,
        // 12는 06번 도형 내부의 길이 숫자일 수 있음.
        //
        // 단, 실제 문항번호일 가능성을 고려하여
        // "번호가 갑자기 크게 증가하면서"
        // "세로 간격이 짧은 경우"만 제거한다.
        // ==========================================

        if (problemStarts.length >= 2) {

            const lastIndex =
                problemStarts.length - 1;

            const previous =
                problemStarts[lastIndex - 1];

            const last =
                problemStarts[lastIndex];

            const previousNumber =
                Number(previous.number);

            const lastNumber =
                Number(last.number);

            const lastGap =
                last.y - previous.y;

            const LAST_INTERNAL_GAP = 150;

            const isLastInternalNumber =
                Number.isInteger(previousNumber) &&
                Number.isInteger(lastNumber) &&
                lastNumber > previousNumber + 1 &&
                lastGap < LAST_INTERNAL_GAP;

            if (isLastInternalNumber) {

                console.log(
                    "===== 마지막 문항 내부 숫자 제거 ====="
                );

                console.log(
                    "이전 문항:",
                    previous.number,
                    "y=",
                    previous.y
                );

                console.log(
                    "오검출 후보:",
                    last.number,
                    "y=",
                    last.y,
                    "gap=",
                    lastGap
                );

                problemStarts.pop();
            }
        }

        console.log(
            "===================================="
        );

        // ===============================
        // 페이지 유형에 따른 문항 시작점 선택
        // ===============================

        if (hasBlackNumberBox) {

            console.log(
                "===== BLACKBOX MODE ====="
            );

            problemStarts.length = 0;

            for (const box of numberBoxCandidates) {

                problemStarts.push({
                    number: box.recognizedNumber,
                    y: box.y,
                    height: box.height,
                    source: "blackbox",
                    debugLeftDigit: box.debugLeftDigit,
                    debugRightDigit: box.debugRightDigit
                });

            }

            problemStarts.sort(
                (a, b) => a.y - b.y
            );

        } else {

            console.log(
                "===== EXISTING OCR MODE ====="
            );

        }

        const rowBlackCounts = [];

        const PAGE_FOOTER_HEIGHT = 70;

        const contentHeight = height - PAGE_FOOTER_HEIGHT;

        for (let y = 0; y < contentHeight; y++) {

            let blackCount = 0;

            for (let x = 0; x < width; x++) {

                const index = (y * width + x) * 4;

                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];

                if (r < 200 && g < 200 && b < 200) {
                    blackCount++;
                }

            }

            rowBlackCounts.push(blackCount);

        }

        const maxBlack = Math.max(...rowBlackCounts);
        const minBlack = Math.min(...rowBlackCounts);

        console.log("minBlack =", minBlack);
        console.log("maxBlack =", maxBlack);

        const histogram = {};

        for (const count of rowBlackCounts) {
            histogram[count] = (histogram[count] || 0) + 1;
        }

        console.log("0~30 픽셀 분포");

        for (let i = 0; i <= 30; i++) {
            console.log(`${i} : ${histogram[i] || 0}`);
        }

        console.log("★★★★★★★★★★★★★★★★★★★★");
        console.log("rowBlackCounts =", rowBlackCounts.slice(0, 30));
        console.log("★★★★★★★★★★★★★★★★★★★★");

        problemBoxes.length = 0;
        const margin = 10;

        for (let i = 0; i < problemStarts.length; i++) {

            const startY = Math.max(
                0,
                problemStarts[i].y - margin
            );

            let endY;

            if (i < problemStarts.length - 1) {

                // 다음 문항번호의 시작점을
                // 현재 문항의 하단 경계로 사용
                const nextProblemY =
                    problemStarts[i + 1].y;

                endY =
                    nextProblemY;

            } else {
                endY = problemStarts[i].y;

                for (const word of mappedWords) {

                    if (!word.bbox) continue;

                    if (
                        word.bbox.y1 <
                        problemStarts[i].y
                    ) continue;

                    if (
                        word.bbox.y1 >
                        height * 0.95
                    ) continue;

                    endY =
                        Math.max(
                            endY,
                            word.bbox.y1
                        );
                }

                endY += 20;
            }

            console.log("startY =", startY);
            console.log("endY =", endY);
            console.log("현재 height =", height);

            const boxWidth =
                imagePath.toLowerCase().includes("left.png")
                    ? width - 10
                    : width;

            let boxX = 0;

            // 왼쪽 이미지의 불필요한 왼쪽 여백을 줄임
            if (imagePath.toLowerCase().includes("left.png")) {

                let minX = width;

                for (const word of mappedWords) {

                    if (!word.bbox) continue;

                    const wordCenterY =
                        (word.bbox.y0 + word.bbox.y1) / 2;

                    if (
                        wordCenterY < startY ||
                        wordCenterY > endY
                    ) {
                        continue;
                    }

                    if (word.bbox.x0 < minX) {
                        minX = word.bbox.x0;
                    }
                }

                if (minX < width) {
                    boxX = Math.max(
                        0,
                        Math.floor(minX - 5)
                    );
                }
            }

            problemBoxes.push({

                number: problemStarts[i].number,

                source: problemStarts[i].source,

                x: boxX,

                y: startY,

                width: width - boxX,

                height: endY - startY
            });
        }

        console.log("problemBoxes =", problemBoxes);

        const fs = require("fs");
        const path = require("path");

        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;

        ctx.strokeStyle = "blue";

        ctx.lineWidth = 3;

        for (const box of problemBoxes) {

            ctx.strokeRect(
                box.x,
                box.y,
                box.width,
                box.height
            );

        }

        const debugPath = path.join(
            path.dirname(imagePath),
            "debug.png"
        );

        try {

            fs.writeFileSync(
                debugPath,
                canvas.toBuffer("image/png")
            );

            console.log("디버그 이미지 저장 성공:", debugPath);

        } catch (e) {

            console.error("디버그 저장 실패:", e);

        }

        console.log("이미지 크기 :", width, height);
        console.log("빈 줄 개수 :", problemBoxes.length);


        return {
            success: true,
            text: result.data.text,
            words: mappedWords,
            numberTokens,
            changedTokens,
            problemStarts,
            problemBoxes,

            // 진단용
            blockCount: result.data.blocks?.length || 0,
            mappedWordCount: mappedWords.length,

            debugNumberCandidates,
            debugLeftWords
        };

    } catch (err) {
        console.error("OCR 에러 발생:", err);

        console.log("OCR:", imagePath);

        return {
            success: false,
            message: err.message
        };

    } finally {
        // 4. Worker 종료
        if (worker) {
            await worker.terminate();
        }
    }
}

module.exports = {
    testOCR
};