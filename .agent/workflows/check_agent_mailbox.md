---
description: Check the agent mailbox for new messages from other agents
---

1. Call `mailbox_receive` to get pending messages.
   - **agent_id**: `electron-gallery.agent`
   - **limit**: `5`

2. For each message received:
   - **Read** the `payload` to understand the request or notification.
   - **Execute** any necessary actions (e.g. updating local state, running a query).
   - **Acknowledge** the message to remove it from the queue.
     - Tool: `mailbox_ack`
     - Arguments: `agent_id='electron-gallery.agent'`, `message_id='<MESSAGE_ID>'`

3. If no messages are received, report "No new messages."
