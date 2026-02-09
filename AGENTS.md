# AI Agents Configuration: Electron Gallery

This document describes the AI agent integration for the Electron Image Scoring Gallery.

## Overview
This project is optimized for AI-assisted development using Cursor IDE and Antigravity. It leverages MCP (Model Context Protocol) to provide agents with deep visibility into the shared scoring database.

## MCP Configuration
The `.cursor/mcp.json` file configures the `image-scoring` MCP server. This allows AI agents to query the Firebird database directly for debugging purposes.

### Requirements
- Python environment with `mcp` and `firebird-driver` (typically inherited from the core `image-scoring` project).
- Access to the `SCORING_HISTORY.FDB` file.

## Tools for Agents
Agents have access to specialized tools via the `image-scoring` MCP server:
- **Database Analysis**: Query images, check health, run SQL.
- **System Monitoring**: Check GPU and model status.
- **Error Diagnosis**: Analyze failed jobs and missing data.

## Documentation References
- **[.cursorrules](.cursorrules)**: Core project rules and architecture patterns.
- **[Project Guide](.agent/PROJECT_GUIDE.md)**: Navigation and maintenance guide.
- **[AI Edit Spec](.agent/ai_edit_spec.md)**: Coding guidelines for agents.
