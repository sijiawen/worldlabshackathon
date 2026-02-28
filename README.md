# AXIOM — AI Filmmaker Studio

A 3D viewport for AI filmmakers. Generate Gaussian Splat worlds from images, convert 2D objects into 3D meshes, and compose scenes with full camera freedom.

## Features

| Feature | API / Tech |
|---|---|
| 2D image → 3D mesh | TRELLIS (HuggingFace) |
| 2D image → 3D Gaussian Splat world | World Labs Marble API |
| Gaussian Splat viewport (.spz/.ply) | @mkkellogg/gaussian-splats-3d |
| 3D mesh viewport (.glb) | React Three Fiber + drei |
| Object placement & transform | TransformControls (drei) |
| Camera movement | OrbitControls (drei) |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your **World Labs API key**:
- Sign in at https://platform.worldlabs.ai
- Add billing credits
- Generate an API key at https://platform.worldlabs.ai/api-keys

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Architecture

```
app/
  api/
    world/route.js     ← World Labs API (generate + poll)
    trellis/route.js   ← TRELLIS HuggingFace API
  page.js
  layout.js
  globals.css

components/
  Viewport.js          ← Main layout + Canvas orchestration
  Sidebar.js           ← World Gen, Object Convert, Insert panels
  Toolbar.js           ← Transform mode controls (Move/Rotate/Scale)
  StatusBar.js         ← Bottom status + progress bar
  MeshObject.js        ← GLB / PLY / primitive renderer
  WorldSplat.js        ← Gaussian Splat world renderer
```

## World Labs API Flow

The World Labs API is **async** — it doesn't return the world immediately:

1. `POST /marble/v1/worlds:generate` → returns `operation_id`
2. Poll `GET /marble/v1/operations/{operation_id}` every 5s
3. When `done: true`, read `response.assets.splats.spz_urls` for the splat files

Generation takes **~5 minutes** with `Marble 0.1-plus`. Use `Marble 0.1-mini` for 30-45s drafts.

## TRELLIS API

TRELLIS runs as a Gradio Space on HuggingFace. The API endpoint is:
```
POST https://trellis-community-trellis.hf.space/run/predict
```

Note: HuggingFace spaces may go to sleep. If requests fail, visit the space first to wake it:  
https://huggingface.co/spaces/trellis-community/TRELLIS

## Viewport Controls

| Action | Control |
|---|---|
| Orbit camera | Left mouse drag |
| Pan camera | Right mouse drag |
| Zoom | Scroll wheel |
| Move object | Select object → MOVE mode → drag handles |
| Rotate object | Select object → ROTATE mode → drag handles |
| Scale object | Select object → SCALE mode → drag handles |
| Delete object | Select object → DELETE button |

## Inserting Assets

You can insert:
- `.glb` — Standard 3D mesh format (from TRELLIS, Blender, etc.)
- `.ply` — Point cloud / Gaussian Splat (from 3D Gaussian Splatting tools)
- `.spz` — Compressed Gaussian Splat (from World Labs exports)

## Known Limitations

1. **TRELLIS fn_index** — The exact Gradio function index for TRELLIS may need adjustment. Check the Space's API page at `https://trellis-community-trellis.hf.space/?view=api` for the correct endpoint.

2. **SharedArrayBuffer** — The `@mkkellogg/gaussian-splats-3d` library requires `Cross-Origin-Opener-Policy: same-origin` headers (configured in `next.config.js`). Some hosting environments may block this.

3. **SPZ format** — SPZ is a proprietary format. Ensure the version of `@mkkellogg/gaussian-splats-3d` you install supports it.

4. **CORS** — World Labs SPZ URLs may have CORS restrictions. If splats don't load, you may need to proxy the download through your own API route.
