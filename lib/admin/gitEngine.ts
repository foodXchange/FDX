/**
 * Git Operations Engine for Admin Control Center
 * Safely executes git status, log, diff, commit, push, and pull commands
 * using Node's child_process.execFile with sanitized argument arrays.
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface GitFileStatus {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked" | "renamed";
  staged: boolean;
}

export interface GitCommitItem {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  relativeDate: string;
  message: string;
  isSkipCi: boolean;
}

export interface GitRadarStatus {
  currentBranch: string;
  isClean: boolean;
  aheadCount: number;
  behindCount: number;
  changedFiles: GitFileStatus[];
  recentCommits: GitCommitItem[];
  lastCommitHash: string;
  lastCommitMessage: string;
  timestamp: string;
}

export async function getGitStatus(): Promise<GitRadarStatus> {
  try {
    // 1. Current Branch & Ahead/Behind status
    const { stdout: branchOut } = await execFileAsync("git", ["status", "-b", "--porcelain=v2"]);
    let currentBranch = "main";
    let aheadCount = 0;
    let behindCount = 0;

    const branchLines = branchOut.split("\n");
    for (const line of branchLines) {
      if (line.startsWith("# branch.head ")) {
        currentBranch = line.replace("# branch.head ", "").trim();
      } else if (line.startsWith("# branch.ab ")) {
        const parts = line.replace("# branch.ab ", "").trim().split(" ");
        aheadCount = parseInt(parts[0]?.replace("+", "") || "0", 10);
        behindCount = parseInt(parts[1]?.replace("-", "") || "0", 10);
      }
    }

    // 2. Changed Files (Modified, Untracked, Deleted)
    const { stdout: statusOut } = await execFileAsync("git", ["status", "--porcelain=v1"]);
    const changedFiles: GitFileStatus[] = [];

    const statusLines = statusOut.split("\n").filter(Boolean);
    for (const line of statusLines) {
      const code = line.slice(0, 2);
      const filePath = line.slice(3).trim();

      let status: GitFileStatus["status"] = "modified";
      const staged = code[0] !== " " && code[0] !== "?";

      if (code.includes("?")) status = "untracked";
      else if (code.includes("A")) status = "added";
      else if (code.includes("D")) status = "deleted";
      else if (code.includes("R")) status = "renamed";
      else status = "modified";

      changedFiles.push({ path: filePath, status, staged });
    }

    // 3. Last 10 Commits
    const { stdout: logOut } = await execFileAsync("git", [
      "log",
      "-n",
      "10",
      "--pretty=format:%H|%h|%an|%ad|%ar|%s",
      "--date=iso",
    ]);

    const recentCommits: GitCommitItem[] = [];
    const logLines = logOut.split("\n").filter(Boolean);
    for (const line of logLines) {
      const [hash, shortHash, author, date, relativeDate, message] = line.split("|");
      if (hash && shortHash) {
        recentCommits.push({
          hash,
          shortHash,
          author: author || "Developer",
          date: date || "",
          relativeDate: relativeDate || "",
          message: message || "",
          isSkipCi: /\[skip\s*(ci|netlify)\]/i.test(message || ""),
        });
      }
    }

    const isClean = changedFiles.length === 0;
    const lastCommit = recentCommits[0];

    return {
      currentBranch,
      isClean,
      aheadCount,
      behindCount,
      changedFiles,
      recentCommits,
      lastCommitHash: lastCommit?.shortHash || "N/A",
      lastCommitMessage: lastCommit?.message || "No commits",
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("Failed to query git status:", err);
    return {
      currentBranch: "main",
      isClean: true,
      aheadCount: 0,
      behindCount: 0,
      changedFiles: [],
      recentCommits: [],
      lastCommitHash: "",
      lastCommitMessage: err?.message || "Error reading git repository",
      timestamp: new Date().toISOString(),
    };
  }
}

export async function gitCommit(params: {
  message: string;
  skipCi: boolean;
  prefix?: string;
  stageAll?: boolean;
}): Promise<{ success: boolean; commitHash?: string; message: string; output: string }> {
  try {
    if (params.stageAll !== false) {
      await execFileAsync("git", ["add", "-A"]);
    }

    const prefix = params.prefix ? `${params.prefix}: ` : "";
    let finalMessage = `${prefix}${params.message.trim()}`;
    if (params.skipCi && !/\[skip\s*ci\]/i.test(finalMessage)) {
      finalMessage = `${finalMessage} [skip ci]`;
    }

    const { stdout } = await execFileAsync("git", ["commit", "-m", finalMessage]);

    // Query new commit hash
    const { stdout: hashOut } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"]);

    return {
      success: true,
      commitHash: hashOut.trim(),
      message: finalMessage,
      output: stdout,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to commit changes",
      output: err?.stderr || err?.stdout || String(err),
    };
  }
}

export async function gitPush(remote = "origin", branch = "main"): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["push", remote, branch]);
    return {
      success: true,
      output: stdout || stderr || "Pushed successfully",
    };
  } catch (err: any) {
    return {
      success: false,
      output: err?.stderr || err?.stdout || err?.message || "Push failed",
    };
  }
}

export async function gitPull(remote = "origin", branch = "main"): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["pull", remote, branch]);
    return {
      success: true,
      output: stdout || stderr || "Pulled successfully",
    };
  } catch (err: any) {
    return {
      success: false,
      output: err?.stderr || err?.stdout || err?.message || "Pull failed",
    };
  }
}

export async function gitDiffFile(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--", filePath]);
    if (stdout.trim()) return stdout;
    // Check if untracked
    const { stdout: untracked } = await execFileAsync("git", ["diff", "--cached", "--", filePath]);
    return untracked || "No unstaged changes for this file.";
  } catch (err: any) {
    return err?.message || "Could not generate diff.";
  }
}
