/**
 * Builds "OpenBot Light", this fork's personal macOS app, next to the official OpenBot.
 *
 * It is `bun run package` with a derived electron-builder config: its own name and bundle id, so
 * its data folder is `~/Library/Application Support/OpenBot Light`; no `publish` provider, so no
 * `app-update.yml` ships and the updater stays off; and no `openbot://` scheme, so invitation links
 * stay with the official app. The build is ad-hoc signed, as `bun run package` is.
 *
 *   bun scripts/package-light.ts             prepare the runtimes, build, package
 *   bun scripts/package-light.ts --skip-prepare   reuse the runtimes and `out/` on disk
 *   bun scripts/package-light.ts --install   also replace /Applications/OpenBot Light.app
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createOpenBotLogger } from "@openbot/logging";
import { parse, stringify } from "yaml";

const PRODUCT_NAME = "OpenBot Light";
const APP_ID = "app.openbot.light";
const root = resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const logger = createOpenBotLogger("package-light");

function run(command: string, commandArgs: string[]): void {
  logger.info(`$ ${command} ${commandArgs.join(" ")}`);
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(" ")} failed with ${result.status}`);
}

if (process.platform !== "darwin") throw new Error("OpenBot Light is a macOS build.");

if (!args.has("--skip-prepare")) {
  run("bun", ["run", "voice:prepare-runtime"]);
  run("bun", ["run", "prepare:remote-desktop-runtime"]);
  run("bun", ["run", "verify:remote-desktop-runtime"]);
  run("bun", ["run", "prepare:cua-driver"]);
  run("bun", ["run", "build"]);
}

const config = parse(readFileSync(join(root, "electron-builder.yml"), "utf8"));
config.appId = APP_ID;
config.productName = PRODUCT_NAME;
// Electron names the data folder after the packaged package.json, not the bundle.
config.extraMetadata = { ...config.extraMetadata, productName: PRODUCT_NAME };
config.publish = null;
delete config.protocols;
config.directories = { ...config.directories, output: "dist-light" };
// Ad-hoc signed, as `bun run package` is: no Developer ID and no notarization.
config.mac = { ...config.mac, identity: null, notarize: false };

const configPath = join(root, ".openbot-build", "electron-builder.light.yml");
mkdirSync(join(root, ".openbot-build"), { recursive: true });
writeFileSync(configPath, stringify(config));

// The voice, remote desktop and Computer Use runtimes are prepared for this machine's architecture,
// so the app is built for the same one.
if (process.arch !== "arm64" && process.arch !== "x64") throw new Error(`Unsupported architecture ${process.arch}.`);
run("bunx", ["electron-builder", "--dir", "--mac", `--${process.arch}`, "--config", configPath]);

const appPath = join(root, "dist-light", process.arch === "arm64" ? "mac-arm64" : "mac", `${PRODUCT_NAME}.app`);
if (!existsSync(appPath)) throw new Error(`No app at ${appPath}`);
// Without update metadata the updater reports "unsupported" and never checks.
if (existsSync(join(appPath, "Contents", "Resources", "app-update.yml"))) {
  throw new Error("The build has app-update.yml, so its updater would run. Check the publish setting.");
}
logger.info(`Built ${appPath}`);

if (args.has("--install")) {
  const installed = join("/Applications", `${PRODUCT_NAME}.app`);
  rmSync(installed, { recursive: true, force: true });
  // `-c` clones on APFS, so the installed copy costs no extra disk.
  run("cp", ["-Rc", appPath, installed]);
  run("xattr", ["-cr", installed]);
  logger.info(`Installed ${installed}`);
}
