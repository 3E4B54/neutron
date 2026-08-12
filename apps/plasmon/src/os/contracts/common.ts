export type NodeId = string;
export type ProcessId = string;
export type WindowId = string;
export type HandlerId = string;
export type ShareId = string;
export type Revision = bigint;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Presentation-neutral icon reference. Consumers decide how a URI, packaged
 * asset path, or stable symbolic system icon is rendered.
 */
export type IconRef = string;
