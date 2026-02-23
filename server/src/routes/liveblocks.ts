import { Hono } from "hono";
import { Liveblocks } from "@liveblocks/node";
import { auth } from "../auth";

export const liveblocksRouter = new Hono();

const COLORS = [
  "#E57373", "#81C784", "#64B5F6", "#FFB74D", "#BA68C8",
  "#4DB6AC", "#FF8A65", "#A1887F", "#90A4AE", "#F06292",
];

function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

liveblocksRouter.post("/auth", async (c) => {
  const secretKey = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secretKey) {
    return c.json({ error: "Liveblocks not configured" }, 503);
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const liveblocks = new Liveblocks({ secret: secretKey });

  const lbSession = liveblocks.prepareSession(session.user.id, {
    userInfo: {
      name: session.user.name,
      color: colorFromId(session.user.id),
      avatar: session.user.image ?? undefined,
    },
  });

  lbSession.allow("episode:*", lbSession.FULL_ACCESS);
  lbSession.allow("article:*", lbSession.FULL_ACCESS);

  const { status, body } = await lbSession.authorize();
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
});
