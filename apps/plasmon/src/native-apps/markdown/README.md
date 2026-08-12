# Markdown editor

Markdown is a Plasmon native document application built on the shared Monaco editor surface/document session from `../text/` plus a sanitized rendered preview.

`MarkdownEditor.tsx` coordinates edit/split/preview presentation. `MarkdownPreview.tsx` and `render.ts` own rendered Markdown presentation/sanitization. Loading, dirty state, save/conflict behavior, and persistence reuse the shared document-session infrastructure.

## Refactor direction

Keep Markdown-specific concerns limited to Markdown modes/rendering and commands. Editor engine lifecycle, filesystem document persistence, conflict handling, and common editor chrome should stay shared with Text/other document applications.

If formatting or richer Markdown tooling is added, expose it through reusable command models rather than embedding one-off keyboard/UI logic throughout the component.

## Testing

Use fast tests for rendering/sanitization, mode visibility, Markdown commands, and shared document semantics. Use real-browser/package tests for Monaco/workers, split-pane focus/layout, editor commands, and rendered-link/browser behavior where DOM/engine behavior matters.
