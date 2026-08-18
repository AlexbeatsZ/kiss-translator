#!/usr/bin/env zx
import path from "node:path";
import { $, chalk, fs } from "zx";

if (process.platform === "win32") {
  $.shell = "cmd.exe";
  $.prefix = "";
}

console.log(chalk.cyan("\nDeploying web & userscripts to gh-pages branch...\n"));

const webDir = path.resolve("build/web");

if (!(await fs.pathExists(webDir))) {
  console.error(chalk.red("Error: 'build/web' directory not found. Please run 'pnpm build:web' first."));
  process.exit(1);
}

try {
  const originalCwd = process.cwd();
  cd(webDir);

  await $`git init`;
  await $`git remote add origin https://github.com/AlexbeatsZ/kiss-translator.git`;
  await $`git checkout -B gh-pages`;
  await $`git add -A`;
  await $`git commit -m "deploy: update web & userscripts"`;
  await $`git push origin gh-pages --force`;

  await fs.remove(path.join(webDir, ".git"));
  cd(originalCwd);

  console.log(chalk.green("\n✅ Successfully deployed to GitHub Pages branch (gh-pages)!"));
} catch (err) {
  console.error(chalk.red("\n❌ Error deploying to gh-pages:"), err);
  process.exit(1);
}
