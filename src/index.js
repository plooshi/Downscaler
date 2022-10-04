let isNode = typeof window === "undefined";

class Resolution {
    constructor(w, h) {
        this.width = w;
        this.height = h;
    }
}

class Coord {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class BlockCoords {
    constructor(x, y) {
        this.top_left = new Coord(x, y);
        this.top_right = new Coord(x + 1, y);
        this.bottom_left = new Coord(x, y - 1);
        this.bottom_right = new Coord(x + 1, y - 1);
    }

    *[Symbol.iterator]() {
        yield this.top_left;
        yield this.top_right;
        yield this.bottom_left;
        yield this.bottom_right;
    }
}

class RGBA {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    matching(other) {
        if (this.r == other.r && this.g == other.g && this.b == other.b && this.a == other.a) return true;
        return false;
    }

    averageWith(other) {
        let avgR = (this.r + other.r) / 2,
            avgG = (this.g + other.g) / 2,
            avgB = (this.b + other.b) / 2,
            avgA = (this.a + other.a) / 2;
        return new RGBA(avgR, avgG, avgB, avgA);
    }
}

class Block {
    constructor(position, color) {
        this.position = position;
        this.color = color;
    }
}

class Canvas {
    static async create(width, height) {
        if (isNode) {
            let canvas = await import("canvas");
            return canvas.createCanvas(width, height);
        }
        else {
            let canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            return canvas;
        }
    }
}

function computeBlockColor(blockColors) {
    let blockColor1 = blockColors[0],
        blockColor2 = blockColors[1],
        blockColor3 = blockColors[2],
        blockColor4 = blockColors[3];
    if (blockColor1.matching(blockColor2) && blockColor1.matching(blockColor3) && blockColor1.matching(blockColor4))
        return blockColor1;
    let blockColorChunk1, blockColorChunk2;
    if (blockColor1.matching(blockColor4) || blockColor1.matching(blockColor2)) blockColorChunk1 = blockColor1;
    if (blockColor3.matching(blockColor2) || blockColor3.matching(blockColor4)) blockColorChunk2 = blockColor3;
    if (!blockColorChunk1) blockColorChunk1 = blockColor1.averageWith(blockColor4);
    if (!blockColorChunk2) blockColorChunk2 = blockColor2.averageWith(blockColor3);
    return blockColorChunk1.averageWith(blockColorChunk2);
}

async function downscaleImg(image2Down) {
    let start = Date.now(),
        resolution = new Resolution(image2Down.width, image2Down.height);
    const loadedCanvas = await Canvas.create(resolution.width, resolution.height),
        loadedCTX = loadedCanvas.getContext("2d");
    loadedCTX.drawImage(image2Down, 0, 0, resolution.width, resolution.height);
    let blockMap = new Resolution(resolution.width / 2, resolution.height / 2),
        loadedData = loadedCTX.getImageData(0, 0, resolution.width, resolution.height).data;
    start = Date.now();

    let blocks = [];
    for (let x = 0; x < blockMap.width; x++) {
        for (let y = 0; y < blockMap.height; y++) {
            let actualPos = new Coord(x * 2, y * 2),
                blockPixels = [...new BlockCoords(actualPos.x, actualPos.y)],
                blockColors = [];
            blockPixels.forEach(pos => {
                let pixelPos = (pos.y + 1) * (resolution.width * 4) + pos.x * 4;
                blockColors.push(new RGBA(loadedData[pixelPos], loadedData[pixelPos + 1], loadedData[pixelPos + 2], loadedData[pixelPos + 3]))
            });
            blocks.push(new Block(new Coord(x, y), computeBlockColor(blockColors)));
        }
    }
    return { blocks, blockMap };
}

async function saveFile(downScaledCanvas) {
    if (isNode) {      
        let fs = await import("fs");
        const downscaledImg = fs.createWriteStream("downscaled.png"),
            downscaledStream = downScaledCanvas.createPNGStream();
        downscaledStream.pipe(downscaledImg);
        downscaledImg.on("finish", () => downscaledImg.close());
    } else {
        await downScaledCanvas.toBlob(blob => {
            let blobURL = URL.createObjectURL(blob),
                linkElem = document.getElementById("link");
            if (navigator.userAgent.includes("iPad") || navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("Mac")) {
                linkElem.innerHTML = "Image Generated!";
                linkElem.src = blobURL;
                linkElem.className = "generated";
            }
            else {
                open(blobURL);
                linkElem.innerHTML = "Opened link in new tab!";
            }
        }, "image/png", 1);
    }
}

async function downscaleMain(image2Down) {
    let downscaleData = await downscaleImg(image2Down),
        blocks = downscaleData.blocks,
        blockMap = downscaleData.blockMap,
        _ImageData,
        downScaledCanvas = await Canvas.create(blockMap.width, blockMap.height),
        downScaledCTX = downScaledCanvas.getContext("2d"),
        outputBlocks = [],
        outWidth = blockMap.width;
    
    if (isNode) {
        let canvas = await import("canvas");
        _ImageData = canvas.ImageData;
    } else {
        _ImageData = ImageData;
    }
    blocks.forEach(block => {
        let blockPos = block.position,
            arrayPos = blockPos.y * (outWidth * 4) + blockPos.x * 4,
            blockColor = block.color;
        outputBlocks[arrayPos] = blockColor.r;
        outputBlocks[arrayPos + 1] = blockColor.g;
        outputBlocks[arrayPos + 2] = blockColor.b;
        outputBlocks[arrayPos + 3] = blockColor.a;
    })                                                       
    downScaledCTX.putImageData(new _ImageData(new Uint8ClampedArray(outputBlocks), outWidth, blockMap.height), 0, 0);
    saveFile(downScaledCanvas);
}

async function downscale() {
    if (isNode) {
        let canvas = await import("canvas"),
            fs = await import("fs");
        const file = fs.readFileSync("image.png");
        let image = await canvas.loadImage(file);
        downscaleMain(image);
    } else {
        const img = document.getElementById("image2Down");
        img.addEventListener("change", () => {
            let image = new Image();
            image.src = URL.createObjectURL(img.files[0]);
            let srcChecker = setInterval(() => {
                if (image.src != "") {
                    clearInterval(srcChecker);
                    downscaleMain(image);
                }
            }, 50);
        });
    }
};

downscale();