"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.query = query;
exports.getImageCount = getImageCount;
exports.getImages = getImages;
exports.getKeywords = getKeywords;
exports.getImageDetails = getImageDetails;
exports.getFolders = getFolders;
exports.updateImageDetails = updateImageDetails;
exports.deleteImage = deleteImage;
const node_firebird_1 = __importDefault(require("node-firebird"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load configuration
function loadConfig() {
    const configPath = path_1.default.resolve(path_1.default.join(__dirname, '../config.json'));
    try {
        if (fs_1.default.existsSync(configPath)) {
            return JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
        }
    }
    catch (e) {
        console.error('Failed to load config.json:', e);
    }
    return {};
}
const config = loadConfig();
const dbConfig = config.database || {};
// Database options
// If path is relative in config, it's relative to the project root (one level up from dist-electron)
const rawDbPath = dbConfig.path || '../image-scoring/SCORING_HISTORY.FDB';
const dbPath = path_1.default.isAbsolute(rawDbPath)
    ? rawDbPath
    : path_1.default.resolve(path_1.default.join(__dirname, '..', rawDbPath));
console.log('Connecting to DB at:', dbPath);
const options = {
    host: dbConfig.host || '127.0.0.1',
    port: dbConfig.port || 3050,
    database: dbPath,
    user: dbConfig.user || 'sysdba',
    password: dbConfig.password || 'masterkey',
    lowercase_keys: true,
    role: '',
    pageSize: 4096
};
// Also support connecting to the file directly if we used Embedded, 
// but node-firebird is a pure JS client (requires server) or uses native bindings?
// 'node-firebird' is a pure JS implementation of the wire protocol. It NEEDS a running Firebird server.
// It cannot open FDB files directly without a server process listening on a port.
// This means the Python script or a service MUST be running.
// We will assume server is running on localhost:3050.
async function connectDB() {
    return new Promise((resolve, reject) => {
        node_firebird_1.default.attach(options, (err, db) => {
            if (err)
                return reject(err);
            resolve(db);
        });
    });
}
async function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        node_firebird_1.default.attach(options, (err, db) => {
            if (err)
                return reject(err);
            db.query(sql, params, (err, result) => {
                db.detach(); // Always detach after query
                if (err)
                    return reject(err);
                // Convert buffers to strings if needed (blob text)
                // Firebird returns BLOBs as Buffers or streams?
                // node-firebird usually handles text BLOBs if specified?
                // We'll see.
                resolve(result);
            });
        });
    });
}
async function getImageCount(options = {}) {
    const { folderId, minRating, colorLabel, keyword } = options;
    const params = [];
    const whereParts = [];
    if (folderId) {
        whereParts.push('folder_id = ?');
        params.push(folderId);
    }
    if (minRating !== undefined && minRating > 0) {
        whereParts.push('rating >= ?');
        params.push(minRating);
    }
    if (colorLabel) {
        whereParts.push('label = ?');
        params.push(colorLabel);
    }
    if (keyword) {
        whereParts.push('keywords LIKE ?');
        params.push(`%${keyword}%`);
    }
    const whereClause = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';
    const rows = await query(`SELECT COUNT(*) as "count" FROM images ${whereClause}`, params);
    return rows[0]?.count || 0;
}
async function getImages(options = {}) {
    const { limit = 50, offset = 0, folderId, minRating, colorLabel, keyword, sortBy = 'score_general', order = 'DESC' } = options;
    const params = [];
    const whereParts = [];
    if (folderId) {
        whereParts.push('folder_id = ?');
        params.push(folderId);
    }
    if (minRating !== undefined && minRating > 0) {
        whereParts.push('rating >= ?');
        params.push(minRating);
    }
    if (colorLabel) {
        whereParts.push('label = ?');
        params.push(colorLabel);
    }
    if (keyword) {
        whereParts.push('keywords LIKE ?');
        params.push(`%${keyword}%`);
    }
    const whereClause = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';
    // Validate sort column to prevent SQL injection
    const allowedSortColumns = [
        'id', 'created_at', 'score_general', 'score_technical', 'score_aesthetic',
        'score_spaq', 'score_ava', 'score_koniq', 'score_paq2piq', 'score_liqe',
        'rating', 'file_name'
    ];
    // Default to score_general if invalid
    const sortColumn = allowedSortColumns.includes(sortBy) ? `i.${sortBy}` : 'i.score_general';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    // Note: Offset/Limit in Firebird 3+ is OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    // But we need to put params in order. WHERE params come first.
    params.push(offset, limit);
    const sql = `
        SELECT 
            i.id, 
            COALESCE(fp.path, i.file_path) as file_path, 
            i.file_name, 
            i.score_general, 
            i.score_technical,
            i.score_aesthetic,
            i.score_spaq,
            i.score_ava,
            i.score_koniq,
            i.score_paq2piq,
            i.score_liqe,
            i.rating, 
            i.label, 
            i.created_at, 
            i.thumbnail_path
        FROM images i
        LEFT JOIN file_paths fp ON i.id = fp.image_id AND fp.path_type = 'WIN'
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `;
    return query(sql, params);
}
async function getKeywords() {
    // CAST to VARCHAR is safer for Node drivers than BLOBs for string data
    // Use 8191 as safe max for UTF8 in Firebird
    let sql = `SELECT CAST(keywords AS VARCHAR(8191)) as keywords FROM images WHERE keywords IS NOT NULL AND keywords <> ''`;
    console.log('[DB] Executing getKeywords SQL:', sql);
    try {
        let rows = await query(sql);
        console.log(`[DB] getKeywords returned ${rows.length} rows`);
        // Fallback if CAST returns nothing but plain query might work (unlikely but safe)
        if (rows.length === 0) {
            console.log('[DB] CAST query returned 0 rows. Retrying with raw BLOB query...');
            sql = `SELECT keywords FROM images WHERE keywords IS NOT NULL AND keywords <> ''`;
            rows = await query(sql);
            console.log(`[DB] Fallback query returned ${rows.length} rows`);
        }
        const uniqueKeywords = new Set();
        for (const row of rows) {
            // Check keys case-insensitively
            // If explicit alias is used (AS keywords), usually it respects that.
            const val = row.keywords || row.KEYWORDS || row.KEYWORDS_1;
            let kwStr = '';
            if (val) {
                if (Buffer.isBuffer(val)) {
                    kwStr = val.toString('utf8');
                }
                else if (typeof val === 'string') {
                    kwStr = val;
                }
            }
            if (kwStr) {
                // Assume comma separated
                const parts = kwStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
                parts.forEach(p => uniqueKeywords.add(p));
            }
        }
        const result = Array.from(uniqueKeywords).sort();
        console.log(`[DB] Found ${result.length} unique keywords`);
        return result;
    }
    catch (e) {
        console.error('[DB] getKeywords failed:', e);
        // Fallback: Return empty array
        return [];
    }
}
async function getImageDetails(id) {
    const sql = `
        SELECT 
            i.id,
            i.job_id,
            i.file_path,
            i.file_name,
            i.file_type,
            i.score,
            i.score_general,
            i.score_technical,
            i.score_aesthetic,
            i.score_spaq,
            i.score_ava,
            i.score_koniq,
            i.score_paq2piq,
            i.score_liqe,
            i.keywords,
            i.title,
            i.description,
            i.metadata,
            i.thumbnail_path,
            i.scores_json,
            i.model_version,
            i.rating,
            i.label,
            i.image_hash,
            i.folder_id,
            i.stack_id,
            i.created_at,
            i.burst_uuid,
            fp.path as win_path
        FROM images i
        LEFT JOIN file_paths fp ON i.id = fp.image_id AND fp.path_type = 'WIN'
        WHERE i.id = ?
    `;
    const rows = await query(sql, [id]);
    if (!rows || rows.length === 0) {
        return null;
    }
    const image = rows[0];
    // Ultra-aggressive serialization: Convert EVERYTHING to JSON and parse back
    // This ensures absolutely no Firebird-specific or Node.js-specific objects remain
    const stringified = JSON.stringify(image, (key, value) => {
        // Custom replacer to handle special types
        if (Buffer.isBuffer(value)) {
            return value.toString('utf8');
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value === undefined) {
            return null;
        }
        // For any other object, try to stringify it
        if (value && typeof value === 'object' && !(value instanceof Array)) {
            try {
                return JSON.parse(JSON.stringify(value));
            }
            catch {
                return String(value);
            }
        }
        return value;
    });
    return JSON.parse(stringified);
}
async function getFolders() {
    return query('SELECT id, path, parent_id, is_fully_scored FROM folders ORDER BY path ASC');
}
async function updateImageDetails(id, updates) {
    const allowedFields = ['title', 'description', 'rating', 'label'];
    const setParts = [];
    const params = [];
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            setParts.push(`${field} = ?`);
            params.push(updates[field]);
        }
    }
    if (setParts.length === 0)
        return false;
    params.push(id);
    const sql = `UPDATE images SET ${setParts.join(', ')} WHERE id = ?`;
    try {
        await query(sql, params);
        return true;
    }
    catch (e) {
        console.error('[DB] Update failed:', e);
        return false;
    }
}
async function deleteImage(id) {
    // Note: This only deletes from the DB. Use with caution.
    // Real file deletion should probably happen too, but let's stick to DB for now as per plan.
    try {
        await query('DELETE FROM images WHERE id = ?', [id]);
        return true;
    }
    catch (e) {
        console.error('[DB] Delete failed:', e);
        return false;
    }
}
