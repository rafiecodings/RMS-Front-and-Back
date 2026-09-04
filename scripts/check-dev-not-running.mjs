import { execFileSync } from "node:child_process";
import os from "node:os";

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
  console.error(`RMS dev server is currently running on port 3000${pid ? ` (PID ${pid})` : ""}.`);
  console.error("Stop `npm run dev` first, then run the build again.");
  console.error("Build cancelled to prevent .next cache corruption.");
  process.exit(1);
}
