import fs from "fs";
import path from "path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".venv",
  "venv",
  "__pycache__",
  ".pnpm-store",
  "target",
  ".pytest_cache",
  ".ruff_cache",
  ".cursor",
  ".claude",
  ".github",
  ".tmp_assets",
]);

const SKIP_FILE_PATTERNS = [
  /\.env/i,
  /secret/i,
  /credentials/i,
  /\.lock$/i,
  /\.csv$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.pdf$/i,
  /translation_artifacts/i,
];

const PROJECT_MARKERS = [
  "package.json",
  "pyproject.toml",
  "pom.xml",
  "Cargo.toml",
  "go.mod",
];

const MAX_FILES = 30;
const MAX_CHARS = 14000;

export async function collectProductContext({
  repoPath,
  websiteUrl,
}: {
  repoPath?: string | null;
  websiteUrl?: string | null;
}): Promise<string> {
  const parts: string[] = [];

  if (repoPath && fs.existsSync(repoPath)) {
    parts.push("=== REPO MATERIAL ===");
    parts.push(readPath(repoPath));
  } else if (repoPath) {
    parts.push(`=== REPO MATERIAL ===\nPath not found: ${repoPath}`);
  }

  if (websiteUrl) {
    parts.push("\n=== WEBSITE ===");
    parts.push(await fetchWebsiteText(websiteUrl));
  }

  const combined = parts.join("\n\n").trim();
  return combined.slice(0, MAX_CHARS) || "No product material found at the given path.";
}

function readPath(root: string): string {
  const subProjects = findSubProjects(root);

  if (subProjects.length >= 2) {
    const chunks: string[] = [
      `Workspace folder with ${subProjects.length} projects: ${subProjects.map((p) => path.basename(p)).join(", ")}`,
    ];

    for (const projectPath of subProjects.slice(0, 6)) {
      chunks.push(readProject(projectPath, path.basename(projectPath)));
    }

    chunks.push(readTopLevelDocs(root));
    return chunks.filter(Boolean).join("\n\n");
  }

  return readProject(root, path.basename(root));
}

function findSubProjects(root: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."))
    .map((e) => path.join(root, e.name))
    .filter((dir) => PROJECT_MARKERS.some((m) => fs.existsSync(path.join(dir, m))))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

function readTopLevelDocs(root: string): string {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name.toLowerCase();
      if (
        name.endsWith(".md") &&
        /readme|plan|architecture|consolidation|problem|solution/i.test(name)
      ) {
        const content = fs.readFileSync(path.join(root, entry.name), "utf8").slice(0, 2500);
        files.push(`--- ${entry.name} ---\n${content}`);
      }
    }
  } catch {
    // ignore
  }

  return files.join("\n\n");
}

function readProject(root: string, label: string): string {
  const files = collectFiles(root);
  if (files.length === 0) {
    return `--- ${label} ---\n(no readable docs found)`;
  }

  return [
    `=== PROJECT: ${label} ===`,
    ...files.map((f) => `--- ${f.path} ---\n${f.content}`),
  ].join("\n\n");
}

function collectFiles(root: string) {
  const files: Array<{ priority: number; path: string; content: string }> = [];

  function walk(dir: string, depth = 0, prefix = "") {
    if (depth > 5 || files.length >= MAX_FILES) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;
      const fullPath = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        walk(fullPath, depth + 1, rel);
        continue;
      }

      if (SKIP_FILE_PATTERNS.some((p) => p.test(rel))) continue;

      const ext = path.extname(entry.name).toLowerCase();
      const isReadme = /readme/i.test(entry.name);
      const isPackageJson = entry.name === "package.json";
      const isLanding =
        /landing|home|marketing|about|hero/i.test(rel) &&
        (ext === ".tsx" || ext === ".jsx" || ext === ".html");

      if (!isReadme && !isPackageJson && !isLanding && !INCLUDE_DOC(ext, entry.name)) {
        continue;
      }

      let priority = 2;
      if (isReadme) priority = 0;
      if (isLanding) priority = 0;
      if (isPackageJson) priority = 1;
      if (/REPO_CONSOLIDATION|ARCHITECTURE|PROBLEM|SOLUTION/i.test(entry.name)) {
        priority = 0;
      }

      try {
        let content = fs.readFileSync(fullPath, "utf8");
        if (isPackageJson) {
          content = summarizePackageJson(content);
        } else {
          content = content.slice(0, 2500);
        }
        files.push({ priority, path: rel, content });
      } catch {
        // ignore unreadable files
      }
    }
  }

  walk(root);

  return files
    .sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path))
    .slice(0, 12);
}

function INCLUDE_DOC(ext: string, name: string) {
  return [".md", ".tsx", ".jsx", ".html", ".txt"].includes(ext) || name === "README";
}

function summarizePackageJson(raw: string): string {
  try {
    const pkg = JSON.parse(raw) as {
      name?: string;
      description?: string;
      scripts?: Record<string, string>;
    };
    const scripts = Object.keys(pkg.scripts ?? {})
      .slice(0, 5)
      .join(", ");
    return `name: ${pkg.name ?? "unknown"}\ndescription: ${pkg.description ?? "none"}\nscripts: ${scripts}`;
  } catch {
    return raw.slice(0, 500);
  }
}

async function fetchWebsiteText(url: string): Promise<string> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  try {
    const response = await fetch(normalized, {
      headers: { "User-Agent": "GroundworkBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return `Could not fetch website (${response.status})`;
    }
    const html = await response.text();
    return stripHtml(html).slice(0, 4000);
  } catch (error) {
    return `Could not fetch website: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
