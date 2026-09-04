import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../restaurant-frontend");
const nextDir = path.join(frontendDir, ".next");

function findPortOwnerPid(port) {
  try {
    if (os.platform() === "win32") {
      const out = execFileSync("netstat", ["-ano"], { encoding: "utf8", timeout: 5000 });
      for (const line of out.split("\n")) {
        const cols = line.trim().split(/\s+/);
        if (cols.length >= 5 && cols[0] === "TCP" && cols[1].endsWith(`:${port}`) && cols[3] === "LISTENING") return cols[4];
      }
      return null;
    }
    const out = execFileSync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8", timeout: 5000 });
    return out.split("\n")[0]?.trim() || null;
  } catch { return null; }
}

const pid = findPortOwnerPid(3000);
if (pid) {
  console.error(`Cannot remove .next while RMS dev server is active on port 3000${pid ? ` (PID ${pid})` : ""}.`);
  console.error("Stop `npm run dev` first.");
  process.exit(1);
}

try {
  await rm(nextDir, { recursive: true, force: true });
  console.log(".next cache removed safely.");
} catch (e) {
  console.error(`Failed to remove ${nextDir}: ${e.message}`);
  process.exit(1);
}
