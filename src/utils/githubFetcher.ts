import type { RawFile } from "../data/sampleRepo";

const GITHUB_API_URL = "https://api.github.com";
const MAX_FILE_SIZE_BYTES = 50 * 1024;
const CONTENT_FETCH_CONCURRENCY = 8;

interface GitTreeEntry {
  path: string;
  type: string;
  size?: number;
}

interface GitTreeResponse {
  tree: GitTreeEntry[];
}

interface GitHubContentResponse {
  content: string;
  encoding: string;
}

export class GitHubRateLimitError extends Error {
  constructor(resetAt: string) {
    super(`GitHub API rate limit exceeded. Requests reset at ${resetAt}.`);
    this.name = "GitHubRateLimitError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGitTreeResponse(value: unknown): value is GitTreeResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.tree) &&
    value.tree.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.path === "string" &&
        typeof entry.type === "string" &&
        (entry.size === undefined || typeof entry.size === "number"),
    )
  );
}

function isGitHubContentResponse(value: unknown): value is GitHubContentResponse {
  return (
    isRecord(value) &&
    typeof value.content === "string" &&
    typeof value.encoding === "string"
  );
}

function throwForRateLimit(response: Response): void {
  if (response.status !== 403 || response.headers.get("X-RateLimit-Remaining") !== "0") {
    return;
  }

  const resetTimestamp = Number(response.headers.get("X-RateLimit-Reset"));
  const resetAt = Number.isFinite(resetTimestamp)
    ? new Date(resetTimestamp * 1000).toLocaleString()
    : "an unknown time";

  throw new GitHubRateLimitError(resetAt);
}

function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function pLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    const next = queue.shift();
    if (next) {
      next();
    }
  };

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    activeCount += 1;
    try {
      return await task();
    } finally {
      activeCount -= 1;
      runNext();
    }
  };
}

function isSupportedSourceFile(entry: GitTreeEntry): boolean {
  const extension = entry.path.split(".").pop()?.toLowerCase();
  return (
    entry.type === "blob" &&
    entry.size !== undefined &&
    entry.size < MAX_FILE_SIZE_BYTES &&
    (extension === "ts" || extension === "tsx" || extension === "js" || extension === "jsx")
  );
}

async function fetchTree(owner: string, repo: string, branch: string): Promise<Response> {
  return fetch(
    `${GITHUB_API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
}

async function getRepositoryTree(owner: string, repo: string, branch: string): Promise<{ tree: GitTreeResponse; branch: string }> {
  let response = await fetchTree(owner, repo, branch);
  throwForRateLimit(response);

  if (response.status === 404) {
    const fallbackBranch = branch === "main" ? "master" : branch === "master" ? "main" : branch;
    if (fallbackBranch !== branch) {
      response = await fetchTree(owner, repo, fallbackBranch);
      throwForRateLimit(response);
      branch = fallbackBranch;
    }
  }

  if (!response.ok) {
    throw new Error(`Unable to fetch GitHub repository tree: ${response.status} ${response.statusText}`);
  }

  const body: unknown = await response.json();
  if (!isGitTreeResponse(body)) {
    throw new Error("GitHub returned an invalid repository tree response.");
  }

  return { tree: body, branch };
}

async function fetchFile(owner: string, repo: string, branch: string, path: string): Promise<RawFile> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
  );
  throwForRateLimit(response);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const body: unknown = await response.json();
  if (!isGitHubContentResponse(body) || body.encoding !== "base64") {
    throw new Error("GitHub returned invalid file content.");
  }

  return { path, content: decodeBase64(body.content) };
}

export async function fetchRepoFiles(
  owner: string,
  repo: string,
  branch = "main",
  maxFiles = 150,
): Promise<RawFile[]> {
  const repository = await getRepositoryTree(owner, repo, branch);
  const limit = pLimit(CONTENT_FETCH_CONCURRENCY);
  const files = repository.tree.tree.filter(isSupportedSourceFile).slice(0, maxFiles);
  let rateLimitError: GitHubRateLimitError | null = null;

  const results = await Promise.all(
    files.map((file) =>
      limit(async () => {
        if (rateLimitError) {
          return null;
        }

        try {
          return await fetchFile(owner, repo, repository.branch, file.path);
        } catch (error: unknown) {
          if (error instanceof GitHubRateLimitError) {
            rateLimitError = error;
            throw error;
          }

          console.warn(`Skipping GitHub file ${file.path}:`, error);
          return null;
        }
      }),
    ),
  );

  return results.filter((file): file is RawFile => file !== null);
}