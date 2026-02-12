import { Hono } from "hono";
import * as criteriaRepo from "../db/repositories/criteria";
import type { CreateCriteriaInput, UpdateCriteriaInput } from "@shared/types";

export const criteriaRouter = new Hono();

criteriaRouter.get("/", (c) => {
  const criteria = criteriaRepo.getAllCriteria();
  return c.json({ data: criteria });
});

criteriaRouter.get("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const criteria = criteriaRepo.getCriteriaById(id);
  if (!criteria) return c.json({ error: "Criteria not found" }, 404);
  return c.json({ data: criteria });
});

criteriaRouter.post("/", async (c) => {
  const body = await c.req.json<CreateCriteriaInput>();
  if (!body.name || !body.description) {
    return c.json({ error: "name and description are required" }, 400);
  }
  const criteria = criteriaRepo.createCriteria(body);
  return c.json({ data: criteria }, 201);
});

criteriaRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<UpdateCriteriaInput>();
  const criteria = criteriaRepo.updateCriteria(id, body);
  if (!criteria) return c.json({ error: "Criteria not found" }, 404);
  return c.json({ data: criteria });
});

criteriaRouter.put("/:id/activate", async (c) => {
  const id = Number(c.req.param("id"));
  const criteria = criteriaRepo.updateCriteria(id, { is_active: true });
  if (!criteria) return c.json({ error: "Criteria not found" }, 404);
  return c.json({ data: criteria });
});

criteriaRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const deleted = criteriaRepo.deleteCriteria(id);
  if (!deleted) return c.json({ error: "Criteria not found" }, 404);
  return c.json({ data: { success: true } });
});
