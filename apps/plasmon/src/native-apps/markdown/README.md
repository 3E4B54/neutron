# Markdown editor

Markdown is a Plasmon native document application built on the shared Monaco
surface from `../text/` and a sanitized rendered preview.

- Edit mode shows Monaco.
- Split mode shows Monaco and rendered preview together.
- Preview mode shows the rendered document.
- `render.ts` uses Marked output passed through the sanitizer policy.
- Saving/reopening uses the shared FsService document session.

## Product acceptance

The editor window title should be `<filename> - Monaco Editor`. Runtime
readiness must follow successful `monaco.editor.create`, not merely source
loading.

The mature desktop UI should expose discoverable controls/menu items for
supported editor capabilities in addition to keyboard shortcuts. The current
MVP also requires a formatter action comparable to the accepted daedalOS
workflow.

User-configurable Monaco setup/preferences and packaged engine resources should
be represented under `/System/Program Files/MonacoEditor`, not an empty
placeholder.

Tests: `markdown.test.ts` plus shared Text/Monaco tests and packaged browser
coverage.
