const { loadImage, createCanvas } = require("canvas");

async function detectProblemRegions(imagePath, numberWords = []) {

    const image = await loadImage(imagePath);

    const width = image.width;
    const height = image.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0);

    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;

    const rowDensity = [];

    for (let y = 0; y < height; y++) {

        let count = 0;

        for (let x = 0; x < width; x++) {

            const idx = (y * width + x) * 4;

            const gray =
                (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

            if (gray < 220)
                count++;

        }

        rowDensity.push(count);

    }

    const boxes = [];

    numberWords.sort((a, b) => a.y - b.y);

    for (let i = 0; i < numberWords.length; i++) {

        const cur = numberWords[i];

        const next = numberWords[i + 1];

        boxes.push({

            num: cur.number,

            x: 0,

            y: cur.y,

            width: width,

            height: next
                ? next.y - cur.y
                : height - cur.y

        });

    }

    return {

        width,

        height,

        rowDensity,

        boxes

    };

}

module.exports = {
    detectProblemRegions
};