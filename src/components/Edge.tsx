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
  const flowRef = useRef<THREE.Mesh>(null);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);

  const isHighlighted =
    selectedNodeId === edge.source || selectedNodeId === edge.target;

  const geometry = useRef(new THREE.BufferGeometry());
  const positions = useRef(new Float32Array(6)); // 2 points * xyz

  useFrame((state) => {
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
    if (flowRef.current) {
      const progress = (state.clock.getElapsedTime() * 0.16 + edge.id.length * 0.071) % 1;
      flowRef.current.position.copy(curve.getPointAt(progress));
    }
  });

  return (
    <>
      {/* @ts-expect-error - 'line' primitive typing quirk with @react-three/fiber + strict TS */}
      <line ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={isHighlighted ? "#22d3ee" : "#3a3a4a"}
          transparent
          opacity={isHighlighted ? 0.95 : 0.38}
          linewidth={1}
        />
      </line>
      <mesh ref={flowRef}>
        <sphereGeometry args={[isHighlighted ? 0.07 : 0.04, 10, 10]} />
        <meshBasicMaterial color={isHighlighted ? "#67e8f9" : "#4b6470"} transparent opacity={isHighlighted ? 1 : 0.55} />
      </mesh>
    </>
  );
}
