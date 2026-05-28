#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

function parseArgs(argv) {
  const args = {
    target: "main",
    verify: ["npm run test -- src/popup/popup-app.test.ts", "npm run typecheck"],
    packageCommand: "npm run release",
    dryRun: false,
    allowDirty: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "--target":
        args.target = next();
        break;
      case "--repo":
        args.repo = next();
        break;
      case "--notes-file":
        args.notesFile = next();
        break;
      case "--title":
        args.title = next();
        break;
      case "--verify":
        args.verify.push(next());
        break;
      case "--no-default-verify":
        args.verify = [];
        break;
      case "--package-cmd":
        args.packageCommand = next();
        break;
      case "--allow-dirty":
        args.allowDirty = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--help":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  console.log(`Usage: npm run release:github -- [options]

Creates or updates a GitHub Release using package.json as the only version source.

Options:
  --target <branch-or-sha>   Release target, default: main
  --repo <owner/name>        GitHub repo, inferred by gh when omitted
  --notes-file <path>        Release notes markdown file
  --title <title>            Release title, default: v<package version>
  --verify <command>         Extra verification command, may be repeated
  --no-default-verify        Skip default verification commands
  --package-cmd <command>    Build command, default: npm run release
  --allow-dirty              Allow dirty worktree before release
  --dry-run                  Print derived version, asset and commands only
`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function run(command, { dryRun = false } = {}) {
  console.log(`+ ${command}`);
  if (!dryRun) {
    execFileSync("sh", ["-lc", command], { stdio: "inherit" });
  }
}

function output(command, args = []) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function findGh() {
  const fromPath = spawnSync("which", ["gh"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) {
    return fromPath.stdout.trim();
  }
  if (existsSync("/opt/homebrew/bin/gh")) {
    return "/opt/homebrew/bin/gh";
  }
  throw new Error("gh not found in PATH or /opt/homebrew/bin/gh");
}

function assertVersion(version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`package.json version is not a valid semver: ${version}`);
  }
}

function assertLockfileVersion(version) {
  const lockPath = "package-lock.json";
  if (!existsSync(lockPath)) {
    return;
  }
  const lock = readJson(lockPath);
  const rootVersion = lock.packages?.[""]?.version;
  if (lock.version !== version || rootVersion !== version) {
    throw new Error(
      `package-lock.json version mismatch: top=${lock.version}, root=${rootVersion}, package=${version}`
    );
  }
}

function assertCleanWorktree({ allowDirty, dryRun }) {
  if (allowDirty || dryRun) {
    return;
  }
  const status = output("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error(`Refusing to release from a dirty worktree:\n${status}`);
  }
}

function releaseExists(gh, tag, repo) {
  const args = ["release", "view", tag];
  if (repo) {
    args.push("--repo", repo);
  }
  const result = spawnSync(gh, args, { stdio: "ignore" });
  return result.status === 0;
}

function assertAsset(assetPath) {
  if (!existsSync(assetPath)) {
    throw new Error(`Expected release asset was not generated: ${assetPath}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const pkg = readJson("package.json");
  assertVersion(pkg.version);
  assertLockfileVersion(pkg.version);

  const tag = `v${pkg.version}`;
  const title = args.title ?? tag;
  const asset = join("output", `${pkg.name}-${pkg.version}-chrome.zip`);
  const gh = findGh();

  console.log(
    JSON.stringify(
      {
        package: pkg.name,
        version: pkg.version,
        tag,
        target: args.target,
        asset,
        repo: args.repo ?? "(gh default repo)",
        dryRun: args.dryRun
      },
      null,
      2
    )
  );

  assertCleanWorktree({ allowDirty: args.allowDirty, dryRun: args.dryRun });

  for (const command of args.verify) {
    run(command, { dryRun: args.dryRun });
  }
  run(args.packageCommand, { dryRun: args.dryRun });

  if (!args.dryRun) {
    assertAsset(asset);
  }

  const repoArgs = args.repo ? ` --repo ${args.repo}` : "";
  if (!args.dryRun && releaseExists(gh, tag, args.repo)) {
    run(`"${gh}" release upload ${tag} ${asset} --clobber${repoArgs}`);
    if (args.notesFile) {
      run(`"${gh}" release edit ${tag} --notes-file ${args.notesFile}${repoArgs}`);
    }
  } else {
    const notesArg = args.notesFile ? `--notes-file ${args.notesFile}` : "--generate-notes";
    run(
      `"${gh}" release create ${tag} ${asset} --target ${args.target} --title "${title}" ${notesArg}${repoArgs}`,
      { dryRun: args.dryRun }
    );
  }

  run(
    `"${gh}" release view ${tag} --json tagName,targetCommitish,name,isDraft,isPrerelease,url,assets${repoArgs}`,
    { dryRun: args.dryRun }
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
