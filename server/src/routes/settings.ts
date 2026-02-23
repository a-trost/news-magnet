import { Hono } from "hono";
import * as settingsRepo from "../db/repositories/settings";

export const settingsRouter = new Hono();

settingsRouter.get("/", (c) => {
  const settings = settingsRepo.getAllSettings();
  return c.json({ data: settings });
});

settingsRouter.get("/:key", (c) => {
  const key = c.req.param("key");
  const setting = settingsRepo.getSetting(key);
  return c.json({
    data: setting ?? { key, value: "", updated_at: "" },
  });
});

settingsRouter.put("/:key", async (c) => {
  const key = c.req.param("key");
  const { value } = await c.req.json<{ value: string }>();
  settingsRepo.upsertSetting(key, value);
  const updated = settingsRepo.getSetting(key);
  return c.json({ data: updated });
});
