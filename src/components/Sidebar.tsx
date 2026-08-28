import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, FileCode2, ArrowRightLeft, Sparkles, Loader2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { askAIArchitect } from "../utils/aiRouter";
import { AIAuditResponse } from "../types/codebase";

export default function Sidebar() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const nodes = useAppStore((s) => s.nodes);
  const selectNode = useAppStore((s) => s.selectNode);

  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AIAuditResponse | null>(null);

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleAskAI = async () => {
    if (!node) return;
    setLoading(true);
    setAudit(null);
    try {
      const result = await askAIArchitect({
        fileName: node.label,
        code: `// ${node.path}\n// (${node.lineCount} lines, ${node.dependencies.length} dependencies)`,
      });
      setAudit(result);
    } catch (error: unknown) {
      console.error("AI architect request failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!node ? (
        <motion.aside
          key="empty"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-30 flex h-[45vh] items-center justify-center border-t border-white/10 bg-panel/80 px-6 text-center backdrop-blur-md sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-96 sm:border-l sm:border-t-0"
        >
          <p className="text-sm text-white/40">Click a node in the 3D graph to inspect a file.</p>
        </motion.aside>
      ) : (
        <motion.aside
          key="details"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-30 flex h-[75vh] flex-col rounded-t-lg border-t border-white/10 bg-panel/90 text-white shadow-2xl backdrop-blur-md sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-96 sm:rounded-none sm:border-l sm:border-t-0"
        >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 size={18} className="text-accent shrink-0" />
          <h2 className="font-semibold truncate">{node.label}</h2>
        </div>
        <button
          onClick={() => {
            selectNode(null);
            setAudit(null);
          }}
          aria-label="Close sidebar"
          className="text-white/50 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Path</p>
          <p className="text-sm break-all text-white/80">{node.path}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40">Lines</p>
            <p className="text-lg font-semibold">{node.lineCount}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40">Size</p>
            <p className="text-lg font-semibold">{node.sizeBytes}B</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowRightLeft size={14} className="text-white/40" />
            <p className="text-xs uppercase tracking-wide text-white/40">
              Dependencies ({node.dependencies.length})
            </p>
          </div>
          {node.dependencies.length === 0 ? (
            <p className="text-sm text-white/30 italic">None</p>
          ) : (
            <ul className="space-y-1">
              {node.dependencies.map((dep) => (
                <li key={dep} className="text-sm text-white/70 truncate">
                  → {dep}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-white/40 mb-2">
            Depended on by ({node.dependents.length})
          </p>
          {node.dependents.length === 0 ? (
            <p className="text-sm text-white/30 italic">None</p>
          ) : (
            <ul className="space-y-1">
              {node.dependents.map((dep) => (
                <li key={dep} className="text-sm text-white/70 truncate">
                  ← {dep}
                </li>
              ))}
            </ul>
          )}
        </div>

        {audit && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-accent">AI Summary</p>
              <span className="text-xs font-semibold text-accent">{audit.qualityScore}/100</span>
            </div>
            <p className="text-sm text-white/80">{audit.summary}</p>
            {audit.issues.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mt-2 mb-1">Issues</p>
                <ul className="text-sm text-white/70 list-disc list-inside space-y-0.5">
                  {audit.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {audit.suggestions.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mt-2 mb-1">Suggestions</p>
                <ul className="text-sm text-white/70 list-disc list-inside space-y-0.5">
                  {audit.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleAskAI}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-accent text-void font-semibold rounded-lg py-2.5 hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Ask AI Architect
            </>
          )}
        </button>
      </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
