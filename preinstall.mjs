// Cross-platform preinstall check (the original Replit version used
// `sh -c '...'`, which doesn't exist on a plain Windows install).
//
// 1. Removes stray lockfiles from other package managers.
// 2. Refuses to run unless pnpm is the package manager in use.
import { existsSync, unlinkSync } from "node:fs";

for (const file of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(file)) {
    unlinkSync(file);
  }
}

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error('Use pnpm instead (e.g. "pnpm install").');
  process.exit(1);
}
