// A small fake "repo" — a set of files with raw import statements.
// The parser in utils/parser.ts extracts a dependency graph from this.
// Swap this out later for real files pulled from the GitHub API.

export interface RawFile {
  path: string;
  content: string;
}

export const sampleRepo: RawFile[] = [
  {
    path: "src/main.tsx",
    content: `
import React from 'react';
import App from './App';
import './index.css';
`,
  },
  {
    path: "src/App.tsx",
    content: `
import React from 'react';
import Canvas3D from './components/Canvas3D';
import Sidebar from './components/Sidebar';
import { useAppStore } from './store/useAppStore';
`,
  },
  {
    path: "src/components/Canvas3D.tsx",
    content: `
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Node from './Node';
import Edge from './Edge';
import { useAppStore } from '../store/useAppStore';
`,
  },
  {
    path: "src/components/Node.tsx",
    content: `
import { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
`,
  },
  {
    path: "src/components/Edge.tsx",
    content: `
import { useMemo } from 'react';
`,
  },
  {
    path: "src/components/Sidebar.tsx",
    content: `
import { useAppStore } from '../store/useAppStore';
import { askAIArchitect } from '../utils/aiRouter';
`,
  },
  {
    path: "src/store/useAppStore.ts",
    content: `
import { create } from 'zustand';
import { ParseResult } from '../types/codebase';
`,
  },
  {
    path: "src/utils/aiRouter.ts",
    content: `
import { AIAuditRequest, AIAuditResponse } from '../types/codebase';
`,
  },
  {
    path: "src/hooks/useGraphLayout.ts",
    content: `
import { useEffect } from 'react';
import { GraphNode, GraphEdge } from '../types/codebase';
`,
  },
];
