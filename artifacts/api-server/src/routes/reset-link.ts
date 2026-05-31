import { Router } from "express";
import { SendResetLinksBody } from "@workspace/api-zod";
import { spawn } from "child_process";
import path from "path";

const router = Router();

const SCRIPT = path.resolve(__dirname, "../../scripts/send_recovery.py");

function runPython(emails: string[]): Promise<{ results: Array<{ email: string; success: boolean; response: string }> }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SCRIPT, ...emails]);
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
