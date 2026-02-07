/**
 * Create backend venv using the correct Python for the platform.
 * macOS/Linux: python3
 * Windows: python, or py (Python launcher)
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const backendDir = path.join(__dirname, "..", "backend");
const venvDir = path.join(backendDir, "venv");

if (fs.existsSync(venvDir)) {
  console.log("venv already exists, skipping creation.");
  process.exit(0);
}

const isWin = process.platform === "win32";
const candidates = isWin ? ["python", "py"] : ["python3", "python"];

for (const py of candidates) {
  try {
    execSync(`${py} -m venv venv`, {
      cwd: backendDir,
      stdio: "inherit",
      shell: true,
    });
    console.log(`Created venv using: ${py}`);
    process.exit(0);
  } catch (e) {
    // try next
  }
}

console.error("Could not create venv. Tried: " + candidates.join(", "));
console.error("Install Python from https://www.python.org/ and ensure it is on PATH.");
process.exit(1);
