/**
 * TypeScript interfaces for the Python backend REST API.
 * Mirrors the FastAPI Pydantic models in modules/api.py.
 */

// ── Standard response envelope ──────────────────────────────────────────────

export interface ApiResponse {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
}

// ── Health & Status ─────────────────────────────────────────────────────────

export interface HealthResponse {
    status: string;
    scoring_available: boolean;
    tagging_available: boolean;
    clustering_available: boolean;
}

export interface StatusResponse {
    is_running: boolean;
    status_message: string;
    progress: { current: number; total: number };
    log: string;
    job_type?: string | null;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoringStartRequest {
    input_path: string;
    skip_existing?: boolean;
    force_rescore?: boolean;
}

export interface SingleImageRequest {
    file_path: string;
}

// ── Tagging ─────────────────────────────────────────────────────────────────

export interface TaggingStartRequest {
    input_path: string;
    custom_keywords?: string[] | null;
    overwrite?: boolean;
    generate_captions?: boolean;
}

export interface TaggingSingleRequest {
    file_path: string;
    custom_keywords?: string[] | null;
    generate_captions?: boolean;
}

// ── Clustering ──────────────────────────────────────────────────────────────

export interface ClusteringStartRequest {
    input_path?: string | null;
    threshold?: number | null;
    time_gap?: number | null;
    force_rescan?: boolean;
}

// ── Duplicates ──────────────────────────────────────────────────────────────

export interface FindDuplicatesRequest {
    threshold?: number | null;
    folder_path?: string | null;
    limit?: number | null;
}

// ── Similar Images ──────────────────────────────────────────────────────────

export interface SimilarSearchParams {
    image_id: number;
    limit?: number;
    folder_path?: string;
    min_similarity?: number;
}

export interface SimilarSearchResult {
    query_image_id: number;
    results: Array<{
        image_id: number;
        file_path: string;
        similarity: number;
        [key: string]: unknown;
    }>;
    count: number;
}

// ── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineSubmitRequest {
    input_path: string;
    operations?: string[];
    skip_existing?: boolean;
    custom_keywords?: string[] | null;
    generate_captions?: boolean;
    clustering_threshold?: number | null;
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export interface JobInfo {
    job_id: string | number;
    job_type: string;
    status: string;
    created_at?: string;
    completed_at?: string;
    progress?: { current: number; total: number };
    [key: string]: unknown;
}

// ── Stats ───────────────────────────────────────────────────────────────────

export interface DatabaseStats {
    total_images: number;
    by_rating: Record<string, number>;
    by_label: Record<string, number>;
    score_distribution: Record<string, number>;
    average_scores: Record<string, number>;
    total_folders: number;
    total_stacks: number;
    jobs_by_status: Record<string, number>;
    images_today: number;
    error?: string;
    [key: string]: unknown;
}
