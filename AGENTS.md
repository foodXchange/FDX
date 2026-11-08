# FDX.TRADING — Autonomous Model Routing & Token Saving Policy

1. **Always Use the Resilient AI Gateway**:
   - All AI features in `FDX.TRADING` must use `executeResilientTask` from `@/lib/ai/resilientGateway` or `generateGeminiWithFallback` from `@/lib/ai/models`.
   - Never hardcode single-key, single-model calls that can fail on `429 RESOURCE_EXHAUSTED` or `402` credit exhaustion.
2. **Automatic Task Tiering**:
   - `extract_quote`, `classify_intent`, `ocr_label`, `summarize_meeting`: Use `gemini-3.5-flash-lite` / `gemini-3.5-flash` with `thinkingLevel: "low"` and strict `application/json` output.
   - `match_suppliers`, `layered_analysis`, `negotiate_terms`: Use `thinkingLevel: "low"` by default, automatically falling back across the multi-key pool (`PRIMARY` -> `1ST_BACKUP` -> `2ND_BACKUP` -> `3RD_BACKUP`) and Flash-Lite models if tokens or quotas run low.
3. **Subagent Efficiency**:
   - When spawning subagents for codebase exploration or type-checking, set `Model: "flash"`.
