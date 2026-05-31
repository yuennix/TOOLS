import { Router } from "express";
import { z } from "zod";
import { createKey, validateKey } from "../db";

const router = Router();

router.post("/keys/generate", (req, res) => {
  const parsed = z.object({ name: z.string().min(1).max(60) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Name is required" });
  const entry = createKey(parsed.data.name.trim());
  return res.json({ id: entry.id, key: entry.key, name: entry.name, status: entry.status });
});

router.post("/keys/validate", (req, res) => {
  const parsed = z.object({ key: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ valid: false, reason: "Key is required" });
  const result = validateKey(parsed.data.key.trim().toUpperCase());
  return res.json(result);
});

export default router;
