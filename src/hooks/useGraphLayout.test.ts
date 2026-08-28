import { describe, expect, it } from "vitest";
import type { GraphEdge, GraphNode } from "../types/codebase";
import { MAX_SPEED, stepSimulation } from "./useGraphLayout";

function createNode(id: string, x: number, y = 0, z = 0): GraphNode {
  return {
    id,
    label: id,
    path: id,
    extension: "ts",
    lineCount: 1,
    sizeBytes: 1,
    dependencies: [],
    dependents: [],
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
  };
}

function distance(first: GraphNode, second: GraphNode): number {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function positionMagnitude(node: GraphNode): number {
  return Math.hypot(node.x, node.y, node.z);
}

function cloneNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((node) => ({
    ...node,
    dependencies: [...node.dependencies],
    dependents: [...node.dependents],
  }));
}

describe("stepSimulation", () => {
  it("repels nearby nodes apart", () => {
    const nodes = [createNode("a", 0), createNode("b", 0.1)];
    const before = distance(nodes[0], nodes[1]);

    stepSimulation(nodes, []);

    expect(distance(nodes[0], nodes[1])).toBeGreaterThan(before);
  });

  it("pulls edge-connected distant nodes closer together", () => {
    const nodes = [createNode("a", -50), createNode("b", 50)];
    const edges: GraphEdge[] = [{ id: "a->b", source: "a", target: "b", type: "import" }];
    const before = distance(nodes[0], nodes[1]);

    for (let step = 0; step < 50; step += 1) {
      stepSimulation(nodes, edges);
    }

    expect(distance(nodes[0], nodes[1])).toBeLessThan(before);
  });

  it("centers an isolated node over time", () => {
    const nodes = [createNode("isolated", 100, -80, 60)];
    const before = positionMagnitude(nodes[0]);

    for (let step = 0; step < 100; step += 1) {
      stepSimulation(nodes, []);
    }

    expect(positionMagnitude(nodes[0])).toBeLessThan(before);
  });

  it("caps velocities at MAX_SPEED", () => {
    const nodes = [createNode("a", -1000), createNode("b", 1000)];

    stepSimulation(nodes, []);

    for (const node of nodes) {
      expect(Math.hypot(node.vx, node.vy, node.vz)).toBeLessThanOrEqual(MAX_SPEED);
    }
  });

  it("accepts an empty graph", () => {
    expect(() => stepSimulation([], [])).not.toThrow();
  });

  it("is deterministic for identical initial graph state", () => {
    const initialNodes = [createNode("a", -3, 2, 1), createNode("b", 4, -1, 6)];
    const edges: GraphEdge[] = [{ id: "a->b", source: "a", target: "b", type: "import" }];
    const firstRun = cloneNodes(initialNodes);
    const secondRun = cloneNodes(initialNodes);

    stepSimulation(firstRun, edges);
    stepSimulation(secondRun, edges);

    expect(firstRun).toEqual(secondRun);
  });
});