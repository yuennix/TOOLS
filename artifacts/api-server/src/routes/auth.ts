import { Router, Request, Response } from "express";
import { verifyAndConsumeKey } from "../lib/keys";

const router = Router();

router.post("/auth/verify-key", (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ valid: false, error: "Key is required" });
  }
  const result = verifyAndConsumeKey(key);
  return res.json(result);
});

export default router;
