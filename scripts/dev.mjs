import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const frontendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backendDir = path.resolve(frontendDir, "../restaurant-backend");
const nextBin = path.join(frontendDir, "node_modules/next/dist/bin/next");

const api = spawn("php", ["artisan", "serve", "--host=0.0.0.0", "--port=8000"], {
  cwd: backendDir,
  stdio: "inherit",
});

const web = spawn(process.execPath, [nextBin, "dev", "--webpack", "--hostname", "0.0.0.0"], {
  cwd: frontendDir,
  stdio: "inherit",
});

const stop = () => {
  api.kill();
  web.kill();
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);

for (const child of [api, web]) {
  child.on("error", (error) => {
    console.error(`Could not start ${child === api ? "Laravel" : "Next.js"}:`, error.message);
    stop();
    process.exitCode = 1;
  });

  child.on("exit", (code) => {
    if (code && !process.exitCode) process.exitCode = code;
  });
}
