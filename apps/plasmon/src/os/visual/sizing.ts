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

export interface IconContextSize {
  frame: number;
  artwork: number;
}

export const ICON_CONTEXT_SIZES: Readonly<Record<IconContext, IconContextSize>> = Object.freeze({
  desktop: Object.freeze({ frame: 48, artwork: 42 }),
  "file-grid": Object.freeze({ frame: 44, artwork: 38 }),
  "file-list": Object.freeze({ frame: 26, artwork: 22 }),
  start: Object.freeze({ frame: 32, artwork: 28 }),
  search: Object.freeze({ frame: 30, artwork: 26 }),
  taskbar: Object.freeze({ frame: 30, artwork: 26 }),
  titlebar: Object.freeze({ frame: 18, artwork: 16 }),
  "context-menu": Object.freeze({ frame: 20, artwork: 16 }),
  properties: Object.freeze({ frame: 56, artwork: 46 }),
});

export type IconContextCssVariables = {
  "--plasmon-icon-frame-size": string;
  "--plasmon-icon-art-size": string;
};

export function iconContextCssVariables(context: IconContext): IconContextCssVariables {
  const size = ICON_CONTEXT_SIZES[context];
  return {
    "--plasmon-icon-frame-size": `${size.frame}px`,
    "--plasmon-icon-art-size": `${size.artwork}px`,
  };
}
