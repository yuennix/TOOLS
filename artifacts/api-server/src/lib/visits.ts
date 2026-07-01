import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE = path.join(DATA_DIR, "visits.json");

function read(): number {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) return 0;
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")).count ?? 0; } catch { return 0; }
}

function write(count: number) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ count }), "utf-8");
}

export function increment() {
  const n = read() + 1;
  write(n);
  return n;
}

export function getCount(): number {
  return read();
}
