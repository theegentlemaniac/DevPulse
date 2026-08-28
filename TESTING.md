# Testing

Run `npm run verify` before considering a feature complete. It runs coverage,
strict TypeScript checking, and a production build in that order.

- `src/test/smoke.test.ts`: verifies the Vitest runner and jsdom setup.
- `src/utils/parser.test.ts`: covers import parsing, path resolution, graph metadata, and line counts.
- `src/hooks/useGraphLayout.test.ts`: covers force simulation behavior, velocity bounds, and determinism.
- `src/components/Sidebar.test.tsx`: covers selected-file details and AI audit loading, success, and failure states.
- `src/components/Canvas3D.test.tsx`: shallowly verifies that the mocked R3F scene mounts with a small graph.
- `src/utils/githubFetcher.test.ts`: covers GitHub API filtering, decoding, rate limits, and branch fallback.

Visual or pixel-level 3D rendering correctness is intentionally outside unit-test
scope because jsdom has no real WebGL renderer. Add Playwright screenshot diffs
later if visual regression coverage becomes important.