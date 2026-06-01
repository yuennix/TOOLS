import { Router } from "express";
import { ResetPasswordBody } from "@workspace/api-zod";
import { spawn } from "child_process";
import path from "path";

const router = Router();

const SCRIPT = path.resolve(__dirname, "../../scripts/reset_pass.py");

function runPython(args: string[]): Promise<{ success: boolean; username?: string | null; password?: string | null; error?: string | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SCRIPT, ...args]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited ${code}: ${stderr}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Bad JSON from Python: ${stdout}`));
      }
    });

    proc.on("error", reject);
  });
}

router.post("/reset-pass", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { resetLink, chatId, botToken, customPassword } = parsed.data;

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
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

export default router;
