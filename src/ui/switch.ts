/**
 * The HTML `switch` attribute on a checkbox, which React's types don't know yet. Where it is supported
 * the browser exposes the control as a switch itself; elsewhere role="switch" and the .switch styles
 * give the same result, so no polyfill is loaded.
 */
export const NATIVE_SWITCH = { switch: '' } as Record<string, string>;
