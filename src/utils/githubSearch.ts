const GITHUB_API_URL = "https://api.github.com";

interface GitHubUserSearchResponse {
  items: Array<{ login: string }>;
}

interface GitHubRepositoryResponse {
  name: string;
  fork: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGitHubUserSearchResponse(value: unknown): value is GitHubUserSearchResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every((item) => isRecord(item) && typeof item.login === "string")
  );
}

function isGitHubRepositoryResponse(value: unknown): value is GitHubRepositoryResponse {
  return isRecord(value) && typeof value.name === "string" && typeof value.fork === "boolean";
}

export async function searchGitHubOwners(query: string): Promise<string[]> {
  if (query.trim().length < 2) return [];

  const response = await fetch(
    `${GITHUB_API_URL}/search/users?q=${encodeURIComponent(`${query} in:login`)}&per_page=6`,
  );
  if (!response.ok) return [];

  const body: unknown = await response.json();
  return isGitHubUserSearchResponse(body)
    ? body.items
        .map((item) => item.login)
        .filter((login) => login.toLowerCase().startsWith(query.trim().toLowerCase()))
    : [];
}

export async function listGitHubRepositories(owner: string): Promise<string[]> {
  if (!owner.trim()) return [];

  const response = await fetch(
    `${GITHUB_API_URL}/users/${encodeURIComponent(owner)}/repos?sort=updated&per_page=8`,
  );
  if (!response.ok) return [];

  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isGitHubRepositoryResponse)) return [];

  return body.filter((repository) => !repository.fork).map((repository) => repository.name);
}