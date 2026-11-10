import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
const securityOnly = process.argv[2] === "--security-only";
if (process.argv.length > (securityOnly ? 3 : 2))
  throw new Error("Unknown test option");
// Firebase CLI debug mode otherwise prints the entire inherited environment.
const env = {
  ...process.env,
  DEBUG: "",
  FIREBASE_CLI_DISABLE_MOTD: "1",
  KH_REPORT_TEST_RULES: resolve("firebase/firestore.rules"),
};
// Firebase CLI may leave Java listening after SIGINT on Windows. Exclude all
// pre-existing processes and match this repository's rules + exact demo project.
const query = `Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" | Where-Object { $_.CommandLine -like '*cloud-firestore-emulator-*.jar*' -and $_.CommandLine -like '*--project_id demo-kh-tech-report *' -and $_.CommandLine.IndexOf($env:KH_REPORT_TEST_RULES, [StringComparison]::OrdinalIgnoreCase) -ge 0 }`;
function windowsJavaIds() {
  if (process.platform !== "win32") return [];
  const result = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `${query} | Select-Object -ExpandProperty ProcessId | ConvertTo-Json -Compress`,
    ],
    { env, windowsHide: true, encoding: "utf8" },
  ).trim();
  return result ? [JSON.parse(result)].flat() : [];
}
const existing = new Set(windowsJavaIds());
const child = spawn(
  process.execPath,
  [
    "node_modules/firebase-tools/lib/bin/firebase.js",
    "emulators:exec",
    "--project",
    "demo-kh-tech-report",
    "--only",
    "auth,firestore",
    securityOnly
      ? "node node_modules/vitest/vitest.mjs run --config vitest.report.config.ts"
      : "npm run test:report:inside",
  ],
  { stdio: ["inherit", "pipe", "pipe"], env },
);
for (const [stream, output] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
]) {
  createInterface({ input: stream }).on("line", (line) =>
    output.write(
      (/oobCode=|To reset the password/i.test(line)
        ? "[Auth emulator: password action created; link redacted]"
        : line) + "\n",
    ),
  );
}
child.on("exit", async (code) => {
  await new Promise((done) => setTimeout(done, 1500));
  try {
    for (const pid of windowsJavaIds())
      if (!existing.has(pid)) {
        // PID comes from the OS; revalidate the command before stopping it.
        if (!Number.isInteger(pid)) continue;
        execFileSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `${query} | Where-Object { $_.ProcessId -eq ${pid} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`,
          ],
          { env, windowsHide: true, stdio: "pipe" },
        );
      }
  } catch {
    console.error(
      "Could not clean up this run's local Firestore emulator; check port 8085.",
    );
    process.exit(1);
  }
  process.exit(code ?? 1);
});
