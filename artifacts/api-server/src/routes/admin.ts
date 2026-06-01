import { Router, Request, Response, NextFunction } from "express";
import { createKey, getAllKeys, deleteKey } from "../lib/keys";
import { getAllRequests, approveRequest, rejectRequest, deleteRequest } from "../lib/requests";

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

router.delete("/admin/keys/:id", requireAdmin, (req: Request, res: Response) => {
  const deleted = deleteKey(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Key not found" });
  return res.json({ success: true });
});

router.get("/admin/requests", requireAdmin, (_req: Request, res: Response) => {
  const requests = getAllRequests().slice().reverse();
  return res.json({ requests });
});

router.post("/admin/requests/:id/approve", requireAdmin, (req: Request, res: Response) => {
  const { expiresAt } = req.body;
  const allRequests = getAllRequests();
  const reqItem = allRequests.find((r) => r.id === req.params.id);
  if (!reqItem) return res.status(404).json({ error: "Request not found" });
  const key = createKey(expiresAt ?? null, reqItem.name);
  const updated = approveRequest(req.params.id, key.key);
  return res.json({ request: updated, key });
});

router.post("/admin/requests/:id/reject", requireAdmin, (req: Request, res: Response) => {
  const updated = rejectRequest(req.params.id);
  if (!updated) return res.status(404).json({ error: "Request not found" });
  return res.json({ request: updated });
});

router.delete("/admin/requests/:id", requireAdmin, (req: Request, res: Response) => {
  const deleted = deleteRequest(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Request not found" });
  return res.json({ success: true });
});

export default router;
