import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Boxes, GitBranch, Search, X } from "lucide-react";
import Canvas3D from "./components/Canvas3D";
import GraphLegend from "./components/GraphLegend";
import Sidebar from "./components/Sidebar";
import { useAppStore } from "./store/useAppStore";
import { listGitHubRepositories, searchGitHubOwners } from "./utils/githubSearch";

type SuggestionTarget = "owner" | "repo" | null;

function parseRepositoryInput(value: string): { owner: string; repo: string } | null {
  const normalized = value.trim().replace(/^git@github\.com:/i, "https://github.com/");
  const match = normalized.match(/(?:github\.com\/)?([\w-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  return match ? { owner: match[1], repo: match[2] } : null;
}

export default function App() {
  const loadRepo = useAppStore((s) => s.loadRepo);
  const loadFromGitHub = useAppStore((s) => s.loadFromGitHub);
  const loadingState = useAppStore((s) => s.loadingState);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const clearError = useAppStore((s) => s.clearError);
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const [owner, setOwner] = useState("pmndrs");
  const [repo, setRepo] = useState("zustand");
  const [isErrorHovered, setIsErrorHovered] = useState(false);
  const [ownerSuggestions, setOwnerSuggestions] = useState<string[]>([]);
  const [repoSuggestions, setRepoSuggestions] = useState<string[]>([]);
  const [suggestionTarget, setSuggestionTarget] = useState<SuggestionTarget>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    loadRepo();
  }, [loadRepo]);

  useEffect(() => {
    if (loadingState !== "error" || !errorMessage || isErrorHovered) return;

    const dismissTimer = window.setTimeout(clearError, 6000);
    return () => window.clearTimeout(dismissTimer);
  }, [clearError, errorMessage, isErrorHovered, loadingState]);

  useEffect(() => {
    const parsed = parseRepositoryInput(owner);
    if (parsed) {
      setOwner(parsed.owner);
      setRepo(parsed.repo);
      setSuggestionTarget(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsDiscovering(true);
      void searchGitHubOwners(owner).then((suggestions) => {
        if (!cancelled) {
          setOwnerSuggestions(suggestions);
          setIsDiscovering(false);
        }
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [owner]);

  useEffect(() => {
    if (suggestionTarget !== "repo") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsDiscovering(true);
      void listGitHubRepositories(owner).then((repositories) => {
        if (!cancelled) {
          setRepoSuggestions(repositories.filter((name) => name.toLowerCase().includes(repo.toLowerCase())));
          setIsDiscovering(false);
        }
      });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [owner, repo, suggestionTarget]);

  const selectSuggestion = (value: string) => {
    if (suggestionTarget === "owner") setOwner(value);
    if (suggestionTarget === "repo") setRepo(value);
    setSuggestionTarget(null);
    setActiveSuggestion(-1);
  };

  const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const suggestions = suggestionTarget === "owner" ? ownerSuggestions : repoSuggestions;
    if (!suggestionTarget || suggestions.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        return (current + direction + suggestions.length) % suggestions.length;
      });
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestionTarget(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadFromGitHub(owner.trim(), repo.trim());
  };

  return (
    <div className="relative w-screen h-screen bg-void overflow-hidden">
      <header className="absolute left-4 top-4 z-20 w-[calc(100%-2rem)] space-y-3 border border-white/10 bg-panel/85 p-4 shadow-2xl backdrop-blur-md sm:w-auto sm:min-w-[570px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-accent/40 bg-accent/10 text-accent">
            <Boxes size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">DevPulse</h1>
          <span className="ml-1 border-l border-white/10 pl-3 text-xs text-white/45">
            {nodes.length} files · {edges.length} dependencies
          </span>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
        >
          <div className="relative sm:w-32">
            <motion.input
              variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}
              aria-label="GitHub owner"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              onPaste={(event) => {
                const parsed = parseRepositoryInput(event.clipboardData.getData("text"));
                if (!parsed) return;
                event.preventDefault();
                setOwner(parsed.owner);
                setRepo(parsed.repo);
                setSuggestionTarget(null);
              }}
              onFocus={() => setSuggestionTarget("owner")}
              onKeyDown={handleSuggestionKeyDown}
              placeholder="owner or GitHub URL"
              className="w-full border border-white/15 bg-void/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 transition-colors focus:border-accent"
            />
            <SuggestionMenu target="owner" visible={suggestionTarget === "owner"} suggestions={ownerSuggestions} isLoading={isDiscovering} activeIndex={activeSuggestion} onSelect={selectSuggestion} />
          </div>
          <span className="hidden text-white/40 sm:block">/</span>
          <div className="relative sm:w-36">
            <motion.input
              variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}
              aria-label="GitHub repository"
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              onFocus={() => setSuggestionTarget("repo")}
              onKeyDown={handleSuggestionKeyDown}
              placeholder="repository"
              className="w-full border border-white/15 bg-void/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 transition-colors focus:border-accent"
            />
            <SuggestionMenu target="repo" visible={suggestionTarget === "repo"} suggestions={repoSuggestions} isLoading={isDiscovering} activeIndex={activeSuggestion} onSelect={selectSuggestion} />
          </div>
          <motion.button
            variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}
            type="submit"
            disabled={loadingState === "loading" || !owner.trim() || !repo.trim()}
            className="bg-accent px-4 py-2 text-sm font-semibold text-void transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Visualize
          </motion.button>
          <motion.button
            variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}
            type="button"
            onClick={loadRepo}
            disabled={loadingState === "loading"}
            className="border border-white/20 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load Sample Data
          </motion.button>
        </motion.form>
      </header>

      <Canvas3D />
      <AnimatePresence>
        {loadingState === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-void/70 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-4 text-white">
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-14 w-14 items-center justify-center border border-accent/50 bg-accent/10 text-accent shadow-[0_0_30px_rgba(34,211,238,0.25)]"
              >
                <Boxes size={28} />
              </motion.div>
              <p className="text-sm font-medium">Reading repository structure</p>
              <div className="flex gap-1.5" aria-label="Loading repository">
                {[0, 1, 2].map((index) => (
                  <motion.span
                    key={index}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.9, delay: index * 0.15, repeat: Infinity }}
                    className="h-2 w-2 bg-accent"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {loadingState === "error" && errorMessage && (
          <motion.div
            key={errorMessage}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0, x: [0, -5, 5, -3, 3, 0] }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ x: { duration: 0.35 }, y: { type: "spring", stiffness: 300, damping: 24 } }}
            onMouseEnter={() => setIsErrorHovered(true)}
            onMouseLeave={() => setIsErrorHovered(false)}
            className="absolute left-4 top-28 z-30 flex max-w-md items-center gap-3 border border-red-400/40 bg-red-950/95 px-3 py-2 text-sm text-red-100 shadow-lg"
          >
            <p>{errorMessage}</p>
            <button type="button" onClick={clearError} aria-label="Dismiss error" className="shrink-0 text-red-200/70 transition-colors hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <GraphLegend nodes={nodes} />
      <div className="pointer-events-none fixed right-4 top-4 z-10 hidden border border-white/10 bg-panel/75 px-3 py-2 text-right shadow-xl backdrop-blur-md sm:block sm:right-[25rem]">
        <div className="flex items-center justify-end gap-2 text-[10px] font-semibold uppercase tracking-wide text-accent/80">
          <Activity size={12} /> Dependency graph
        </div>
        <p className="mt-1 text-xs text-white/55">Select a node to trace its connections</p>
      </div>
      <Sidebar />
    </div>
  );
}

interface SuggestionMenuProps {
  target: Exclude<SuggestionTarget, null>;
  visible: boolean;
  suggestions: string[];
  isLoading: boolean;
  activeIndex: number;
  onSelect: (value: string) => void;
}

function SuggestionMenu({ target, visible, suggestions, isLoading, activeIndex, onSelect }: SuggestionMenuProps) {
  if (!visible || (!isLoading && suggestions.length === 0)) return null;

  return (
    <div className="absolute left-0 top-[calc(100%+0.25rem)] z-50 w-full min-w-48 overflow-hidden border border-white/15 bg-[#161621] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {target === "owner" ? <Search size={11} /> : <GitBranch size={11} />}
        {target === "owner" ? "GitHub accounts" : "Recent repositories"}
      </div>
      {isLoading && <p className="px-3 py-2 text-xs text-white/45">Searching GitHub...</p>}
      {!isLoading && suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(suggestion)}
          className={`block w-full px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? "bg-accent/15 text-accent" : "text-white/80 hover:bg-white/10"}`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
