import { connectDB, query } from './electron/db.js';

async function verify() {
    try {
        console.log("Fetching image details for 21533 and 24891...");
        const sql = `
            SELECT i.id, i.file_path, i.file_name, i.thumbnail_path, 
                   fp.path as win_path, f.path as folder_path
            FROM images i
            LEFT JOIN file_paths fp ON i.id = fp.image_id AND fp.path_type = 'WIN'
            LEFT JOIN folders f ON i.folder_id = f.id
            WHERE i.id IN (21533, 24891)
        `;
        const rows = await query(sql);
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

verify();
