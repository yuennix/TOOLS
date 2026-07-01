import { Router, Request, Response, NextFunction } from "express";
import { createKey, getAllKeys, deleteKey, activateKey } from "../lib/keys";
import { getCount } from "../lib/visits";
import { registerUser, getUserCount, getUsers } from "../lib/users";

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pw = req.headers["x-admin-password"] as string;
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/track-visit", (_req: Request, res: Response) => {
  const { increment } = require("../lib/visits");
  increment();
  return res.json({ ok: true });
});

router.post("/register-name", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  registerUser(name.trim());
  return res.json({ ok: true });
});

router.get("/admin/stats", requireAdmin, (_req: Request, res: Response) => {
  return res.json({ visits: getCount(), users: getUserCount() });
});

router.get("/admin/users", requireAdmin, (_req: Request, res: Response) => {
  return res.json({ users: getUsers() });
});

router.post("/admin/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
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
  const { expiresAt } = req.body;
  const key = activateKey(req.params.id as string, expiresAt ?? null);
  if (!key) return res.status(404).json({ error: "Key not found" });
  return res.json({ key });
});

router.delete("/admin/keys/:id", requireAdmin, (req: Request, res: Response) => {
  const deleted = deleteKey(req.params.id as string);
  if (!deleted) return res.status(404).json({ error: "Key not found" });
  return res.json({ success: true });
});

export default router;
