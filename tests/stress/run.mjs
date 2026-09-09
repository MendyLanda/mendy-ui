import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
if (
  await fetch("http://127.0.0.1:8790")
    .then(() => true)
    .catch(() => false)
) {
  throw new Error(
    "Port 8790 is already in use; stop the existing fixture before running stress checks.",
  );
}
const server = spawn(process.execPath, ["tests/stress/serve.mjs"], { stdio: "inherit" });
async function run(file, args = []) {
  const child = spawn(process.execPath, [file, ...args], { stdio: "inherit" });
  const code = await new Promise((resolve) => child.once("exit", resolve));
  if (code !== 0) throw new Error(`${file} failed with exit code ${code}`);
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Stress fixture server failed to start");
    ready = await fetch("http://127.0.0.1:8790")
      .then((response) => response.ok)
      .catch(() => false);
    if (ready) break;
    await setTimeout(200);
  }
  if (!ready) throw new Error("Stress fixture server did not become ready");
  await run("tests/stress/check.mjs");
  if (process.argv.includes("--measure")) await run("tests/stress/audit.mjs", ["measured"]);
} finally {
  server.kill("SIGTERM");
}
