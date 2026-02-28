# Prompt Log

## AI Tools Used
- Claude (ideation and planning)
- Cursor with Claude/GPT (code generation and debugging)

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

6. "what part of the code makes the wall invisble so we can see inside of it? and should we keep this as a feature where you can zoom out and see the box of the room or no? im not sure if we should do this im envioning making an office desk with an old monitor and a chair and a mug and making it like an office rage room. i would like to use 3D models from Sketchfab (.glb files). Show me how to load one using GLTFLoader and give it a physics body. is this a good move? what do you think?"

7. "can you point me to the lines that handle the room being visible from outside and look in the room from the direction im viewing the room from."

8. "i added the .glb file to the models folder. Show me how to load one using GLTFLoader and give it a physics body. show me the basics i've never done this"

9. "let's add in the soft ambient hum how would we go about doing this also the SFX for grab/throw impacts. i just want a thud nothing much but do you want me to go find these mp3? i added three mp3 in @audio  and i added one for the buzz and two for falls or thuds that any item can have when they fall just choose one of the two at random for any given fall."

10. "is there anything else we should add? i feel like it's done in terms of functionality. i want to add a start screen like a start sequence i feel like it should be something like Office: Friday 5 PM or something like that because you just get to move things around and then like a description that this is a physics engine use with WebGL. maybe i should add like a small little story. im just throwing ideas what do you think we should do? "

11. "i also noticed that when i move the desk first the items just stay floating so they need to be woken up since the beginning also i notice when i move the big table first the items clip through i dont know how hard it would be to fix that."

12. "can we add a functionality that if you press R the scene restarts like again. should we add instructions to the UI? and we could add there space toggles gravity, R to reset, and objetive "Make a mess.""

13. "can you do a better job of spacing making sure that it's more clear what the buttons do something like

R - Reset Scene
Space - Toggle Gravity"