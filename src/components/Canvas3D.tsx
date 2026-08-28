import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { useAppStore } from "../store/useAppStore";
import { useGraphLayout } from "../hooks/useGraphLayout";
import Node from "./Node";
import Edge from "./Edge";

// Runs inside the Canvas (needs the R3F render loop context for useFrame)
function Scene() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const selectNode = useAppStore((s) => s.selectNode);

  useGraphLayout(nodes, edges);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 22]} fov={55} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={60}
      />

      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-10, -5, -10]} intensity={0.3} color="#22d3ee" />

      <Stars radius={80} depth={40} count={2000} factor={2} fade speed={0.5} />

      {/* Clicking empty space deselects the current node */}
      <mesh
        position={[0, 0, -50]}
        onClick={() => selectNode(null)}
        visible={false}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial />
      </mesh>

      {edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) return null;
        return (
          <Edge key={edge.id} edge={edge} sourceNode={sourceNode} targetNode={targetNode} />
        );
      })}

      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </>
  );
}

export default function Canvas3D() {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      className="w-full h-full"
      style={{ background: "#0a0a0f" }}
    >
      <Scene />
    </Canvas>
  );
}
