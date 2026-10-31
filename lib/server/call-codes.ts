import { createHash, randomInt } from "node:crypto";

/** No 0, 1, I, L or O: a code is typed from a message by a person. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 12;

export function generateCode(): string {
  let raw = "";
  for (let i = 0; i < LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return formatCode(raw);
}

export const formatCode = (raw: string) => raw.match(/.{1,4}/g)!.join("-");

/** Upper case, dashes and spaces ignored. Returns null when it cannot be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.toUpperCase().replace(/[\s-]/g, "");
  if (raw.length !== LENGTH) return null;
  for (const ch of raw) if (!ALPHABET.includes(ch)) return null;
  return raw;
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Only hashes of the codes are kept in the repository. A hash of a 60-bit random code cannot be turned back into it. */
export const hashCode = (normalized: string) => sha256(`code:${normalized}`);
