#!/usr/bin/env zx
import path from "node:path";
import bestzip from "bestzip";

// 在 Windows 上配置 shell 兼容性
if (process.platform === "win32") {
  $.shell = "cmd.exe";
  $.prefix = "";
}

console.log(chalk.cyan("\nStarting compression tasks...\n"));

const buildRoot = path.resolve("build");

if (!(await fs.pathExists(buildRoot))) {
  console.error(chalk.red("Error: 'build' directory not found. Please build targets first."));
  process.exit(1);
}

// 1. 清理旧的 zip 文件
const existingFiles = await fs.readdir(buildRoot);
for (const file of existingFiles) {
  if (file.endsWith(".zip")) {
    await fs.remove(path.join(buildRoot, file));
  }
}

/**
 * 定义打包任务配置
 * @property {string} output - 输出文件名（相对 build 目录）
 * @property {string} source - 要打包的源（文件或目录名）
 * @property {string} [cwd]  - (可选) 执行打包命令时所在的子目录
 */
const tasks = [
  { output: "chrome.zip", source: "chrome" },
  { output: "edge.zip", source: "edge" },
  { output: "userscript.zip", source: "userscript" },
  {
    output: "../firefox.zip",
    source: "*",
    cwd: "firefox",
  },
  {
    output: "../thunderbird.zip",
    source: "*",
    cwd: "thunderbird",
  },
];

try {
  for (const task of tasks) {
    const targetDir = task.cwd
      ? path.join(buildRoot, task.cwd)
      : path.join(buildRoot, task.source);

    if (!(await fs.pathExists(targetDir))) {
      console.log(
        chalk.yellow(`⚠️  Skipping ${task.output}: source '${targetDir}' not found.`)
      );
      continue;
    }

    if (task.cwd) {
      console.log(`Zipping contents of ${task.cwd} (flat structure)...`);
      await bestzip({
        source: task.source,
        destination: task.output,
        cwd: targetDir,
      });
    } else {
      console.log(`Zipping folder ${task.source}...`);
      await bestzip({
        source: task.source,
        destination: task.output,
        cwd: buildRoot,
      });
    }
  }
  console.log(chalk.green("\n✅ Zip files created successfully in 'build/' directory."));
} catch (err) {
  console.error(chalk.red("❌ Error during zipping:"), err);
  process.exit(1);
}
