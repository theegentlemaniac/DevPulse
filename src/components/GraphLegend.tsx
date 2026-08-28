import { useEffect, useState } from "react";
import { Box, ChevronDown, ChevronUp, Circle, Network } from "lucide-react";
import type { FileExtension, GraphNode } from "../types/codebase";

interface GraphLegendProps {
  nodes: GraphNode[];
}

const colorByExtension: Record<FileExtension, string> = {
  ts: "#3178c6",
  tsx: "#61dafb",
  js: "#f7df1e",
  jsx: "#f0db4f",
  json: "#8bc34a",
  css: "#e91e63",
  md: "#9e9e9e",
  other: "#666666",
};

export default function GraphLegend({ nodes }: GraphLegendProps) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("devpulse-legend-collapsed") === "true",
  );
  const extensions = [...new Set(nodes.map((node) => node.extension))];

  useEffect(() => {
    window.localStorage.setItem("devpulse-legend-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <aside className="fixed bottom-4 left-4 z-10 hidden max-w-[calc(100vw-2rem)] border border-white/10 bg-panel/85 p-4 text-white shadow-xl backdrop-blur-md sm:block sm:max-w-none">
      <div className="flex items-center justify-between gap-4">
        {!collapsed && <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">Graph Guide</h2>}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand graph legend" : "Collapse graph legend"}
          className="text-white/50 transition-colors hover:text-white"
        >
          {collapsed ? <Network size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3 text-sm text-white/70">
          {extensions.length > 0 && (
            <div className="space-y-1.5">
              {extensions.map((extension) => (
                <div key={extension} className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0" style={{ backgroundColor: colorByExtension[extension] }} />
                  <span>.{extension}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-white/10 pt-2 space-y-1.5">
            <p className="flex items-center gap-2"><Circle size={12} /> Module</p>
            <p className="flex items-center gap-2"><Box size={12} /> React Component</p>
            <p className="text-xs text-white/45">Larger = more lines of code</p>
          </div>
        </div>
      )}
    </aside>
  );
}