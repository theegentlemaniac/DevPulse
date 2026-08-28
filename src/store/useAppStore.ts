import { create } from "zustand";
import { GraphNode, GraphEdge } from "../types/codebase";
import { parseRepo } from "../utils/parser";
import { fetchRepoFiles, GitHubRateLimitError } from "../utils/githubFetcher";

type LoadingState = "idle" | "loading" | "error" | "success";
const PUBLIC_GITHUB_FILE_CAP = 50;

interface AppState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  loadingState: LoadingState;
  errorMessage: string | null;

  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  loadRepo: () => void;
  loadFromGitHub: (owner: string, repo: string, branch?: string) => Promise<void>;
  clearError: () => void;
}

// NOTE ON PERFORMANCE: node.x/y/z are mutated directly by useGraphLayout's
// useFrame loop every frame (60x/sec) WITHOUT calling set(), because running
// a full Zustand state update every frame would trigger unnecessary React
// re-renders across every subscribed component. Mesh positions in Canvas3D
// read these mutable fields directly inside their own useFrame callbacks.
// Only structural changes (loadRepo, selectNode, hoverNode) go through set().
export const useAppStore = create<AppState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  loadingState: "idle",
  errorMessage: null,

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),

  loadRepo: () => {
    const { nodes, edges } = parseRepo();
    set({ nodes, edges, selectedNodeId: null, loadingState: "success", errorMessage: null });
  },

  loadFromGitHub: async (owner, repo, branch = "main") => {
    set({ loadingState: "loading", errorMessage: null, selectedNodeId: null });

    try {
      const files = await fetchRepoFiles(owner, repo, branch, PUBLIC_GITHUB_FILE_CAP);
      const { nodes, edges } = parseRepo(files);
      set({ nodes, edges, loadingState: "success" });
    } catch (error: unknown) {
      set({
        loadingState: "error",
        errorMessage:
          error instanceof GitHubRateLimitError
            ? error.message
            : "Failed to load repository. Check the owner/repo name and try again.",
      });
    }
  },

  clearError: () => set({ loadingState: "idle", errorMessage: null }),
}));
