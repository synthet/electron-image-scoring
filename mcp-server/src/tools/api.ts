import { resolveApiUrl } from "../utils/config.js";

interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

interface ToolResult {
    [key: string]: unknown;
    content: { type: string; text: string }[];
    isError?: boolean;
}

async function apiFetch(path: string, timeout = 5000): Promise<unknown> {
    const baseUrl = await resolveApiUrl();
    const url = `${baseUrl}${path}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!resp.ok) throw new Error(`API ${resp.status}: ${resp.statusText}`);
    return resp.json();
}

export const apiToolDefs: ToolDef[] = [
    {
        name: "api_health",
        description:
            "Check if the Python scoring backend (FastAPI) is running. Returns health status, loaded models, and GPU availability.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "api_job_status",
        description:
            "Get recent background jobs (scoring, tagging, clustering) or details of a specific job by ID.",
        inputSchema: {
            type: "object",
            properties: {
                job_id: {
                    type: "string",
                    description: "Optional job ID to get details for a specific job. Omit to list recent jobs.",
                },
            },
        },
    },
    {
        name: "api_runner_status",
        description:
            "Get the current status of all background runners (scoring, tagging, clustering) — whether they are idle, running, or errored, and their progress.",
        inputSchema: { type: "object", properties: {} },
    },
];

export async function handleApiTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
        if (name === "api_health") {
            const [health, status] = await Promise.allSettled([
                apiFetch("/api/health"),
                apiFetch("/api/status"),
            ]);

            const result: Record<string, unknown> = {};
            if (health.status === "fulfilled") result.health = health.value;
            else result.health_error = health.reason?.message;
            if (status.status === "fulfilled") result.status = status.value;
            else result.status_error = status.reason?.message;

            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        if (name === "api_job_status") {
            const jobId = args?.job_id as string | undefined;
            if (jobId) {
                const job = await apiFetch(`/api/jobs/${encodeURIComponent(jobId)}`);
                return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
            }
            const jobs = await apiFetch("/api/jobs/recent");
            return { content: [{ type: "text", text: JSON.stringify(jobs, null, 2) }] };
        }

        if (name === "api_runner_status") {
            const [scoring, tagging, clustering] = await Promise.allSettled([
                apiFetch("/api/scoring/status"),
                apiFetch("/api/tagging/status"),
                apiFetch("/api/clustering/status"),
            ]);

            const result: Record<string, unknown> = {};
            for (const [key, settled] of [["scoring", scoring], ["tagging", tagging], ["clustering", clustering]] as const) {
                if (settled.status === "fulfilled") result[key] = settled.value;
                else result[key] = { error: (settled as PromiseRejectedResult).reason?.message };
            }

            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        throw new Error(`Unknown API tool: ${name}`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
            return {
                content: [{ type: "text", text: `Backend API is not reachable. Is the Python server running?\nError: ${msg}` }],
                isError: true,
            };
        }
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
    }
}
