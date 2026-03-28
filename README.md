<div align="center">

# FilmAI
### AI Copilot for Film Production

From script upload to continuity-checked final cut, in one streamlined workflow.

![Platform](https://img.shields.io/badge/Platform-Web-orange)
![Frontend](https://img.shields.io/badge/Frontend-Next.js-black)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![AI](https://img.shields.io/badge/AI-Gemini%20%2B%20Veo-blue)
![Status](https://img.shields.io/badge/Project-Hackathon%20Build-success)

</div>

---

## Overview

FilmAI helps filmmakers, producers, directors, and indie creators move from script to screen faster.  
It combines script understanding, AI asset generation, scene generation, editing controls, and continuity checks in one product.

## Why FilmAI

Traditional pre-production and editing pipelines are slow, repetitive, and expensive. FilmAI reduces effort in:

- Script breakdown (characters, props, costumes, scenes)
- Visual reference generation for pre-production
- Scene-by-scene video generation and revision
- Continuity quality checks before final export

## Who It Helps

- Film directors and producers
- Pre-production teams
- Independent creators and students
- Anyone building short films or cinematic videos

---

## Workflow (Step by Step)

| Step | Stage | What happens |
|---|---|---|
| 1 | Script Upload | User uploads `.txt` or `.pdf` script |
| 2 | Script Analysis | Gemini identifies characters, costumes, props, and scenes |
| 3 | Asset Dashboard | User generates and edits character/prop/costume visuals |
| 4 | Custom References | User can upload own photos (example: "make this character look like me") |
| 5 | Scene Generation | Veo generates videos scene by scene |
| 6 | Scene Refinement | User can regenerate scenes, upload footage, and apply transformations |
| 7 | Continuity Analysis | AI checks merged scene flow for continuity errors |
| 8 | Final Export | Scenes are assembled into final downloadable video |

---

## Models Used

| Model | Role in Pipeline |
|---|---|
| `gemini-flash-latest` | Script analysis, edit instruction interpretation |
| `gemini-2.5-flash-image` | Character, prop, and costume image generation |
| `gemini-2.5-flash` | Continuity analysis on scene footage |
| `veo-3.1-fast-generate-preview` | Scene video generation and regeneration |

---

## Key Capability Highlights

- End-to-end AI-assisted film production flow
- Fine-grained scene review before final assembly
- Human-in-the-loop control at every important stage
- Continuity error detection to save rework time and production cost

---

## Current Limitations

- Hackathon scope is limited to Google Gemini ecosystem APIs/models.
- Veo has multimodal input constraints per request (limited references).
- Some advanced production controls are still iterative in this build.

## Future Scope

- Integrate **Lyria** for background score/music generation.
- Use Gemini for richer dialogue generation and voice-driven enhancements.
- Add more granular cinematic controls (shots, motion, pacing, transitions).
- Expand collaboration features for director/editor/producer teamwork.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| AI/Gen | Google GenAI SDK (Gemini + Veo) |
| Media Pipeline | Local file storage + FFmpeg assembly |

---

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

---

## Notes

- This repository is focused on hackathon speed with a full demonstrable workflow.
- The architecture is ready to evolve toward a production-grade film copilot.
