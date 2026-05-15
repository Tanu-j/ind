/**
 * Run Next.js dev server and the indexing worker together.
 * Usage: npm run dev:all
 */
const { spawn } = require("child_process");

const shell = process.platform === "win32";

function run(name, script) {
  const child = spawn("npm", ["run", script], {
    stdio: "inherit",
    shell,
    env: { ...process.env, WORKER_EXTERNAL: "true" },
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[dev:all] ${name} exited with code ${code}`);
    }
    shutdown(code ?? 0);
  });
  return child;
}

const children = [run("dev", "dev"), run("worker", "worker")];
let exiting = false;

function shutdown(code) {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
