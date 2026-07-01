import { Router } from "express";
import { ResetPasswordBody } from "@workspace/api-zod";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const router = Router();

const SCRIPT = path.resolve(__dirname, "../../scripts/reset_pass.py");
const VENV_PYTHON = path.resolve(process.cwd(), ".venv/bin/python3");
const PYTHON = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";

function runPython(args: string[]): Promise<{ success: boolean; username?: string | null; password?: string | null; error?: string | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [SCRIPT, ...args]);
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

router.post("/reset-pass", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { resetLinks, chatId, botToken, customPassword } = parsed.data;

  const results: Array<{
    resetLink: string;
    success: boolean;
    username?: string | null;
    password?: string | null;
    error?: string | null;
  }> = [];

  for (const resetLink of resetLinks) {
    const args = [
      "--reset-link", resetLink,
      "--chat-id", chatId,
      "--bot-token", botToken,
    ];
    if (customPassword) {
      args.push("--custom-password", customPassword);
    }

    try {
      const data = await runPython(args);
      results.push({ resetLink, ...data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ resetLink, success: false, error: msg });
    }
  }

  return res.json({ results });
});

export default router;
