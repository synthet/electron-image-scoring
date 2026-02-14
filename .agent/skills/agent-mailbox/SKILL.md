---
name: agent-mailbox
description: Cross-agent messaging via the MCP Agent Mailbox bridge. Notify the image-scoring project about Firebird DB or Electron app changes.
---

# Agent Mailbox — Cross-Project Notifications

The **agent-mailbox** MCP server is a durable message bridge between agents running in different IDEs (Cursor, Antigravity, etc.). Use it to notify the `image-scoring` project when this Electron app makes changes to the shared Firebird database.

## Architecture

```
┌─────────────────────────┐     HTTP      ┌──────────────────────────┐
│ Antigravity             │──POST /mcp──►│ agent-mailbox server     │
│ (electron-image-scoring)│◄─────────────│ http://127.0.0.1:8787    │
│ (electron-gallery.agent)│               │ SQLite-backed mailbox.db │
└─────────────────────────┘               └──────────────────────────┘
                                                    ▲
┌─────────────────────────┐     HTTP               │
│ Cursor                  │──POST /mcp─────────────┘
│ (image-scoring.agent)   │

└─────────────────────────┘
```

**Server location:** `d:\Projects\mcp-agent-mailbox`  
**Endpoint:** `http://127.0.0.1:8787/mcp`  
**Start command:** `npm run dev` in the mailbox project directory

## MCP Config (already configured)

In `mcp_config.json`:
```json
"agent-mailbox": {
    "serverUrl": "http://127.0.0.1:8787/mcp",
    "transport": "http",
    "disabled": false
}
```

## Available Tools

| Tool | Purpose |
|------|---------|
| `mailbox_send` | Send a message to another agent |
| `mailbox_receive` | Receive up to N leased messages (non-blocking) |
| `mailbox_wait` | Long-poll until a message arrives or timeout |
| `mailbox_ack` | Acknowledge (mark done) a received message |
| `mailbox_nack` | Re-queue (release lease on) a message |

## Agent Identity Convention

| Agent ID | IDE | Project |
|----------|-----|---------|
| `electron-gallery.agent` | Antigravity | `electron-image-scoring` |
| `image-scoring.agent` | Cursor | `image-scoring` |

## When to Send Notifications

### 1. After Database Writes

When this Electron app modifies the Firebird DB (rating, label, title, description, or record deletion), notify the scoring project:

```
mailbox_send(
    from: "electron-gallery.agent",
    to:   "image-scoring.agent",
    type: "db_change",
    payload: {
        "action": "update_image",
        "image_id": 12345,
        "fields_changed": ["rating", "label"],
        "new_values": { "rating": 4, "label": "Green" }
    }
)
```

### 2. After Deleting Images

```
mailbox_send(
    from: "electron-gallery.agent",
    to:   "image-scoring.agent",
    type: "db_change",
    payload: {
        "action": "delete_image",
        "image_id": 12345,
        "file_path": "/mnt/d/Photos/example.jpg"
    }
)
```

### 3. After Electron App Code Changes

When making significant changes to how the Electron app interacts with the DB:

```
mailbox_send(
    from: "electron-gallery.agent",
    to:   "image-scoring.agent",
    type: "code_change",
    payload: {
        "project": "electron-image-scoring",
        "summary": "Added new SPAQ filter to gallery sort options",
        "files_changed": ["electron/db.ts", "src/App.tsx"],
        "impact": "New WHERE clause on SCORE_SPAQ column"
    }
)
```

## Receiving Messages (from image-scoring project)

Poll for incoming messages from the scoring engine:

```
mailbox_receive(agent_id: "electron-gallery.agent", limit: 5)
```

Or long-poll (blocks until a message arrives or timeout):

```
mailbox_wait(agent_id: "electron-gallery.agent", timeout_ms: 30000)
```

After processing a message, always acknowledge it:

```
mailbox_ack(agent_id: "electron-gallery.agent", message_id: "<received_msg_id>")
```

## Message Lifecycle

1. **Sent** → status = `pending`
2. **Received/leased** → status = `leased` (30s visibility timeout)
3. **Acked** → status = `acked` (done, won't be re-delivered)
4. **Nacked or lease expired** → back to `pending` (re-delivered)

## Correlation IDs

Use `correlation_id` for request/response patterns:

```
# Send a request
mailbox_send(
    from: "electron-gallery.agent",
    to: "image-scoring.agent",
    type: "query",
    correlation_id: "req-001",
    payload: { "question": "What models are currently active?" }
)

# Later, receive the response matched by correlation_id
mailbox_wait(agent_id: "electron-gallery.agent")
# → match response.correlation_id == "req-001"
```

## Troubleshooting

1. **Server not running**: Start with `npm run dev` in `d:\Projects\mcp-agent-mailbox`
2. **Connection refused**: Check port 8787 is not blocked by firewall
3. **Messages not arriving**: Verify agent IDs match between sender and receiver
4. **Message re-delivered**: You forgot to `mailbox_ack` — always ack after processing
