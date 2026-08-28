import { vi } from "vitest";

const webglContext = {
  canvas: null,
  getExtension: () => null,
  getParameter: () => 0,
  getShaderPrecisionFormat: () => ({ precision: 0, rangeMin: 0, rangeMax: 0 }),
  viewport: () => {},
  clearColor: () => {},
  clearDepth: () => {},
  clearStencil: () => {},
  enable: () => {},
  disable: () => {},
  depthFunc: () => {},
  frontFace: () => {},
  cullFace: () => {},
  blendEquation: () => {},
  blendFunc: () => {},
  colorMask: () => {},
  clear: () => {},
};

export function mockCanvas() {
  return vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function getContext(this: HTMLCanvasElement, contextId: string) {
      if (contextId === "webgl" || contextId === "webgl2") {
        return { ...webglContext, canvas: this } as never;
      }

      return null;
    });
}