# 08 - Python Pipeline Integration (Gradio & Headless)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Create an integration design plan between the Python backend (providing ML and parameter workflows) and the TypeScript Electron app. The integration enables sending single images or entire folders to the Python pipeline (for scoring, keyword tagging, clustering, etc.), real-time status updates via bidirectional WebSockets, and flexible deployment models including a headless API.

## Integration Modes

The system supports three operational modes, configurable from the Electron application menu:

| Mode | Python Process | Gradio UI | Electron Controls Pipeline | Pipeline Panel Visible |
|---|---|---|---|---|
| **1. Standalone** | Not managed by Electron (may or may not be running) | N/A | No | No (Hidden) |
| **2. Gradio UI** | Running externally or launched by Electron | Yes, at `:7860` | Yes, via WS/REST | Yes |
| **3. Headless** | Spawned by Electron as child process | No | Yes, via WS/REST + native panel | Yes (with settings) |

## Two-Way Communication Architecture & IPC

Communication is handled by a new `PipelineBridge` module in the Electron Main process, bridging the gap between the Renderer, the Firebird DB, and the Python backend.

### Bidirectional WebSocket Protocol

The primary channel is a persistent WebSocket (`/ws/updates`).
- **Inbound Commands (Electron -> Python):** JSON payloads with `action`, `request_id`, and `data` (e.g., `submit_image`, `start_clustering`). Handled by a new `CommandDispatcher` in Python.
- **Acknowledgements:** Unicast responses back to the original sender to confirm job start.
- **Broadcast Events:** Progress updates (`job_progress`), item updates (`image_updated`, `image_scored`), and completion notifications (`job_completed`).

### Real-time UI Refresh

When a data item (such as an image's score, tags, or cluster assignment) is updated by the Python pipeline, an enriched `image_updated` event is broadcast containing the full payload (scores, rating, label, keywords, thumbnail). 
The Electron Renderer intercepts this event. If the updated item is visible on screen, the UI patches the item data in-memory and re-renders the card instantly.

### Database Table as Fallback Queue (`INTEGRATION_QUEUE`)

In scenarios where the WebSocket is unstable or not yet connected, the Main process falls back to inserting jobs into a new `INTEGRATION_QUEUE` table.
- **Background Polling:** A new Python `queue_poller` daemon routinely polls this table to claim and dispatch pending requests to the appropriate runners.
- **State Sync:** The Electron app can also poll this table to verify queue status.

## UI Integration Points in Electron

1. **Pipeline Control Panel**
   - A dedicated, collapsible right-side or draggable panel for Mode 2/3.
   - Shows **Connection Status**, **Active Jobs** (with progress bars and cancel buttons), **Queue Status**, and **Pipeline Settings** (e.g., confidence thresholds, custom keywords, skip existing toggles).

2. **Application Menu**
   - An application menu standardizes switching between modes (Standalone / Gradio UI / Headless).

3. **Context Menus & Actions**
   - **Gallery Grid:** Right-click context menus to "Score/Tag/Run Full Pipeline" on single images.
   - **Folder Tree:** Right-click actions to "Score/Tag/Cluster/Run Full Pipeline" on entire folders.
   - **Image Viewer:** Detail panel actions to send the current image to the pipeline.

## End-to-End Data Flow

1. User right-clicks an image and selects "Score this image".
2. Renderer sends `ipcRenderer.invoke('send-to-pipeline', { targetPaths, jobType: 'score' })` to the Main process.
3. Main process uses `PipelineBridge` to send a WS action `{"action":"submit_image", ...}` to Python. (If WS is down, it writes to `INTEGRATION_QUEUE`).
4. Python's `CommandDispatcher` or `queue_poller` assigns the job to the `ScoringRunner`.
5. Python broadcasts `{"type":"job_progress", "data": ...}` over WS. Electron Main relays this via `pipeline:event` IPC to Renderer, which updates the Pipeline Control Panel progress bar.
6. Upon completion, Python updates the Firebird DB and broadcasts enriched `{"type":"image_updated", ...}`.
7. Renderer receives the event, patches local gallery state, and refreshes the updated image instantly.
