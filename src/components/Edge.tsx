import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GraphEdge, GraphNode } from "../types/codebase";
import { useAppStore } from "../store/useAppStore";

interface EdgeProps {
  edge: GraphEdge;
  sourceNode: GraphNode;
  targetNode: GraphNode;
}

export default function Edge({ edge, sourceNode, targetNode }: EdgeProps) {
  const lineRef = useRef<THREE.Line>(null);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);

  const isHighlighted =
    selectedNodeId === edge.source || selectedNodeId === edge.target;

  const geometry = useRef(new THREE.BufferGeometry());
  const positions = useRef(new Float32Array(6)); // 2 points * xyz

  useFrame(() => {
    // Slight curve: bow the midpoint upward on Y so parallel edges don't overlap
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2 + 0.4;
    const midZ = (sourceNode.z + targetNode.z) / 2;

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z)
    );

    const points = curve.getPoints(12);
    geometry.current.setFromPoints(points);

    if (lineRef.current) {
      lineRef.current.geometry = geometry.current;
    }
  });

  return (
    // @ts-expect-error - 'line' primitive typing quirk with @react-three/fiber + strict TS
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        color={isHighlighted ? "#22d3ee" : "#3a3a4a"}
        transparent
        opacity={isHighlighted ? 0.9 : 0.35}
        linewidth={1}
      />
    </line>
  );
}
