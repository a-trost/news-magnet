import { betterAuth } from "better-auth";
import { getDb } from "./db/database";

const trustedOrigins = ["http://localhost:5234", "http://localhost:3150"];
if (process.env.APP_URL) {
  trustedOrigins.push(process.env.APP_URL);
}

export const auth = betterAuth({
  database: getDb(),
  basePath: "/api/auth",
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      hd: "prismic.io",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!user.email.endsWith("@prismic.io")) {
            return false;
          }
          return { data: user };
        },
      },
    },
  },
});
