---
description: Send a message to the Image Scoring agent via the Agent Mailbox
---

1. Send a message to the target agent. By default, this sends a test event to `image-scoring.agent`. Modify the payload as needed for your specific use case.

   ```
   mailbox_send(
       from="electron-gallery.agent",
       to="image-scoring.agent",
       type="event",
       payload={
           "event": "manual_test",
           "message": "Hello from manual workflow trigger"
       }
   )
   ```
