---
name: firebird-db
description: Firebird database schema, scoring models, query patterns, and connection configuration for the image scoring database.
---

# Firebird Database & Scoring Schema

## Connection

The app connects to a Firebird SQL server via `node-firebird`. Configuration is in `config.json`:

```json
{
    "database": {
        "host": "127.0.0.1",
        "port": 3050,
        "user": "sysdba",
        "password": "masterkey",
        "path": "../image-scoring/SCORING_HISTORY.FDB"
    }
}
```

> [!IMPORTANT]
> Firebird requires a **running server process** — it cannot open `.FDB` files directly. Start the server with `run_firebird.bat` in the `image-scoring` project before launching the app.

## Database Schema

The primary table is `SCORED_IMAGES` with these key columns:

### Identity & Metadata
| Column | Type | Description |
|--------|------|-------------|
| `ID` | INTEGER | Primary key |
| `FILE_PATH` | VARCHAR | Full file path (WSL format: `/mnt/d/...`) |
| `FILE_NAME` | VARCHAR | Filename only |
| `FOLDER_ID` | INTEGER | FK to folders |
| `THUMBNAIL_PATH` | VARCHAR | Path to thumbnail |
| `CREATED_AT` | TIMESTAMP | When record was added |

### Scoring Columns (normalized 0.0–1.0)
| Column | Model | Weight in Formulas |
|--------|-------|-------------------|
| `SCORE_LIQE` | LIQE | Primary in General & Aesthetic |
| `SCORE_AVA` | AVA | Primary in General & Aesthetic |
| `SCORE_SPAQ` | SPAQ | Primary in General & Technical |
| `SCORE_KONIQ` | KoNIQ (legacy) | Deprecated |
| `SCORE_PAQ2PIQ` | PaQ2PiQ (legacy) | Deprecated |

### Composite Scores (normalized 0.0–1.0)
| Column | Formula |
|--------|---------|
| `SCORE_GENERAL` | Weighted blend of LIQE + AVA + SPAQ |
| `SCORE_TECHNICAL` | Primarily SPAQ-based |
| `SCORE_AESTHETIC` | Primarily LIQE + AVA based |

### Classification
| Column | Type | Values |
|--------|------|--------|
| `RATING` | INTEGER | 0–5 stars |
| `LABEL` | VARCHAR | `Red`, `Yellow`, `Green`, `Blue`, `Purple`, or NULL |
| `KEYWORDS` | VARCHAR | Comma-separated tags |
| `TITLE` | VARCHAR | Optional title |
| `DESCRIPTION` | VARCHAR | Optional description |

### Stacks
| Column | Type | Description |
|--------|------|-------------|
| `STACK_ID` | INTEGER | Stack group ID |
| `STACK_KEY` | INTEGER | Stack group key |

## Query Patterns

All DB operations are in `electron/db.ts`. The core helper:

```typescript
async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await connectDB();
    return new Promise((resolve, reject) => {
        database.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result as T[]);
        });
    });
}
```

### Filtering Pattern (used by `getImages`, `getImageCount`)

```typescript
const conditions: string[] = [];
const params: any[] = [];

if (options.folderId) {
    conditions.push('FOLDER_ID = ?');
    params.push(options.folderId);
}
if (options.minRating) {
    conditions.push('RATING >= ?');
    params.push(options.minRating);
}
// ... build WHERE clause from conditions array
const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
```

### Firebird SQL Dialect Notes

- Use `FIRST n SKIP m` instead of `LIMIT/OFFSET`:
  ```sql
  SELECT FIRST 50 SKIP 0 * FROM SCORED_IMAGES ORDER BY SCORE_GENERAL DESC
  ```
- String comparisons are case-sensitive by default
- Use `CONTAINING` for case-insensitive substring matching (Firebird-specific)
- Parameterized queries use `?` placeholders

## Available Functions

| Function | Purpose |
|----------|---------|
| `getImages(options)` | Paginated image list with filtering/sorting |
| `getImageCount(options)` | Count matching current filters |
| `getImageDetails(id)` | Full record for one image |
| `updateImageDetails(id, updates)` | Update rating, label, title, etc. |
| `deleteImage(id)` | Remove DB record (not file) |
| `getFolders()` | Folder tree from DB |
| `getKeywords()` | Distinct keyword list |
| `getStacks(options)` | Paginated stack list |
| `getImagesByStack(stackId, options)` | Images within a stack |
| `getStackCount(options)` | Count of stacks |

## Relationship to image-scoring Project

The Firebird database (`SCORING_HISTORY.FDB`) is **owned by** the Python `image-scoring` project at `d:\Projects\image-scoring`. That project:
- Runs neural network models (MUSIQ family, LIQE) on images
- Writes raw scores to the database
- Manages the Firebird server process
- Provides the `run_firebird.bat` launcher

This Electron app is a **read-heavy** frontend that queries the same database. Write operations are limited to metadata edits (rating, label, title, description) and record deletion.
