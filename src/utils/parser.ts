import { GraphNode, GraphEdge, ParseResult, FileExtension } from "../types/codebase";
import { RawFile, sampleRepo } from "../data/sampleRepo";

// Matches: import X from '...' | import { X } from "..." | export * from '...'
const IMPORT_REGEX = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g;

function getExtension(path: string): FileExtension {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx") return ext as FileExtension;
  if (ext === "json") return "json";
  if (ext === "css") return "css";
  if (ext === "md") return "md";
  return "other";
}

function getLabel(path: string): string {
  return path.split("/").pop() ?? path;
}

// Resolves a relative import ('./Foo', '../store/useAppStore') against the
// importing file's directory, matching it to an actual file path in the repo.
// Returns null for bare package imports (e.g. 'react', '@react-three/fiber').
function resolveImportPath(
  fromPath: string,
  importSpecifier: string,
  allPaths: string[]
): string | null {
  if (!importSpecifier.startsWith(".")) {
    return null; // external package, not part of the internal graph
  }

  const fromDir = fromPath.split("/").slice(0, -1);
  const parts = importSpecifier.split("/");
  const stack = [...fromDir];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }

  const base = stack.join("/");
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];

  return candidates.find((c) => allPaths.includes(c)) ?? null;
}

function extractImports(content: string): string[] {
  const specifiers: string[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex since the regex is module-scoped and stateful (global flag)
  IMPORT_REGEX.lastIndex = 0;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

/**
 * Parses an array of raw files into a GraphNode/GraphEdge structure.
 * Node physics fields (x/y/z/vx/vy/vz) are initialized to a random seed
 * position; useGraphLayout takes over from there each frame.
 */
export function parseRepo(files: RawFile[] = sampleRepo): ParseResult {
  const allPaths = files.map((f) => f.path);

  const nodes: GraphNode[] = files.map((file) => {
    const lineCount = file.content.split("\n").filter((l) => l.trim().length > 0).length;
    return {
      id: file.path,
      label: getLabel(file.path),
      path: file.path,
      extension: getExtension(file.path),
      lineCount,
      sizeBytes: new Blob([file.content]).size,
      dependencies: [],
      dependents: [],
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      vz: 0,
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: GraphEdge[] = [];
  const seenEdgeIds = new Set<string>();

  for (const file of files) {
    const specifiers = extractImports(file.content);
    for (const spec of specifiers) {
      const resolved = resolveImportPath(file.path, spec, allPaths);
      if (!resolved || resolved === file.path) continue;

      const edgeId = `${file.path}->${resolved}`;
      if (seenEdgeIds.has(edgeId)) continue;
      seenEdgeIds.add(edgeId);

      edges.push({ id: edgeId, source: file.path, target: resolved, type: "import" });

      const sourceNode = nodeMap.get(file.path);
      const targetNode = nodeMap.get(resolved);
      if (sourceNode && !sourceNode.dependencies.includes(resolved)) {
        sourceNode.dependencies.push(resolved);
      }
      if (targetNode && !targetNode.dependents.includes(file.path)) {
        targetNode.dependents.push(file.path);
      }
    }
  }

  return { nodes, edges };
}
