import { betterAuth } from "better-auth";
import { getDb } from "./db/database";

export const auth = betterAuth({
  database: getDb(),
  basePath: "/api/auth",
  emailAndPassword: { enabled: true },
  trustedOrigins: ["http://localhost:5174"],
});
