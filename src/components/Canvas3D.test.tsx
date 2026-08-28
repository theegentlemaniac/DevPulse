import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GraphEdge, GraphNode } from "../types/codebase";
import { mockCanvas } from "../test/mockCanvas";
import { useAppStore } from "../store/useAppStore";
import Canvas3D from "./Canvas3D";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: () => undefined,
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
  Stars: () => null,
  Text: () => null,
}));

function createNode(id: string): GraphNode {
  return {
    id,
    label: id,
    path: id,
    extension: "ts",
    lineCount: 1,
    sizeBytes: 1,
    dependencies: [],
    dependents: [],
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
  };
}

describe("Canvas3D", () => {
  beforeEach(() => {
    mockCanvas();
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    const edges: GraphEdge[] = [
      { id: "a->b", source: "a", target: "b", type: "import" },
      { id: "b->c", source: "b", target: "c", type: "import" },
    ];
    useAppStore.setState({ nodes, edges, selectedNodeId: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts the scene without throwing", () => {
    let mountError: unknown;

    try {
      render(<Canvas3D />);
    } catch (error: unknown) {
      mountError = error;
    }

    expect(mountError, `Canvas3D mount failed: ${String(mountError)}`).toBeUndefined();
    expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
  });
});

// Visual position regression needs @react-three/test-renderer or Playwright screenshot diffs.