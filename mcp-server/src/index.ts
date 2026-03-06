#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from 'url';
import fs from "fs/promises";
import path from "path";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize server
const server = new Server(
    {
        name: "electron-debug-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define paths
const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const LOGS_DIR = path.join(APPDATA, 'electron-gallery');
const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'config.json');

// Helper to get latest log file
async function getLatestLogFile(): Promise<string | null> {
    try {
        const files = await fs.readdir(LOGS_DIR);
        const logFiles = files.filter(f => f.startsWith('session_') && f.endsWith('.log'));
        if (logFiles.length === 0) return null;

        // Sort by name (which has YYYY-MM-DD date) descending
        logFiles.sort((a, b) => b.localeCompare(a));
        return path.join(LOGS_DIR, logFiles[0]);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw err;
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_electron_logs",
                description: "Read the latest Electron app session logs. Optionally specify lines to read.",
                inputSchema: {
                    type: "object",
                    properties: {
                        lines: {
                            type: "number",
                            description: "Number of lines from the end of the file to return (default 100).",
                        },
                    },
                },
            },
            {
                name: "get_electron_config",
                description: "Read the config.json file from the root of the project.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_system_stats",
                description: "Get current system statistics (CPU, memory, uptime) for debugging.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "get_electron_logs") {
            const logFile = await getLatestLogFile();
            if (!logFile) {
                return {
                    content: [{ type: "text", text: `No log files found in ${LOGS_DIR}` }],
                };
            }

            const content = await fs.readFile(logFile, 'utf-8');
            const lines = content.split('\n');
            const numLines = (args as Record<string, unknown>)?.lines as number || 100;
            const tailLines = lines.slice(-numLines).join('\n');

            return {
                content: [{ type: "text", text: `Displaying last ${numLines} lines of ${logFile}:\n...\n${tailLines}` }],
            };
        }

        if (name === "get_electron_config") {
            try {
                const config = await fs.readFile(CONFIG_PATH, 'utf-8');
                return {
                    content: [{ type: "text", text: `Config file at ${CONFIG_PATH}:\n${config}` }],
                };
            } catch (err: unknown) {
                if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                    return {
                        content: [{ type: "text", text: `No config.json found at expected path: ${CONFIG_PATH}` }],
                    };
                }
                throw err;
            }
        }

        if (name === "get_system_stats") {
            const stats = {
                platform: os.platform(),
                release: os.release(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMemoryGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
                freeMemoryGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
                uptimeSeconds: Math.floor(os.uptime()),
            };

            return {
                content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
            };
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error: unknown) {
        return {
            content: [{ type: "text", text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Electron Debug MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
