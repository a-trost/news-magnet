/**
 * One-time script to create the initial admin user.
 * Usage: bun server/src/scripts/seed-user.ts
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from env (or .env file).
 * Defaults to admin@newsmagnet.local / admin123 for local dev.
 */

import fs from "fs";
import path from "path";

// Load .env from project root
const envPath = path.resolve(import.meta.dir, "../../../.env");
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

import { auth } from "../auth";

const email = process.env.ADMIN_EMAIL || "admin@newsmagnet.local";
const password = process.env.ADMIN_PASSWORD || "admin123";
const name = process.env.ADMIN_NAME || "Admin";

console.log(`Creating user: ${email}`);

const result = await auth.api.signUpEmail({
  body: { email, password, name },
});

if ("user" in result) {
  console.log("User created successfully:", result.user.email);
} else {
  console.log("Result:", result);
}
