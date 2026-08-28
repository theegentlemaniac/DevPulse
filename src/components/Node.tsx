import { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { GraphNode } from "../types/codebase";
import { useAppStore } from "../store/useAppStore";

interface NodeProps {
  node: GraphNode;
}

const COLOR_BY_EXT: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#61dafb",
  js: "#f7df1e",
  jsx: "#f0db4f",
  json: "#8bc34a",
  css: "#e91e63",
  md: "#9e9e9e",
  other: "#666666",
};

// tsx/jsx (React components) render as cubes to visually distinguish
// components from plain modules; everything else renders as a sphere.
function usesCubeGeometry(ext: string): boolean {
  return ext === "tsx" || ext === "jsx";
}

export default function Node({ node }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const hoveredNodeId = useAppStore((s) => s.hoveredNodeId);
  const selectNode = useAppStore((s) => s.selectNode);
  const hoverNode = useAppStore((s) => s.hoverNode);

  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id;
  const color = COLOR_BY_EXT[node.extension] ?? COLOR_BY_EXT.other;

  // Size scales gently with line count so bigger files read as visually "heavier"
  const radius = useMemo(() => 0.25 + Math.min(node.lineCount / 100, 1) * 0.35, [node.lineCount]);

  // Position is read directly from the mutable GraphNode every frame —
  // this is what makes the force layout in useGraphLayout "just work"
  // without routing through React state.
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(node.x, node.y, node.z);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoverNode(node.id);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    hoverNode(null);
    document.body.style.cursor = "auto";
  };

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {usesCubeGeometry(node.extension) ? (
        <boxGeometry args={[radius * 1.6, radius * 1.6, radius * 1.6]} />
      ) : (
        <sphereGeometry args={[radius, 24, 24]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : "#000000"}
        emissiveIntensity={isSelected ? 0.8 : 0}
        roughness={0.4}
        metalness={0.3}
        opacity={isHovered || isSelected ? 1 : 0.9}
        transparent
      />
    </mesh>
  );
}
