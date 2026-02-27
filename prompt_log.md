# Prompt Log

## AI Tools Used
- Claude (ideation and planning)
- Cursor with Claude/GPT (code generation and debugging)

## Development Process

### Day 1 - 2/25/2026

**Planning phase:**

Brainstormed project ideas for a creative web app. I wanted something visually impressive, interactive, and unique.

**Key prompts and decisions:**

1. "what's the best ROI library or package that i can use and make something really impressive... I used Three.js and really enjoyed using it. can you give me ideas for like a 5 hour project that will be amazing"
   - Claude suggested ~12 ideas. Rejected most (3D resume, flight tracker, music visualizer, GitHub city, data story generator, Spotify visualizer, shader gallery).

2. "i dont think this idea would be useful at all its cool to look at but i also want it to be visually appealing but also function some purpose"
   - Pushed back on the shader art gallery — wanted cool visuals + actual utility/interactivity.

3. "i liked the idea of a Black hole simulator and the Stress relief desk"
   - Claude broke down both. Black hole had risky shader debugging for 5 hours. Desk destruction needed complex shattering logic.

5. Settled on Zero Gravity Room — a 3D room where you toggle gravity on/off, grab and throw objects. Plan is to build this as the MVP and layer in destruction effects if time allows. Hits the "exceptionally rich interactivity" requirement.

**Setup phase:**

- Created GitHub repo, cloned locally
- Ran `npm init -y`, installed three.js, cannon-es, vite
- Added .cursorrules, .gitignore updates, prompt_log.md
- Learned about Node.js, npm, package.json, node_modules, Vite, cannon-es

**Prompts used:**

1. "I'm building a zero gravity room. a 3D interactive web experience where users can toggle gravity on/off and grab/throw objects around a room. Here's my current setup:

Vite as bundler
Three.js for 3D rendering
Cannon-es for physics
All packages already installed

I have no files yet other than package.json, .cursorrules, and .gitignore.
Let's start small. Create just these files:

index.html (basic HTML that loads main.js)
style.css (full screen canvas, no margins)
main.js (a Three.js scene with a lit floor and one cube sitting on it)

Add comments explaining what each part does. Keep it simple. no physics yet, just get something on screen"

2. "yes, let's add orbit controls for easier camera movement"

3. "let's add a constraining zoom/pan so the camera can’t go under the floor."

4. "Add a spacebar listener that toggles gravity between normal (-9.8) and zero. When gravity turns off, give objects a small random push so they drift."

5. "can we add a HUD please and make it clean and modern and add a little green light that has a soft glow showing gravity is on and when its off turn it red and do the same type of glow "

6. ""

Commit.
Prompt 5:

I'm going to load 3D models from Sketchfab (.glb files). Show me how to load one using GLTFLoader and give it a physics body.