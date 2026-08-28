import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIAuditResponse, GraphNode } from "../types/codebase";
import { useAppStore } from "../store/useAppStore";
import { askAIArchitect } from "../utils/aiRouter";
import Sidebar from "./Sidebar";

vi.mock("../utils/aiRouter", () => ({
  askAIArchitect: vi.fn(),
}));

const selectedNode: GraphNode = {
  id: "src/example.ts",
  label: "example.ts",
  path: "src/example.ts",
  extension: "ts",
  lineCount: 42,
  sizeBytes: 1024,
  dependencies: ["src/dependency.ts"],
  dependents: ["src/consumer.ts"],
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
};

const audit: AIAuditResponse = {
  summary: "A concise architecture summary.",
  qualityScore: 88,
  issues: ["One issue"],
  suggestions: ["One suggestion"],
};

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    hoveredNodeId: null,
    loadingState: "idle",
    errorMessage: null,
  });
});

describe("Sidebar", () => {
  it("renders an empty state without file details when no node is selected", () => {
    render(<Sidebar />);

    expect(screen.getByText("Click a node in the 3D graph to inspect a file.")).toBeInTheDocument();
    expect(screen.queryByText("Path")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask AI Architect" })).not.toBeInTheDocument();
  });

  it("renders selected-node metadata, dependencies, and dependents", () => {
    useAppStore.setState({ nodes: [selectedNode], selectedNodeId: selectedNode.id });

    render(<Sidebar />);

    expect(screen.getByRole("heading", { name: "example.ts" })).toBeInTheDocument();
    expect(screen.getByText("src/example.ts")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("1024B")).toBeInTheDocument();
    expect(screen.getByText("→ src/dependency.ts")).toBeInTheDocument();
    expect(screen.getByText("← src/consumer.ts")).toBeInTheDocument();
  });

  it("clears the selected node when the close button is clicked", async () => {
    const user = userEvent.setup();
    const selectNode = vi.spyOn(useAppStore.getState(), "selectNode");
    useAppStore.setState({ nodes: [selectedNode], selectedNodeId: selectedNode.id });

    render(<Sidebar />);
    await user.click(screen.getByRole("button", { name: "Close sidebar" }));

    expect(selectNode).toHaveBeenCalledWith(null);
    expect(useAppStore.getState().selectedNodeId).toBeNull();
  });

  it("shows loading immediately and renders a completed AI audit", async () => {
    const user = userEvent.setup();
    let resolveAudit: (value: AIAuditResponse) => void = () => {};
    vi.mocked(askAIArchitect).mockReturnValueOnce(
      new Promise<AIAuditResponse>((resolve) => {
        resolveAudit = resolve;
      }),
    );
    useAppStore.setState({ nodes: [selectedNode], selectedNodeId: selectedNode.id });

    render(<Sidebar />);
    const button = screen.getByRole("button", { name: "Ask AI Architect" });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: /Analyzing/ })).toBeInTheDocument();

    resolveAudit(audit);

    expect(await screen.findByText(audit.summary)).toBeInTheDocument();
    expect(screen.getByText("88/100")).toBeInTheDocument();
    expect(screen.getByText("One issue")).toBeInTheDocument();
    expect(screen.getByText("One suggestion")).toBeInTheDocument();
  });

  it("handles a rejected AI audit and restores the button", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(askAIArchitect).mockRejectedValueOnce(new Error("Request failed"));
    useAppStore.setState({ nodes: [selectedNode], selectedNodeId: selectedNode.id });

    render(<Sidebar />);
    await user.click(screen.getByRole("button", { name: "Ask AI Architect" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ask AI Architect" })).toBeEnabled();
    });
    expect(consoleError).toHaveBeenCalled();
  });
});