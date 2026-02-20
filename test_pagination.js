const path = require('path');
const { getStacks } = require('./dist-electron/db.js');

async function main() {
    try {
        console.log("Fetching first page (limit: 10, offset: 0)");
        const page1 = await getStacks({ limit: 10, offset: 0 });
        console.log(`Received ${page1.length} rows.`);

        console.log("Fetching second page (limit: 10, offset: 10)");
        const page2 = await getStacks({ limit: 10, offset: 10 });
        console.log(`Received ${page2.length} rows.`);

        console.log("\nPage 1 stack_keys:", page1.map(r => r.stack_key));
        console.log("Page 2 stack_keys:", page2.map(r => r.stack_key));

        const intersection = page1.filter(r1 => page2.find(r2 => r2.stack_key === r1.stack_key));
        if (intersection.length > 0) {
            console.error("\n❌ FAILED! Found overlapping stack_keys:", intersection.map(r => r.stack_key));
        } else {
            console.log("\n✅ SUCCESS! Pages are disjoint.");
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
    process.exit(0);
}

main();
