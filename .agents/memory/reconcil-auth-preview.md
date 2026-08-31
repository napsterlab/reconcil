---
name: Session-gated preview requests
description: Prevent authenticated API requests from racing the session bootstrap in the proxied web preview.
---

Authenticated client data should not mount until the session bootstrap has completed. Browsers can start sibling queries before the HTTP-only cookie returned by the bootstrap request is available, producing transient 401s and misleading empty states.

**Why:** The proxied preview can render the shell and its child pages in the same pass; parallel queries may otherwise race the first session response even though the API and credentials are healthy.

**How to apply:** Gate the authenticated page tree on the current-session query, send credentials on same-origin API requests, and keep a clear expired-session state that routes back to login.