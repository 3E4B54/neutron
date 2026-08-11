# Browser

The Browser native app handles HTTP(S) URL targets and Plasmon/Windows-style
`.url` resources through the normal association/open path.

`url.ts` resolves direct URL targets and parsed shortcut URLs, accepts only
HTTP(S), and rejects unsafe schemes. External navigation opens a new browser
context with `noopener,noreferrer`.

This app does not own generic shortcut dereference, file associations, or
Kernel Element opening. Those remain shared OS services.

Tests: `url.test.ts`.
