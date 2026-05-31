import { Router } from "express";
import { z } from "zod";
import { getAllKeys, approveKey, revokeKey } from "../db";
import { ADMIN_PASSWORD, signAdminToken, adminAuth } from "../middleware/adminAuth";

const router = Router();

router.post("/admin/login", (req, res) => {
  const parsed = z.object({ password: z.string() }).safeParse(req.body);
  if (!parsed.success || parsed.data.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }
  return res.json({ token: signAdminToken() });
});

router.get("/admin/keys", adminAuth, (_req, res) => {
  return res.json({ keys: getAllKeys() });
});

router.post("/admin/keys/:id/approve", adminAuth, (req, res) => {
  const parsed = z.object({ expiresInHours: z.number().min(0.1).max(8760) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "expiresInHours required (0.1–8760)" });
  const entry = approveKey(req.params.id, parsed.data.expiresInHours);
  if (!entry) return res.status(404).json({ error: "Key not found" });
  return res.json(entry);
});

router.delete("/admin/keys/:id", adminAuth, (req, res) => {
  const ok = revokeKey(req.params.id);
  if (!ok) return res.status(404).json({ error: "Key not found" });
  return res.json({ success: true });
});

export default router;
