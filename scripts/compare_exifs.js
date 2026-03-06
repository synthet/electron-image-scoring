const { ExifTool } = require('exiftool-vendored');
const exiftool = new ExifTool();

async function dump() {
    const f1 = 'D:/Photos/D90/50mm/2021/2021-08-11/20210811_0051.NEF';
    const t1 = await exiftool.read(f1);
    console.log(JSON.stringify(t1, null, 2));
    await exiftool.end();
}

dump().catch(console.error);
