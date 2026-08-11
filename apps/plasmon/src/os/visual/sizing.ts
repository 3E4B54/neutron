export type IconContext =
  | "desktop"
  | "file-grid"
  | "file-list"
  | "start"
  | "search"
  | "taskbar"
  | "titlebar"
  | "context-menu"
  | "properties";

export interface IconContextSizeTokens {
  frame: string;
  artwork: string;
}

/**
 * Contexts map to semantic CSS tokens; the actual numeric sizes live only in
 * integration/visual-tokens.scss so component code cannot drift from them.
 */
export const ICON_CONTEXT_SIZE_TOKENS: Readonly<Record<IconContext, IconContextSizeTokens>> = Object.freeze({
  desktop: Object.freeze({ frame: "--plasmon-icon-desktop-frame", artwork: "--plasmon-icon-desktop-art" }),
  "file-grid": Object.freeze({ frame: "--plasmon-icon-grid-frame", artwork: "--plasmon-icon-grid-art" }),
  "file-list": Object.freeze({ frame: "--plasmon-icon-list-frame", artwork: "--plasmon-icon-list-art" }),
  start: Object.freeze({ frame: "--plasmon-icon-start-frame", artwork: "--plasmon-icon-start-art" }),
  search: Object.freeze({ frame: "--plasmon-icon-search-frame", artwork: "--plasmon-icon-search-art" }),
  taskbar: Object.freeze({ frame: "--plasmon-icon-taskbar-frame", artwork: "--plasmon-icon-taskbar-art" }),
  titlebar: Object.freeze({ frame: "--plasmon-icon-titlebar-frame", artwork: "--plasmon-icon-titlebar-art" }),
  "context-menu": Object.freeze({ frame: "--plasmon-icon-context-frame", artwork: "--plasmon-icon-context-art" }),
  properties: Object.freeze({ frame: "--plasmon-icon-properties-frame", artwork: "--plasmon-icon-properties-art" }),
});

export type IconContextCssVariables = {
  "--plasmon-icon-frame-size": string;
  "--plasmon-icon-art-size": string;
};

export function iconContextCssVariables(context: IconContext): IconContextCssVariables {
  const tokens = ICON_CONTEXT_SIZE_TOKENS[context];
  return {
    "--plasmon-icon-frame-size": `var(${tokens.frame})`,
    "--plasmon-icon-art-size": `var(${tokens.artwork})`,
  };
}
