# 06 - Smart Stack Representative (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](README.md).*

## Goal

Allow users to configure whether stack covers display the highest-scoring image or the most "representative" image (the one closest to the stack's embedding centroid).

## UI Integration Points

1. **Settings View (`src/components/Settings/ClusteringSettings.tsx`)**
   - In the "Stacks & Clustering" section, add a dropdown: **`Stack Cover Strategy`**.
   - Options:
     - `Top Score`: Always displays the image with the highest `score_general`.
     - `Centroid Representative`: Displays the image visually closest to the average of all images in the stack.
     - `Balanced`: Uses centroid but rejects images below a certain quality threshold.

2. **Stack View Rendering**
   - The UI doesn't compute the representative; it just consumes the `best_image_id` provided by the backend's clustering algorithm.
   - Changing the setting in the UI triggers a re-clustering or a metadata refresh on the backend viaIPC `save-config`.

3. **User Feedback**
   - When "Centroid Representative" is active, consider adding a tiny icon (e.g., a bullseye or target) to the stack cover thumbnail to indicate the cover was chosen for representativeness, not pure score.

## Design Considerations

- Changing this setting in real-time requires the backend to either re-evaluate all stack covers or pull from a pre-computed `centroid_id` column. The Electron UI should show a global loading spinner or progress bar if this operation takes noticeable time.
