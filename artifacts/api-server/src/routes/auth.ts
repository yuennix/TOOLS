import { Router, Request, Response } from "express";
import { verifyAndConsumeKey, createPendingKey } from "../lib/keys";

const router = Router();

router.post("/auth/verify-key", (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ valid: false, error: "Key is required" });
  }
  const result = verifyAndConsumeKey(key);
  return res.json(result);
});

router.post("/auth/request-key", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const key = createPendingKey(name);
  return res.json({ id: key.id, name: key.name, key: key.key });
});

export default router;
