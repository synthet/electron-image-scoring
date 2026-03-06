const { ExifTool } = require('exiftool-vendored');
const exiftool = new ExifTool();

async function check() {
    const pairs = [
        ['D:/Photos/D90/50mm/2021/2021-08-11/20210811_0051.NEF', 'D:/Photos/D90/50mm/2021/2021-08-11/20210811_0049.NEF'],
        ['D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0187.NEF', 'D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0178.NEF'],
        ['D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0135.NEF', 'D:/Photos/D90/28-105mm/2021/2021-08-16/20210816_0127.NEF']
    ];

    for (const [f1, f2] of pairs) {
        console.log(`\nPair:\n  ${f1}\n  ${f2}`);
        try {
            const t1 = await exiftool.read(f1);
            const t2 = await exiftool.read(f2);
            console.log(`  FileNumber:   ${t1.FileNumber} | ${t2.FileNumber}`);
            console.log(`  ShutterCount: ${t1.ShutterCount} | ${t2.ShutterCount}`);
            console.log(`  CreateDate:   ${t1.CreateDate?.rawValue} | ${t2.CreateDate?.rawValue}`);
            console.log(`  SubSecTime:   ${t1.SubSecTime} | ${t2.SubSecTime}`);
        } catch (e) {
            console.error(e.message);
        }
    }

    await exiftool.end();
}

check().catch(console.error);
