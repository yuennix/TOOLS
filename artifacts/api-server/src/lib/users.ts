import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE = path.join(DATA_DIR, "users.json");

interface UserEntry {
  name: string;
  registeredAt: number;
}

interface DB {
  users: UserEntry[];
}

function read(): DB {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) return { users: [] };
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { return { users: [] }; }
}

function write(db: DB) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function registerUser(name: string): void {
  const db = read();
  db.users.push({ name: name.trim(), registeredAt: Date.now() });
  write(db);
}

export function getUserCount(): number {
  return read().users.length;
}

export function getUsers(): UserEntry[] {
  return read().users;
}
