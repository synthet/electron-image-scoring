const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = "C:\\Users\\dmnsy\\.gemini\\antigravity\\brain\\0c61a4ce-03c7-433b-acd3-c2463ac093fa";
const pairs = [
    { a: 'D:/Photos/D90/50mm/2021/2021-08-11/20210811_0051.NEF', b: 'D:/Photos/D90/50mm/2021/2021-08-11/20210811_0049.NEF', prefix: 'pair1' },
    { a: 'D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0187.NEF', b: 'D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0178.NEF', prefix: 'pair2' },
    { a: 'D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0135.NEF', b: 'D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0127.NEF', prefix: 'pair3' }
];

const exiftoolPath = path.resolve(__dirname, '../node_modules/exiftool-vendored.exe/bin/exiftool.exe');

async function extractJpg(inFile, outFile) {
    return new Promise((resolve, reject) => {
        execFile(exiftoolPath, ['-b', '-JpgFromRaw', inFile], { encoding: 'buffer', maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            if (error || stdout.length === 0) {
                // If JpgFromRaw fails, try PreviewImage
                execFile(exiftoolPath, ['-b', '-PreviewImage', inFile], { encoding: 'buffer', maxBuffer: 1024 * 1024 * 50 }, (error2, stdout2) => {
                    if (error2) return reject(error2);
                    fs.writeFileSync(outFile, stdout2);
                    resolve();
                });
            } else {
                fs.writeFileSync(outFile, stdout);
                resolve();
            }
        });
    });
}

(async () => {
    // Ensure dir exists
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    for (const p of pairs) {
        const aName = path.basename(p.a, '.NEF');
        const bName = path.basename(p.b, '.NEF');
        const aOut = path.join(outDir, `${p.prefix}_${aName}.jpg`);
        const bOut = path.join(outDir, `${p.prefix}_${bName}.jpg`);

        console.log(`Extracting ${p.a}...`);
        await extractJpg(p.a, aOut);
        console.log(`Extracting ${p.b}...`);
        await extractJpg(p.b, bOut);
        console.log(`Done Pair ${p.prefix}: ${aName} and ${bName}`);
    }
})().catch(console.error);
