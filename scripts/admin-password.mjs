// Read a NEW local-development password from stdin; never log the clear text.
import { scryptSync, randomBytes } from "node:crypto";
let p = "";
for await (const chunk of process.stdin) p += chunk;
p = p.replace(/\r?\n$/, "");
if (p.length < 12 || p.length > 128) {
  console.error("Use a password of 12–128 characters");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
process.stdout.write(`scrypt:${salt}:${scryptSync(p, salt, 64).toString("hex")}\n`);
