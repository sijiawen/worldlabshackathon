# Creatorgen — AI Filmmaker Studio

> Built for the World Labs Hackathon

Creatorgen is a browser-based 3D scene composition tool that lets filmmakers and creators build immersive environments from 2D images — no 3D modeling experience required.

---

## What It Does

Upload a photo, generate a fully navigable 3D Gaussian Splat world via World Labs, then populate it with 3D objects converted from additional images via TRELLIS AI. Compose your scene, position elements with transform controls, and explore it in real time.

---

## Key Features

**World Generation**
- Upload any 2D image → World Labs Marble API converts it into a Gaussian Splat world
- Text prompt mode for purely descriptive world generation
- Real-time progress tracking with live status from the World Labs operations API
- Load existing `.spz` / `.ply` splat files directly

**Object Placement**
- Upload a photo of any real object → TRELLIS AI converts it to a `.glb` 3D mesh
- Import existing `.glb` or `.ply` files
- Quick primitive shapes (cube, sphere, cylinder) for blocking out scenes
- Select, move, rotate, and scale any object with transform gizmos (W / E / R hotkeys)

**Viewport**
- Real-time Gaussian Splat rendering integrated into a Three.js / React Three Fiber scene
- Orbit, pan, and zoom camera controls
- Scene objects panel — select and delete placed objects
- Toggleable grid overlay

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Turbopack) |
| 3D Rendering | React Three Fiber + Three.js |
| Gaussian Splats | `@mkkellogg/gaussian-splats-3d` (DropInViewer) |
| World Generation | World Labs Marble API (`/marble/v1/worlds:generate`) |
| Object Generation | Microsoft TRELLIS (HuggingFace Space, Gradio 4) |
| Language | JavaScript (React, Node.js) |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure API keys
Create `.env.local` in the project root:
```env
WORLDLABS_API_KEY=your_key_here
```
Get your World Labs API key at [platform.worldlabs.ai/api-keys](https://platform.worldlabs.ai/api-keys).

### 3. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## How to Use

1. **WORLD tab** — Select an image (or type a description), click **Generate World**. Generation takes 30 seconds to 5 minutes depending on model tier. Progress updates live.
2. **OBJECT tab** — Upload a photo of an object and click **Convert & Add to Scene** to generate a 3D mesh via TRELLIS, or upload a `.glb` directly.
3. **Transform** — Click any object in the scene to select it. Use **W / E / R** to switch between Move, Rotate, and Scale. Press **Delete** to remove.
4. **Navigate** — Left-click drag to orbit, right-click drag to pan, scroll to zoom.

---

## Architecture Notes

- Gaussian Splat rendering uses `DropInViewer` in `selfDrivenMode: false`, driven by R3F's `useFrame` loop (calling both `update()` and `render()` per frame)
- Local `.spz` / `.ply` files are proxied through `/api/splat-proxy` so the splat library can detect format from the URL extension — blob URLs have no extension and cause format detection failures
- World Labs image uploads go through a 3-step media asset flow: prepare → upload to GCS → generate
- TRELLIS images are uploaded to the Gradio `/upload` endpoint first, then the server-side path is passed to `/call/image_to_3d`

---

## Project Structure

```
app/
  api/
    world/          # World Labs generation + polling
    trellis/        # TRELLIS 2D→3D conversion
    splat-proxy/    # Serves local splat files with correct extension
components/
  Viewport.js       # Main R3F canvas + scene management
  Sidebar.js        # World / Object panels
  WorldSplat.js     # Gaussian Splat renderer (DropInViewer integration)
  StatusBar.js      # Bottom status + world generation progress
```
