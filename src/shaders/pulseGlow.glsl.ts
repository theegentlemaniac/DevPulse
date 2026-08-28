// Stub for a custom GLSL shader — e.g. an animated pulse traveling along
// edges to represent live "data flow" / telemetry between files.
//
// Wire this up with THREE.ShaderMaterial inside Edge.tsx, driven by a
// `uTime` uniform updated in useFrame. See Copilot Prompt #2 in the README
// for a ready-to-paste implementation prompt.

export const pulseVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const pulseFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    float pulse = fract(vUv.x * 3.0 - uTime * 1.5);
    float glow = smoothstep(0.0, 0.15, pulse) * smoothstep(0.3, 0.15, pulse);
    gl_FragColor = vec4(uColor, glow * 0.9);
  }
`;
