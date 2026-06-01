import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "keys.json");

export type KeyStatus = "pending" | "approved" | "used" | "expired";

export interface AccessKey {
  id: string;
  name: string;
  key: string;
  status: KeyStatus;
  expiresAt: number | null;
  createdAt: number;
  approvedAt: number | null;
  usedAt: number | null;
}

interface DB {
  keys: AccessKey[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDB(): DB {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) return { keys: [] };
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as DB;
  } catch {
    return { keys: [] };
  }
}

function writeDB(data: DB): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (n: number) =>
    Array.from(
      { length: n },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `WEYN-${rand(4)}-${rand(4)}-${rand(4)}`;
}

export function createKey(name: string): AccessKey {
  const db = readDB();
  const entry: AccessKey = {
    id: crypto.randomUUID(),
    name,
    key: generateKey(),
    status: "pending",
    expiresAt: null,
    createdAt: Date.now(),
    approvedAt: null,
    usedAt: null,
  };
  db.keys.push(entry);
  writeDB(db);
  return entry;
}

export function getAllKeys(): AccessKey[] {
  const db = readDB();
  const now = Date.now();
  let changed = false;
  for (const k of db.keys) {
    if (
      k.status === "approved" &&
      k.expiresAt !== null &&
      now > k.expiresAt
    ) {
      k.status = "expired";
      changed = true;
    }
  }
  if (changed) writeDB(db);
  return db.keys;
}

export function approveKey(id: string, expiresInHours: number): AccessKey | null {
  const db = readDB();
  const entry = db.keys.find((k) => k.id === id);
  if (!entry) return null;
  entry.status = "approved";
  entry.approvedAt = Date.now();
  entry.expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
  writeDB(db);
  return entry;
}

export function revokeKey(id: string): boolean {
  const db = readDB();
  const idx = db.keys.findIndex((k) => k.id === id);
  if (idx === -1) return false;
  db.keys.splice(idx, 1);
  writeDB(db);
  return true;
}

export function validateKey(key: string): { valid: boolean; name?: string; reason?: string } {
  const db = readDB();
  const entry = db.keys.find((k) => k.key === key);
  if (!entry) return { valid: false, reason: "Key not found" };
  if (entry.status === "pending") return { valid: false, reason: "Key is awaiting approval" };
  if (entry.status === "expired") return { valid: false, reason: "Key has expired" };
  if (
    entry.status === "approved" &&
    entry.expiresAt !== null &&
    Date.now() > entry.expiresAt
  ) {
    entry.status = "expired";
    writeDB(db);
    return { valid: false, reason: "Key has expired" };
  }
  if (entry.status !== "approved" && entry.status !== "used") {
    return { valid: false, reason: "Key is not valid" };
  }
  entry.usedAt = Date.now();
  writeDB(db);
  return { valid: true, name: entry.name };
}
