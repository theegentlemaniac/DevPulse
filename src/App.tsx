import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, X } from "lucide-react";
import Canvas3D from "./components/Canvas3D";
import GraphLegend from "./components/GraphLegend";
import Sidebar from "./components/Sidebar";
import { useAppStore } from "./store/useAppStore";

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

  useEffect(() => {
    loadRepo();
  }, [loadRepo]);

  useEffect(() => {
    if (loadingState !== "error" || !errorMessage || isErrorHovered) return;

    const dismissTimer = window.setTimeout(clearError, 6000);
    return () => window.clearTimeout(dismissTimer);
  }, [clearError, errorMessage, isErrorHovered, loadingState]);

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
          <motion.input
            variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}
            aria-label="GitHub owner"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="owner"
            className="w-full border border-white/15 bg-void/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 transition-colors focus:border-accent sm:w-32"
          />
          <span className="hidden text-white/40 sm:block">/</span>
          <motion.input
            variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}
            aria-label="GitHub repository"
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            placeholder="repository"
            className="w-full border border-white/15 bg-void/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 transition-colors focus:border-accent sm:w-36"
          />
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
      <Sidebar />
    </div>
  );
}
