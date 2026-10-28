# Pathwise — AI Algorithm Simulator

A client-side educational graph-search playground built with React, TypeScript, Vite, and Tailwind CSS. It has no accounts, database, backend, or persistent storage.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## What's included

- Two-panel dark interface with graph canvas and algorithm controls.
- Seven algorithm implementations: A*, Greedy Best-First, Beam Search, Hill Climbing, BFS, DFS, and Dijkstra.
- Event-based simulation with play/pause, forward/backward stepping, reset, speed, current event explanations, and live metrics.
- Sample weighted graph, node and edge creation, node deletion, edge deletion, heuristic editing, edge-weight editing, start/goal selectors, directed-edge mode, grid and label toggles.
- Offline educational question helper. It uses deterministic explanations, not a cloud LLM.
- No user data is stored; refreshing resets the app.

## Current scope and limitations

This is an initial working implementation, not yet the complete master-prompt specification. The canvas uses a lightweight SVG-based graph renderer. Node drag-and-drop, robust undo/redo, full tree-mode validation, natural-language graph generation, algorithm comparison, and a comprehensive automated test suite still need implementation. The question helper is rule-based and should not be described as LLM-powered. For A*, provide meaningful heuristic values; optimality depends on the heuristic assumptions. Dijkstra and A* reject negative weights in the UI.

## Project structure

- `src/algorithms.ts` — typed graph model, sample graph, and algorithm event generation.
- `src/App.tsx` — application layout, controls, canvas rendering, playback, and offline help.
- `src/styles.css` — responsive dark-theme styling.

## Notes

Algorithm output is generated locally in the browser. No API key is required. The current UI includes notifications for features that are not yet implemented rather than pretending those features work.
