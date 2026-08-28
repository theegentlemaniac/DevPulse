export type FileExtension =
  | "ts" | "tsx" | "js" | "jsx" | "json" | "css" | "md" | "other";

export interface GraphNode {
  id: string;                // unique file path, e.g. "src/components/App.tsx"
  label: string;             // display name, e.g. "App.tsx"
  path: string;
  extension: FileExtension;
  lineCount: number;
  sizeBytes: number;
  dependencies: string[];    // ids of files this node imports
  dependents: string[];      // ids of files that import this node
  // physics state (mutated by the layout hook every frame, not React state)
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface GraphEdge {
  id: string;                // `${source}->${target}`
  source: string;            // node id
  target: string;            // node id
  type: "import" | "export";
}

export interface ParseResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AIAuditRequest {
  fileName: string;
  code: string;
}

export interface AIAuditResponse {
  summary: string;
  qualityScore: number;      // 0-100
  issues: string[];
  suggestions: string[];
}
