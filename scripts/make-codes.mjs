#!/usr/bin/env node
/**
 * Make one-time call codes.
 *
 *   node scripts/make-codes.mjs 50 /path/outside/the/repo/codes.txt   writes the codes to that file, hashes to the repo
 *   node scripts/make-codes.mjs --hash ABCD-EFGH-JKMN                 prints the hash of one code
 *
 * Only hashes go into the repository (lib/server/call-code-hashes.json). The plain codes are for you to send out and
 * must never be committed. The algorithm must match lib/server/call-codes.ts.
 */
import { createHash, randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const hash = (normalized) => createHash("sha256").update(`code:${normalized}`).digest("hex");
const normalize = (s) => s.toUpperCase().replace(/[\s-]/g, "");
const make = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("").match(/.{4}/g).join("-");

const [a, b] = process.argv.slice(2);
if (a === "--hash") {
  console.log(hash(normalize(b ?? "")));
  process.exit(0);
}
const count = Number(a);
if (!Number.isInteger(count) || count < 1 || count > 500 || !b) {
  console.error("usage: node scripts/make-codes.mjs <count 1-500> <output file outside the repo>");
  process.exit(1);
}
const listPath = fileURLToPath(new URL("../lib/server/call-code-hashes.json", import.meta.url));
const hashes = JSON.parse(readFileSync(listPath, "utf8"));
const codes = [];
while (codes.length < count) {
  const code = make();
  const h = hash(normalize(code));
  if (!hashes.includes(h)) {
    hashes.push(h);
    codes.push(code);
  }
}
writeFileSync(listPath, `${JSON.stringify(hashes, null, 2)}\n`);
writeFileSync(b, `${codes.join("\n")}\n`);
console.log(`${count} codes written to ${b}; hashes added to lib/server/call-code-hashes.json`);
