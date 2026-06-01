import { Router, Request, Response } from "express";
import { verifyAndConsumeKey } from "../lib/keys";
import { createRequest, getRequest } from "../lib/requests";

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
  const request = createRequest(name);
  return res.json({ id: request.id, name: request.name, status: request.status });
});

router.get("/auth/request-key/:id", (req: Request, res: Response) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  return res.json({
    id: request.id,
    name: request.name,
    status: request.status,
    key: request.status === "approved" ? request.key : null,
  });
});

export default router;
