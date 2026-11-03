/**
 * Embed mode is on for any `?embed=` value another site puts there (`1`, `true`, `advisor`),
 * so a host page never shows the investor screen by mistake. Repeated keys: the first value wins.
 */
const OFF = new Set(["", "0", "false", "no", "off"]);

export function isEmbedded(value: string | string[] | undefined): boolean {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined) return false;
  return !OFF.has(first.trim().toLowerCase());
}
