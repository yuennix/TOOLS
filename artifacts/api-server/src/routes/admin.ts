import { Router, Request, Response, NextFunction } from "express";
import { createKey, getAllKeys, deleteKey, activateKey } from "../lib/keys";

const router = Router();
const ADMIN_PASSWORD = "yuennix";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pw = req.headers["x-admin-password"] as string;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/admin/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Wrong password" });
  }
  return res.json({ success: true });
});

router.get("/admin/keys", requireAdmin, (_req: Request, res: Response) => {
  return res.json({ keys: getAllKeys() });
});

router.post("/admin/keys/generate", requireAdmin, (req: Request, res: Response) => {
  const { expiresAt, name } = req.body;
  const key = createKey(expiresAt ?? null, name ?? null);
  return res.json({ key });
});

router.post("/admin/keys/:id/activate", requireAdmin, (req: Request, res: Response) => {
  const key = activateKey(req.params.id);
  if (!key) return res.status(404).json({ error: "Key not found" });
  return res.json({ key });
});

router.delete("/admin/keys/:id", requireAdmin, (req: Request, res: Response) => {
  const deleted = deleteKey(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Key not found" });
  return res.json({ success: true });
});

export default router;
