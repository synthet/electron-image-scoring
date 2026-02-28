# 01 - Diversity-Aware Selection (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Expose the configuration controls for the backend's diversity-aware selection algorithm (MMR) within the Electron UI.

## UI Integration Points

1. **Settings View (`src/components/Settings/SelectionSettings.tsx`)**
   - Provide a section for "Diversity-Aware Selection".
   - Include a toggle: "Enable Diversity Selection" (mapped to `selection.diversity_enabled`).
   - Include a slider: "Diversity Weight (Lambda)" (mapped to `selection.diversity_lambda`, range 0.0 - 1.0, step 0.05).
   - Display real-time value next to slider: `0.0 (Pure Diversity)` to `1.0 (Pure Quality)`. Default: `0.70`.

2. **IPC / Configuration Flow**
   - The React settings component calls `window.electron.ipcRenderer.send('save-config', { ... })`.
   - Ensure the electron main process writes these keys safely to the backend's `config.json`.

3. **Status Feedback**
   - In the Jobs Panel or when manually triggering "Re-score / Re-cull", display a status indicator when "Diversity Selection" is active.

## Design Considerations

- **Tooltips:** Add an info icon `(?)` next to the slider explaining:
  *"When processing stacks, a lower lambda ensures top picks are visually different from each other. A higher lambda ensures only the highest-scoring images are picked regardless of similarity."*
