import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchRepoFiles, GitHubRateLimitError } from "./githubFetcher";

const files = {
  "src/main.ts": "export const main = true;",
  "src/App.tsx": "export const App = () => null;",
  "src/components/Widget.tsx": "export const Widget = () => null;",
};

const tree = [
  { path: "src/main.ts", type: "blob", size: 30 },
  { path: "src/App.tsx", type: "blob", size: 40 },
  { path: "src/components/Widget.tsx", type: "blob", size: 50 },
  { path: "README.md", type: "blob", size: 100 },
  { path: "public/logo.png", type: "blob", size: 200 },
  { path: "src/generated.ts", type: "blob", size: 50 * 1024 },
];

const server = setupServer(
  http.get("https://api.github.com/repos/:owner/:repo/git/trees/:branch", () => HttpResponse.json({ tree })),
  http.get("https://api.github.com/repos/:owner/:repo/contents/*", ({ request }) => {
    const path = decodeURIComponent(new URL(request.url).pathname.split("/contents/")[1] ?? "");
    const content = files[path as keyof typeof files];
    return content
      ? HttpResponse.json({ content: btoa(content), encoding: "base64" })
      : new HttpResponse(null, { status: 404 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchRepoFiles", () => {
  it("filters unsupported or oversized files, decodes content, and honors maxFiles", async () => {
    const loadedFiles = await fetchRepoFiles("example", "repo", "main", 2);

    expect(loadedFiles).toEqual([
      { path: "src/main.ts", content: files["src/main.ts"] },
      { path: "src/App.tsx", content: files["src/App.tsx"] },
    ]);
  });

  it("throws GitHubRateLimitError with a readable reset time", async () => {
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/git/trees/:branch", () =>
        new HttpResponse(null, {
          status: 403,
          headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "0" },
        }),
      ),
    );

    await expect(fetchRepoFiles("example", "repo")).rejects.toThrow(GitHubRateLimitError);
    await expect(fetchRepoFiles("example", "repo")).rejects.toThrow(/reset at .+\./i);
  });

  it("retries the tree request with master after main returns 404", async () => {
    const requestedBranches: string[] = [];
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/git/trees/:branch", ({ params }) => {
        const branch = String(params.branch);
        requestedBranches.push(branch);
        return branch === "main"
          ? new HttpResponse(null, { status: 404 })
          : HttpResponse.json({ tree: [{ path: "src/main.ts", type: "blob", size: 30 }] });
      }),
    );

    await expect(fetchRepoFiles("example", "repo", "main")).resolves.toEqual([
      { path: "src/main.ts", content: files["src/main.ts"] },
    ]);
    expect(requestedBranches).toEqual(["main", "master"]);
  });
});