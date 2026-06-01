import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve(__dirname, "../../data");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");

export type RequestStatus = "pending" | "approved" | "rejected";

export interface KeyRequest {
  id: string;
  name: string;
  status: RequestStatus;
  key: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify({ requests: [] }, null, 2));
  }
}

function readRequests(): KeyRequest[] {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(REQUESTS_FILE, "utf-8"));
    return data.requests ?? [];
  } catch {
    return [];
  }
}

function writeRequests(requests: KeyRequest[]) {
  ensureFile();
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify({ requests }, null, 2));
}

export function createRequest(name: string): KeyRequest {
  const requests = readRequests();
  const req: KeyRequest = {
    id: crypto.randomUUID(),
    name: name.trim(),
    status: "pending",
    key: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  requests.push(req);
  writeRequests(requests);
  return req;
}

export function getRequest(id: string): KeyRequest | null {
  return readRequests().find((r) => r.id === id) ?? null;
}

export function getAllRequests(): KeyRequest[] {
  return readRequests();
}

export function approveRequest(id: string, generatedKey: string): KeyRequest | null {
  const requests = readRequests();
  const req = requests.find((r) => r.id === id);
  if (!req) return null;
  req.status = "approved";
  req.key = generatedKey;
  req.resolvedAt = new Date().toISOString();
  writeRequests(requests);
  return req;
}

export function rejectRequest(id: string): KeyRequest | null {
  const requests = readRequests();
  const req = requests.find((r) => r.id === id);
  if (!req) return null;
  req.status = "rejected";
  req.resolvedAt = new Date().toISOString();
  writeRequests(requests);
  return req;
}

export function deleteRequest(id: string): boolean {
  const requests = readRequests();
  const filtered = requests.filter((r) => r.id !== id);
  if (filtered.length === requests.length) return false;
  writeRequests(filtered);
  return true;
}
