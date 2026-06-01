import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve(__dirname, "../../data");
const KEYS_FILE = path.join(DATA_DIR, "keys.json");

export interface AccessKey {
  id: string;
  name: string | null;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  active: boolean;
  used: boolean;
  usedAt: string | null;
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: [] }, null, 2));
  }
}

function readKeys(): AccessKey[] {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
    return data.keys ?? [];
  } catch {
    return [];
  }
}

function writeKeys(keys: AccessKey[]) {
  ensureFile();
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys }, null, 2));
}

function generateKeyString(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `WEYN-${segment()}-${segment()}-${segment()}`;
}

export function createKey(expiresAt: string | null, name?: string | null): AccessKey {
  const keys = readKeys();
  const newKey: AccessKey = {
    id: crypto.randomUUID(),
    name: name ?? null,
    key: generateKeyString(),
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt ?? null,
    active: true,
    used: false,
    usedAt: null,
  };
  keys.push(newKey);
  writeKeys(keys);
  return newKey;
}

export function createPendingKey(name: string): AccessKey {
  const keys = readKeys();
  const newKey: AccessKey = {
    id: crypto.randomUUID(),
    name: name.trim(),
    key: generateKeyString(),
    createdAt: new Date().toISOString(),
    expiresAt: null,
    active: false,
    used: false,
    usedAt: null,
  };
  keys.push(newKey);
  writeKeys(keys);
  return newKey;
}

export function activateKey(id: string, expiresAt?: string | null): AccessKey | null {
  const keys = readKeys();
  const found = keys.find((k) => k.id === id);
  if (!found) return null;
  found.active = true;
  if (expiresAt !== undefined) found.expiresAt = expiresAt;
  writeKeys(keys);
  return found;
}

export function getAllKeys(): AccessKey[] {
  return readKeys();
}

export function deleteKey(id: string): boolean {
  const keys = readKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  writeKeys(filtered);
  return true;
}

export function verifyAndConsumeKey(keyStr: string): { valid: boolean; expiresAt?: string | null; error?: string } {
  const keys = readKeys();
  const found = keys.find((k) => k.key === keyStr.toUpperCase().trim());
  if (!found) return { valid: false, error: "Invalid key" };
  if (!found.active) return { valid: false, error: "Key pending admin approval" };
  if (found.used) return { valid: false, error: "Key already used" };
  if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
    return { valid: false, error: "Key has expired" };
  }
  found.used = true;
  found.usedAt = new Date().toISOString();
  writeKeys(keys);
  return { valid: true, expiresAt: found.expiresAt };
}
