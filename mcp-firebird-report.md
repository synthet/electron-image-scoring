## MCP Firebird / Database Health Report

### Overview

- **MCP server**: `mcp-firebird` v2.6.0 (stdio transport).
- **Environment**: Node.js v22.20.0, win32, x64.
- **Driver**: Pure JavaScript Firebird driver (`driverType: "pure-js"`), wire encryption disabled.

### Connection & Schema

- Connected to Firebird on **localhost:3050**.
- Detected **9 user tables**:
  - `CLUSTER_PROGRESS`
  - `CULLING_PICKS`
  - `CULLING_SESSIONS`
  - `FILE_PATHS`
  - `FOLDERS`
  - `IMAGES`
  - `JOBS`
  - `STACKS`
  - `STACK_CACHE`

### System Health

- `system-health-check` result: **status: healthy**.
- MCP server uptime and memory usage are within normal bounds.
- Confirms that the MCP server can reach the Firebird database and perform basic operations.

### Security / Wire Encryption

- `verify-wire-encryption`:
  - `hasNativeDriver: false`
  - `wireEncryptionEnabled: false`
  - Recommendation: To enable encrypted wire protocol, install `node-firebird-driver-native` and set `USE_NATIVE_DRIVER=true` (optional; current setup is functional but unencrypted).

### Diagnostics Notes

- `get-database-info` confirms the table list and driver configuration as above.
- `list-tables` returns the same 9 user tables, consistent with the application’s expected schema.
- `analyze-table-statistics` on `IMAGES` failed with:
  - `Dynamic SQL Error, SQL error code = -104, Token unknown - line 1, column 20, ROW_COUNT`
  - This indicates a **query compatibility issue** in that tool (likely Firebird version vs. SQL dialect), not a structural database corruption.

### Summary

- MCP Firebird is **properly onboarded and operational**, with stable connectivity to the scoring database and all core metadata/health tools working.
- The database appears **structurally sound and reachable**, with the expected tables present.
- One advanced diagnostic (`analyze-table-statistics` for `IMAGES`) currently fails due to a SQL token (`ROW_COUNT`) issue; all other tested diagnostics succeed, so this is best treated as a tool-compatibility bug rather than a database integrity problem.

## Extended Investigation (Schema & Data Checks)

### Key Table Schemas

- **IMAGES**:
  - Primary key: `ID` (INTEGER, not null).
  - Important columns: `JOB_ID`, `FILE_PATH`, `FILE_NAME`, `FOLDER_ID`, `STACK_ID`, multiple score columns (`SCORE_*`), metadata blobs, `THUMBNAIL_PATH`, `RATING`, `LABEL`, `CREATED_AT`, `CULL_DECISION`, `CULL_POLICY_VERSION`.
- **FILE_PATHS**:
  - Primary key: `ID`.
  - Relationship column: `IMAGE_ID` (nullable), with path and verification metadata (`PATH`, `LAST_SEEN`, `PATH_TYPE`, `IS_VERIFIED`, `VERIFICATION_DATE`).
- **FOLDERS**:
  - Primary key: `ID`.
  - Path hierarchy columns: `PATH`, `PARENT_ID`, plus flags like `IS_FULLY_SCORED`, `IS_KEYWORDS_PROCESSED` and `CREATED_AT`.
- **JOBS**:
  - Primary key: `ID`.
  - Job metadata: `INPUT_PATH`, `STATUS`, `CREATED_AT`, `COMPLETED_AT`, `LOG`.

No field-level descriptions are stored in the database for `IMAGES` (all `description` entries are null), so column meaning is inferred from naming.

### Row Counts (Verified)

Using `execute-batch-queries`:

- `IMAGES`: **43,389** rows.
- `FILE_PATHS`: **49,901** rows.
- `JOBS`: **220** rows (latest job ID 221 is present when queried directly, consistent with prior report).

These counts align with the earlier diagnostics report and confirm a large but coherent dataset.

### Recent Job Activity

Using `execute-query` on `JOBS`:

| ID  | Input Path         | Status     | Created At                  | Completed At                |
|-----|--------------------|-----------|-----------------------------|-----------------------------|
| 221 | D:\Photos\D90\     | completed | 2026-02-25T04:42:37.663Z   | 2026-02-25T06:15:06.394Z   |
| 220 | D:\Photos\Z90\     | completed | 2026-02-25T04:41:55.636Z   | 2026-02-25T04:41:55.757Z   |
| 219 | D:\Photos\Z6ii\    | completed | 2026-02-25T01:27:42.019Z   | 2026-02-25T03:34:24.824Z   |
| 218 | D:\Photos\Z8\      | completed | 2026-02-24T04:58:58.153Z   | 2026-02-24T06:40:53.223Z   |
| 217 | D:\Photos\Z8\      | completed | 2026-02-24T04:04:48.841Z   | 2026-02-24T04:19:57.846Z   |

This confirms recent scoring jobs completed successfully for multiple camera folders, with realistic processing durations.

### Index Recommendations (Read-Only Analysis)

Using `analyze-missing-indexes` on a representative join query between `IMAGES` and `FILE_PATHS`:

- Suggested indexes:
  - `CREATE INDEX IDX_IMAGES_I.FOLDER_ID ON IMAGES (I.FOLDER_ID);`
  - `CREATE INDEX IDX_IMAGES_ORDER_I.ID ON IMAGES (I.ID);`
- Interpretation:
  - An index on `IMAGES(FOLDER_ID)` would improve folder-based filtering (very relevant for the gallery UI).
  - An index on `IMAGES(ID)` would improve ordering by ID when paginating recent items.

**Note**: These are *recommendations only* and have **not** been applied; any index creation should be coordinated with the core Image Scoring project to avoid unexpected performance or storage side effects.


