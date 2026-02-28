# Office: Friday, 5 PM

3D physics sandbox built with Three.js + Cannon-es.

You’re in an office where you can grab and throw objects, toggle gravity on/off, and make a mess.

Project URL: https://office-friday-5pm.vercel.app/
Three.js: https://threejs.org/
Cannon-es: https://pmndrs.github.io/cannon-es/docs/index.html

## How to use

- Click **Start** on the intro screen
- Drag objects to grab/throw
- Press `Space` to toggle gravity
- Press `R` to reset the scene
- Click **Instructions** (bottom-right) for controls/objective

## Features I’m most proud of

- Smooth object interaction (grab/drag/throw) with physics syncing
- Gravity toggle with zero-g drift behavior
- Office-themed intro, HUD, and instructions UI
- Ambient audio + randomized impact thud SFX
- 3D scene art using imported `.glb` models + textures

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in terminal.

## Tech stack

- Vite
- Three.js
- Cannon-es

## Deployment

Deployed on Vercel as a static Vite app.

No API keys or private credentials are used in this project.
