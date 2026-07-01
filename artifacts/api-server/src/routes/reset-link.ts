import { Router } from "express";
import { SendResetLinksBody } from "@workspace/api-zod";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const router = Router();

const SCRIPT = path.resolve(__dirname, "../../scripts/send_recovery.py");
const VENV_PYTHON = path.resolve(process.cwd(), ".venv/bin/python3");
const PYTHON = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";

function runPython(emails: string[]): Promise<{ results: Array<{ email: string; success: boolean; response: string }> }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [SCRIPT, ...emails]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Script timed out after 120s"));
    }, 120_000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        return reject(new Error(`Python exited ${code}: ${stderr.trim() || stdout.trim()}`));
      }
      const raw = stdout.trim();
      if (!raw) return reject(new Error(`No output from script. stderr: ${stderr.trim()}`));
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error(`Bad JSON from script: ${raw.slice(0, 200)}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

router.post("/reset-link", async (req, res) => {
  const parsed = SendResetLinksBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const data = await runPython(parsed.data.emails);
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

export default router;
