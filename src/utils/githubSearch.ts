const GITHUB_API_URL = "https://api.github.com";
const ownerCache = new Map<string, Promise<string[]>>();
const repositoryCache = new Map<string, Promise<string[]>>();

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
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];

  const cachedResult = ownerCache.get(normalizedQuery);
  if (cachedResult) return cachedResult;

  const request = fetch(
    `${GITHUB_API_URL}/search/users?q=${encodeURIComponent(`${normalizedQuery} in:login`)}&per_page=6`,
  )
    .then(async (response) => {
      if (!response.ok) return [];

      const body: unknown = await response.json();
      return isGitHubUserSearchResponse(body)
        ? body.items
            .map((item) => item.login)
            .filter((login) => login.toLowerCase().startsWith(normalizedQuery))
        : [];
    })
    .catch(() => []);

  ownerCache.set(normalizedQuery, request);
  return request;
}

export async function listGitHubRepositories(owner: string): Promise<string[]> {
  const normalizedOwner = owner.trim().toLowerCase();
  if (!normalizedOwner) return [];

  const cachedResult = repositoryCache.get(normalizedOwner);
  if (cachedResult) return cachedResult;

  const request = fetch(
    `${GITHUB_API_URL}/users/${encodeURIComponent(normalizedOwner)}/repos?sort=updated&per_page=8`,
  )
    .then(async (response) => {
      if (!response.ok) return [];

      const body: unknown = await response.json();
      if (!Array.isArray(body) || !body.every(isGitHubRepositoryResponse)) return [];

      return body.filter((repository) => !repository.fork).map((repository) => repository.name);
    })
    .catch(() => []);

  repositoryCache.set(normalizedOwner, request);
  return request;
}