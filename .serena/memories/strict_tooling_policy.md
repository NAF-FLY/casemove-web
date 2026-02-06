# Strict Tooling Policy

The user explicitly demands the usage of **Serena MCP tools** for all file manipulations, code analysis, and refactoring tasks.

**Rule:**
- **NEVER** use standard `view_file`, `grep_search`, or `replace_file_content` if a Serena equivalent (`mcp_serena_*`) exists and is applicable.
- **ALWAYS** check for available Serena tools before planning a task.
- **ALWAYS** use `mcp_serena_search_for_pattern` instead of `grep_search`.
- **ALWAYS** use `mcp_serena_replace_content` or symbol-based edits instead of `replace_file_content`.

**Reasoning:**
- Serena tools provide safer, context-aware, and project-aligned operations that respect the monorepo structure and user preferences.
- Failure to use Serena tools is considered a critical workflow violation.
