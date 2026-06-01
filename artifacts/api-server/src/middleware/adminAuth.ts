import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
export const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";

export function signAdminToken(): string {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
