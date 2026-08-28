import { useFrame } from "@react-three/fiber";
import { GraphNode, GraphEdge } from "../types/codebase";

const REPULSION_STRENGTH = 12;
const SPRING_STRENGTH = 0.08;
const SPRING_LENGTH = 6;
const DAMPING = 0.85;
const CENTERING_STRENGTH = 0.015;
export const MAX_SPEED = 0.5;

/**
 * Runs one lightweight force-directed simulation step, mutating the supplied
 * nodes in place.
 */
export function stepSimulation(nodes: GraphNode[], edges: GraphEdge[]): void {
  if (nodes.length === 0) return;

  // 1. Repulsion between every pair of nodes (naive O(n²) — fine under ~200 nodes)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const distSq = dx * dx + dy * dy + dz * dz + 0.01;
      const dist = Math.sqrt(distSq);
      const force = REPULSION_STRENGTH / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      a.vx += fx;
      a.vy += fy;
      a.vz += fz;
      b.vx -= fx;
      b.vy -= fy;
      b.vz -= fz;
    }
  }

  // 2. Spring attraction along edges (import/dependency links)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dz = target.z - source.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const displacement = dist - SPRING_LENGTH;
    const force = displacement * SPRING_STRENGTH;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = (dz / dist) * force;

    source.vx += fx;
    source.vy += fy;
    source.vz += fz;
    target.vx -= fx;
    target.vy -= fy;
    target.vz -= fz;
  }

  // 3. Centering force (keeps the whole graph near the origin) + integrate
  for (const node of nodes) {
    node.vx += -node.x * CENTERING_STRENGTH;
    node.vy += -node.y * CENTERING_STRENGTH;
    node.vz += -node.z * CENTERING_STRENGTH;

    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.vz *= DAMPING;

    const speed = Math.sqrt(node.vx ** 2 + node.vy ** 2 + node.vz ** 2);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      node.vx *= scale;
      node.vy *= scale;
      node.vz *= scale;
    }

    node.x += node.vx;
    node.y += node.vy;
    node.z += node.vz;
  }
}

/**
 * Runs a lightweight force-directed simulation every frame. Mesh components
 * read the mutable node positions directly for zero re-render overhead.
 */
export function useGraphLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  useFrame(() => stepSimulation(nodes, edges));
}
