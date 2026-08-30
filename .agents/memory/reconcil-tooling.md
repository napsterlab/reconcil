---
name: Reconcil tooling compatibility
description: Compatibility note for the generated API validation layer in this workspace.
---

Orval 8 can infer Zod 4 syntax from its default behavior even when the workspace pins Zod 3. Set the Zod generator override version to the numeric value 3 when regenerating contracts in this workspace.

**Why:** The generated schemas otherwise use top-level helpers such as `zod.email()` and `zod.int()`, which are not available in the installed Zod 3 package.

**How to apply:** Keep the compatibility setting in the Orval config and rerun codegen after any OpenAPI change.