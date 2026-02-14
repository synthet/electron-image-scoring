import Firebird from 'node-firebird';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Load configuration
function loadConfig() {
    const configPath = path.resolve(path.join(__dirname, '../config.json'));
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load config.json:', e);
    }
    return {};
}

const config = loadConfig();
const dbConfig = config.database || {};

// Database options
// If path is relative in config, it's relative to the project root (one level up from dist-electron)
const rawDbPath = dbConfig.path || '../image-scoring/SCORING_HISTORY.FDB';
const dbPath = path.isAbsolute(rawDbPath)
    ? rawDbPath
    : path.resolve(path.join(__dirname, '..', rawDbPath));

console.log('Connecting to DB at:', dbPath);

const options: Firebird.Options = {
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

export async function connectDB(): Promise<Firebird.Database> {
    return new Promise((resolve, reject) => {
        Firebird.attach(options, (err, db) => {
            if (err) return reject(err);
            resolve(db);
        });
    });
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        Firebird.attach(options, (err, db) => {
            if (err) return reject(err);

            db.query(sql, params, (err, result) => {
                db.detach(); // Always detach after query
                if (err) return reject(err);

                // Convert buffers to strings if needed (blob text)
                // Firebird returns BLOBs as Buffers or streams?
                // node-firebird usually handles text BLOBs if specified?
                // We'll see.

                resolve(result as T[]);
            });
        });
    });
}

export async function getImageCount(options: ImageQueryOptions = {}): Promise<number> {
    const { folderId, minRating, colorLabel, keyword } = options;
    const params: any[] = [];
    const whereParts: string[] = [];

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

    const rows = await query<{ count: number }>(`SELECT COUNT(*) as "count" FROM images ${whereClause}`, params);
    return rows[0]?.count || 0;
}

export interface ImageQueryOptions {
    limit?: number;
    offset?: number;
    folderId?: number;
    minRating?: number;
    colorLabel?: string;
    keyword?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

export async function getImages(options: ImageQueryOptions = {}): Promise<any[]> {
    const { limit = 50, offset = 0, folderId, minRating, colorLabel, keyword, sortBy = 'score_general', order = 'DESC' } = options;
    const params: any[] = [];
    const whereParts: string[] = [];

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
        'score_spaq', 'score_ava', 'score_liqe',
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
            i.score_ava,
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

export async function getKeywords(): Promise<string[]> {
    // CAST to VARCHAR is safer for Node drivers than BLOBs for string data
    // Use 8191 as safe max for UTF8 in Firebird
    let sql = `SELECT CAST(keywords AS VARCHAR(8191)) as keywords FROM images WHERE keywords IS NOT NULL AND keywords <> ''`;

    console.log('[DB] Executing getKeywords SQL:', sql);

    try {
        let rows = await query<any>(sql);
        console.log(`[DB] getKeywords returned ${rows.length} rows`);

        // Fallback if CAST returns nothing but plain query might work (unlikely but safe)
        if (rows.length === 0) {
            console.log('[DB] CAST query returned 0 rows. Retrying with raw BLOB query...');
            sql = `SELECT keywords FROM images WHERE keywords IS NOT NULL AND keywords <> ''`;
            rows = await query<any>(sql);
            console.log(`[DB] Fallback query returned ${rows.length} rows`);
        }

        const uniqueKeywords = new Set<string>();

        for (const row of rows) {
            // Check keys case-insensitively
            // If explicit alias is used (AS keywords), usually it respects that.
            const val = row.keywords || row.KEYWORDS || row.KEYWORDS_1;

            let kwStr = '';
            if (val) {
                if (Buffer.isBuffer(val)) {
                    kwStr = val.toString('utf8');
                } else if (typeof val === 'string') {
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
    } catch (e) {
        console.error('[DB] getKeywords failed:', e);
        // Fallback: Return empty array
        return [];
    }
}

export async function getImageDetails(id: number): Promise<any> {
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
            } catch {
                return String(value);
            }
        }
        return value;
    });

    return JSON.parse(stringified);
}

export async function getFolders(): Promise<any[]> {
    return query('SELECT id, path, parent_id, is_fully_scored FROM folders ORDER BY path ASC');
}

export async function updateImageDetails(id: number, updates: any): Promise<boolean> {
    const allowedFields = ['title', 'description', 'rating', 'label'];
    const setParts: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            setParts.push(`${field} = ?`);
            params.push(updates[field]);
        }
    }

    if (setParts.length === 0) return false;

    params.push(id);
    const sql = `UPDATE images SET ${setParts.join(', ')} WHERE id = ?`;

    try {
        await query(sql, params);
        return true;
    } catch (e) {
        console.error('[DB] Update failed:', e);
        return false;
    }
}

export interface StackQueryOptions extends ImageQueryOptions {
    // inherits all filter options from ImageQueryOptions
}

// ---- Stack Cache ----
// The stack_cache table stores pre-computed MIN/MAX of each score column per stack_id.
// This avoids expensive GROUP BY aggregation on every request.

let stackCacheInitPromise: Promise<void> | null = null;

export async function ensureStackCacheTable(): Promise<void> {
    if (stackCacheInitPromise) return stackCacheInitPromise;

    stackCacheInitPromise = (async () => {
        try {
            await query(`
                SELECT 1 FROM stack_cache WHERE 1=0
            `);
        } catch {
            // Table doesn't exist, create it
            try {
                await query(`
                    CREATE TABLE stack_cache (
                        stack_id INTEGER NOT NULL PRIMARY KEY,
                        image_count INTEGER DEFAULT 0,
                        rep_image_id INTEGER,
                        min_score_general DOUBLE PRECISION,
                        max_score_general DOUBLE PRECISION,
                        min_score_technical DOUBLE PRECISION,
                        max_score_technical DOUBLE PRECISION,
                        min_score_aesthetic DOUBLE PRECISION,
                        max_score_aesthetic DOUBLE PRECISION,
                        min_score_spaq DOUBLE PRECISION,
                        max_score_spaq DOUBLE PRECISION,
                        min_score_ava DOUBLE PRECISION,
                        max_score_ava DOUBLE PRECISION,
                        min_score_liqe DOUBLE PRECISION,
                        max_score_liqe DOUBLE PRECISION,
                        min_rating INTEGER,
                        max_rating INTEGER,
                        min_created_at TIMESTAMP,
                        max_created_at TIMESTAMP,
                        folder_id INTEGER
                    )
                `);
                console.log('[DB] Created stack_cache table');
            } catch (e2) {
                const errStr = String(e2);
                if (errStr.includes('RDB$RELATION_NAME') || errStr.includes('exists')) {
                    console.log('[DB] stack_cache table already exists (race condition ignored)');
                } else {
                    console.error('[DB] Failed to create stack_cache table:', e2);
                    // Reset promise on failure to allow retry
                    stackCacheInitPromise = null;
                    throw e2;
                }
            }
        }
    })();

    return stackCacheInitPromise;
}

export async function rebuildStackCache(): Promise<number> {
    await ensureStackCacheTable();

    // Clear existing cache
    await query('DELETE FROM stack_cache');

    // Populate from images table - only for actual stacks (stack_id IS NOT NULL)
    const sql = `
        INSERT INTO stack_cache (
            stack_id, image_count, rep_image_id, folder_id,
            min_score_general, max_score_general,
            min_score_technical, max_score_technical,
            min_score_aesthetic, max_score_aesthetic,
            min_score_spaq, max_score_spaq,
            min_score_ava, max_score_ava,
            min_score_liqe, max_score_liqe,
            min_rating, max_rating,
            min_created_at, max_created_at
        )
        SELECT
            i.stack_id,
            COUNT(*),
            MIN(i.id),
            MIN(i.folder_id),
            MIN(i.score_general), MAX(i.score_general),
            MIN(i.score_technical), MAX(i.score_technical),
            MIN(i.score_aesthetic), MAX(i.score_aesthetic),
            MIN(i.score_spaq), MAX(i.score_spaq),
            MIN(i.score_ava), MAX(i.score_ava),
            MIN(i.score_liqe), MAX(i.score_liqe),
            MIN(i.rating), MAX(i.rating),
            MIN(i.created_at), MAX(i.created_at)
        FROM images i
        WHERE i.stack_id IS NOT NULL
        GROUP BY i.stack_id
    `;

    await query(sql);

    // Update rep_image_id to be the image with the highest general score in each stack
    await query(`
        MERGE INTO stack_cache sc
        USING (
            SELECT i.stack_id, i.id as best_id
            FROM images i
            WHERE i.stack_id IS NOT NULL
              AND i.score_general = (
                  SELECT MAX(i2.score_general) FROM images i2 WHERE i2.stack_id = i.stack_id
              )
        ) src
        ON sc.stack_id = src.stack_id
        WHEN MATCHED THEN UPDATE SET sc.rep_image_id = src.best_id
    `);

    const countRows = await query<{ cnt: number }>('SELECT COUNT(*) as "cnt" FROM stack_cache');
    const count = countRows[0]?.cnt || 0;
    console.log(`[DB] Stack cache rebuilt: ${count} stacks cached`);
    return count;
}

export async function getStacks(options: StackQueryOptions = {}): Promise<any[]> {
    const { limit = 50, offset = 0, folderId, minRating, colorLabel, keyword, sortBy = 'score_general', order = 'DESC' } = options;

    await ensureStackCacheTable();

    const allowedSortColumns = [
        'id', 'created_at', 'score_general', 'score_technical', 'score_aesthetic',
        'score_spaq', 'score_ava', 'score_liqe',
        'rating', 'file_name'
    ];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'score_general';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    // Map sort column to cache column
    const cacheColMap: Record<string, string> = {
        'score_general': sortOrder === 'DESC' ? 'sc.max_score_general' : 'sc.min_score_general',
        'score_technical': sortOrder === 'DESC' ? 'sc.max_score_technical' : 'sc.min_score_technical',
        'score_aesthetic': sortOrder === 'DESC' ? 'sc.max_score_aesthetic' : 'sc.min_score_aesthetic',
        'score_spaq': sortOrder === 'DESC' ? 'sc.max_score_spaq' : 'sc.min_score_spaq',
        'score_ava': sortOrder === 'DESC' ? 'sc.max_score_ava' : 'sc.min_score_ava',
        'score_liqe': sortOrder === 'DESC' ? 'sc.max_score_liqe' : 'sc.min_score_liqe',
        'rating': sortOrder === 'DESC' ? 'sc.max_rating' : 'sc.min_rating',
        'created_at': sortOrder === 'DESC' ? 'sc.max_created_at' : 'sc.min_created_at',
    };

    const cacheSortCol = cacheColMap[sortColumn] || (sortOrder === 'DESC' ? 'sc.max_score_general' : 'sc.min_score_general');

    // Build query from cache + join to get rep image info
    const params: any[] = [];
    const whereParts: string[] = [];

    if (folderId) {
        whereParts.push('sc.folder_id = ?');
        params.push(folderId);
    }

    if (minRating !== undefined && minRating > 0) {
        whereParts.push('sc.max_rating >= ?');
        params.push(minRating);
    }

    const whereClause = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';

    params.push(offset, limit);

    // Query stacks from cache, join representative image
    const sql = `
        SELECT
            sc.stack_id,
            sc.stack_id as stack_key,
            sc.image_count,
            ${cacheSortCol} as sort_value,
            sc.rep_image_id,
            i.id,
            COALESCE(fp.path, i.file_path) as file_path,
            i.file_name,
            i.score_general,
            i.score_technical,
            i.score_aesthetic,
            i.score_spaq,
            i.score_ava,
            i.score_liqe,
            i.rating,
            i.label,
            i.created_at,
            i.thumbnail_path
        FROM stack_cache sc
        JOIN images i ON i.id = sc.rep_image_id
        LEFT JOIN file_paths fp ON i.id = fp.image_id AND fp.path_type = 'WIN'
        ${whereClause}
        ORDER BY ${cacheSortCol} ${sortOrder}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `;

    const rows = await query(sql, params);

    // Also fetch non-stacked images (stack_id IS NULL) as individual "stacks"
    // These are not in the cache, so query them directly
    const nonStackParams: any[] = [];
    const nonStackWhereParts: string[] = ['i.stack_id IS NULL'];

    if (folderId) {
        nonStackWhereParts.push('i.folder_id = ?');
        nonStackParams.push(folderId);
    }
    if (minRating !== undefined && minRating > 0) {
        nonStackWhereParts.push('i.rating >= ?');
        nonStackParams.push(minRating);
    }
    if (colorLabel) {
        nonStackWhereParts.push('i.label = ?');
        nonStackParams.push(colorLabel);
    }
    if (keyword) {
        nonStackWhereParts.push('i.keywords LIKE ?');
        nonStackParams.push(`%${keyword}%`);
    }

    const nonStackSortCol = allowedSortColumns.includes(sortBy) ? `i.${sortBy}` : 'i.score_general';

    const nonStackSql = `
        SELECT
            (-i.id) as stack_key,
            i.stack_id,
            1 as image_count,
            i.${sortColumn} as sort_value,
            i.id,
            COALESCE(fp.path, i.file_path) as file_path,
            i.file_name,
            i.score_general,
            i.score_technical,
            i.score_aesthetic,
            i.score_spaq,
            i.score_ava,
            i.score_liqe,
            i.rating,
            i.label,
            i.created_at,
            i.thumbnail_path
        FROM images i
        LEFT JOIN file_paths fp ON i.id = fp.image_id AND fp.path_type = 'WIN'
        WHERE ${nonStackWhereParts.join(' AND ')}
        ORDER BY ${nonStackSortCol} ${sortOrder}
    `;

    const nonStackRows = await query(nonStackSql, nonStackParams);

    // Merge and sort both lists together
    const combined = [...rows, ...nonStackRows];
    combined.sort((a: any, b: any) => {
        const aVal = a.sort_value ?? 0;
        const bVal = b.sort_value ?? 0;
        return sortOrder === 'DESC' ? (bVal - aVal) : (aVal - bVal);
    });

    // Apply pagination to the combined result
    return combined.slice(offset > 0 ? 0 : 0, limit);
}

export async function getImagesByStack(stackId: number | null, options: ImageQueryOptions = {}): Promise<any[]> {
    const { limit = 200, offset = 0, folderId, minRating, colorLabel, keyword, sortBy = 'score_general', order = 'DESC' } = options;
    const params: any[] = [];
    const whereParts: string[] = [];

    if (stackId !== null && stackId !== undefined) {
        whereParts.push('i.stack_id = ?');
        params.push(stackId);
    }

    if (folderId) {
        whereParts.push('i.folder_id = ?');
        params.push(folderId);
    }

    if (minRating !== undefined && minRating > 0) {
        whereParts.push('i.rating >= ?');
        params.push(minRating);
    }

    if (colorLabel) {
        whereParts.push('i.label = ?');
        params.push(colorLabel);
    }

    if (keyword) {
        whereParts.push('i.keywords LIKE ?');
        params.push(`%${keyword}%`);
    }

    const whereClause = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';

    const allowedSortColumns = [
        'id', 'created_at', 'score_general', 'score_technical', 'score_aesthetic',
        'score_spaq', 'score_ava', 'score_liqe',
        'rating', 'file_name'
    ];
    const sortColumn = allowedSortColumns.includes(sortBy) ? `i.${sortBy}` : 'i.score_general';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

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
            i.score_liqe,
            i.rating, 
            i.label, 
            i.created_at, 
            i.thumbnail_path,
            i.stack_id
        FROM images i
        LEFT JOIN file_paths fp ON i.id = fp.image_id AND fp.path_type = 'WIN'
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `;
    return query(sql, params);
}

export async function getStackCount(options: StackQueryOptions = {}): Promise<number> {
    const { folderId, minRating, colorLabel, keyword } = options;
    const params: any[] = [];
    const whereParts: string[] = [];

    if (folderId) {
        whereParts.push('i.folder_id = ?');
        params.push(folderId);
    }

    if (minRating !== undefined && minRating > 0) {
        whereParts.push('i.rating >= ?');
        params.push(minRating);
    }

    if (colorLabel) {
        whereParts.push('i.label = ?');
        params.push(colorLabel);
    }

    if (keyword) {
        whereParts.push('i.keywords LIKE ?');
        params.push(`%${keyword}%`);
    }

    const whereClause = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';

    const sql = `
        SELECT COUNT(*) as "count" FROM (
            SELECT COALESCE(i.stack_id, -i.id) as stack_key
            FROM images i
            ${whereClause}
            GROUP BY COALESCE(i.stack_id, -i.id)
        )
    `;

    const rows = await query<{ count: number }>(sql, params);
    return rows[0]?.count || 0;
}

export async function deleteImage(id: number): Promise<boolean> {
    // Note: This only deletes from the DB. Use with caution.
    // Real file deletion should probably happen too, but let's stick to DB for now as per plan.
    try {
        await query('DELETE FROM images WHERE id = ?', [id]);
        return true;
    } catch (e) {
        console.error('[DB] Delete failed:', e);
        return false;
    }
}
