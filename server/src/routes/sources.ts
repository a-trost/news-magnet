import { Hono } from "hono";
import * as sourcesRepo from "../db/repositories/sources";
import type { CreateSourceInput, UpdateSourceInput } from "@shared/types";

export const sourcesRouter = new Hono();

sourcesRouter.get("/", (c) => {
  const sources = sourcesRepo.getAllSources();
  return c.json({ data: sources });
});

sourcesRouter.get("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const source = sourcesRepo.getSourceById(id);
  if (!source) return c.json({ error: "Source not found" }, 404);
  return c.json({ data: source });
});

sourcesRouter.post("/", async (c) => {
  const body = await c.req.json<CreateSourceInput>();
  if (!body.name || !body.type || !body.config) {
    return c.json({ error: "name, type, and config are required" }, 400);
  }
  const source = sourcesRepo.createSource(body);
  return c.json({ data: source }, 201);
});

sourcesRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<UpdateSourceInput>();
  const source = sourcesRepo.updateSource(id, body);
  if (!source) return c.json({ error: "Source not found" }, 404);
  return c.json({ data: source });
});

sourcesRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const deleted = sourcesRepo.deleteSource(id);
  if (!deleted) return c.json({ error: "Source not found" }, 404);
  return c.json({ data: { success: true } });
});
