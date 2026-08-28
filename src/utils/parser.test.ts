import { describe, expect, it } from "vitest";
import { sampleRepo, type RawFile } from "../data/sampleRepo";
import { parseRepo } from "./parser";

function getNode(files: RawFile[], path: string) {
  const node = parseRepo(files).nodes.find((candidate) => candidate.path === path);
  expect(node, `Expected a graph node for ${path}`).toBeDefined();
  return node!;
}

describe("parseRepo", () => {
  it("creates a node for every sample file and resolves App to Canvas3D", () => {
    const result = parseRepo(sampleRepo);

    expect(result.nodes).toHaveLength(9);
    expect(result.edges).toContainEqual({
      id: "src/App.tsx->src/components/Canvas3D.tsx",
      source: "src/App.tsx",
      target: "src/components/Canvas3D.tsx",
      type: "import",
    });
  });

  it("resolves sibling, parent, and explicit index relative imports", () => {
    const files: RawFile[] = [
      {
        path: "src/components/Consumer.ts",
        content: `
          import Foo from "./Foo";
          import bar from "../utils/bar";
          import Sub from "./sub/index.ts";
        `,
      },
      { path: "src/components/Foo.ts", content: "export const Foo = true;" },
      { path: "src/utils/bar.ts", content: "export const bar = true;" },
      { path: "src/components/sub/index.ts", content: "export const Sub = true;" },
    ];

    expect(parseRepo(files).edges).toEqual([
      expect.objectContaining({ source: "src/components/Consumer.ts", target: "src/components/Foo.ts" }),
      expect.objectContaining({ source: "src/components/Consumer.ts", target: "src/utils/bar.ts" }),
      expect.objectContaining({ source: "src/components/Consumer.ts", target: "src/components/sub/index.ts" }),
    ]);
  });

  it("does not create edges for external package imports", () => {
    const files: RawFile[] = [
      {
        path: "src/Consumer.tsx",
        content: `
          import React from "react";
          import { Canvas } from "@react-three/fiber";
        `,
      },
    ];

    const result = parseRepo(files);

    expect(result.edges).toEqual([]);
    expect(result.nodes.every((node) => node.dependencies.length === 0)).toBe(true);
    expect(result.nodes.flatMap((node) => node.dependencies)).not.toContain("react");
    expect(result.nodes.flatMap((node) => node.dependencies)).not.toContain("@react-three/fiber");
  });

  it("captures both directions of an import cycle without self-edges or duplicates", () => {
    const files: RawFile[] = [
      { path: "src/FileA.ts", content: 'import FileA from "./FileA"; import FileB from "./FileB";' },
      { path: "src/FileB.ts", content: 'import FileA from "./FileA";' },
    ];

    const result = parseRepo(files);

    expect(result.edges).toHaveLength(2);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "src/FileA.ts", target: "src/FileB.ts" }),
        expect.objectContaining({ source: "src/FileB.ts", target: "src/FileA.ts" }),
      ]),
    );
    expect(getNode(files, "src/FileA.ts").dependencies).toEqual(["src/FileB.ts"]);
    expect(getNode(files, "src/FileA.ts").dependents).toEqual(["src/FileB.ts"]);
    expect(getNode(files, "src/FileB.ts").dependencies).toEqual(["src/FileA.ts"]);
    expect(getNode(files, "src/FileB.ts").dependents).toEqual(["src/FileA.ts"]);
  });

  it("creates nodes with empty dependency arrays for files with no imports", () => {
    const node = getNode([{ path: "src/standalone.ts", content: "export const value = 1;" }], "src/standalone.ts");

    expect(node.dependencies).toEqual([]);
  });

  it("parses multi-line imports", () => {
    const files: RawFile[] = [
      {
        path: "src/Consumer.ts",
        content: `
          import {
            A,
            B,
            C,
          } from "./values";
        `,
      },
      { path: "src/values.ts", content: "export const A = 1;" },
    ];

    const edge = parseRepo(files).edges.find(
      (candidate) => candidate.source === "src/Consumer.ts" && candidate.target === "src/values.ts",
    );

    expect(edge, "Multi-line imports require the Phase 2.3 AST parser if this assertion fails.").toBeDefined();
  });

  it("assigns the expected extension to supported and other file types", () => {
    const files: RawFile[] = [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "css",
      "md",
      "py",
    ].map((extension) => ({ path: `src/file.${extension}`, content: "" }));

    const extensionsByPath = Object.fromEntries(
      parseRepo(files).nodes.map((node) => [node.path, node.extension]),
    );

    expect(extensionsByPath).toMatchObject({
      "src/file.ts": "ts",
      "src/file.tsx": "tsx",
      "src/file.js": "js",
      "src/file.jsx": "jsx",
      "src/file.json": "json",
      "src/file.css": "css",
      "src/file.md": "md",
      "src/file.py": "other",
    });
  });

  it("counts non-blank lines only", () => {
    const node = getNode(
      [{ path: "src/spaced.ts", content: "\nconst first = 1;\n  \nconst second = 2;\n\n" }],
      "src/spaced.ts",
    );

    expect(node.lineCount).toBe(2);
  });
});