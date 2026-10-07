# ZARVIVAL

ZARVIVAL includes the original Java AWT/Swing platformer and a playable browser adaptation ready to deploy to Vercel.

## Browser version

Requires Node.js 22 or newer. No npm dependencies or Java installation are needed for the web build.

```powershell
npm install
npm run dev
```

Open http://localhost:3000. Select Goblin, Rez, or Skull and defeat all enemies to advance through the five original level maps.

- Move: A / D or left / right arrows
- Jump: Space or up arrow
- Attack: J or left click
- Power attack: K or right click (uses power, which regenerates)
- Pause: Escape or the Pause button
- Touch devices: use the on-screen controls
- Sound: enable with the Sound button; browsers require a user gesture before audio can play

The browser adaptation reuses the original sprite sheets and RGB-encoded level maps, with a JavaScript Canvas engine for movement, combat, enemies, potions, breakable containers, spikes, water, and cannons. It includes pause, retry, and game-completion screens. Physics, enemy behavior, and UI are adapted for the browser; this is not an exact emulation of the Java application. The original Java sources are preserved.

## Deploy to Vercel

1. Push this repository to your Git provider and import it into Vercel.
2. Use the **repository root** as the Root Directory, with the **Other** framework preset.
3. Deploy. The committed `vercel.json` sets **Build Command** to `npm run build` and **Output Directory** to `dist`.

No environment variables or backend services are required. The build copies `web/` and game resources into `dist/`. Keep `ZARVIVAL_FINAL/ZAR Studio(Final)/res/` in the repository: it is required during the build. Build scripts resolve paths from their own location and work on Windows and Linux.

You can also deploy from the repository root with the Vercel CLI:

```powershell
npx vercel
```

For a local production build and game-engine checks:

```powershell
npm run build
npm test
```

Vercel configuration reference: https://vercel.com/docs/project-configuration/vercel-json

## Original desktop game

## Requirements

- Java Development Kit (JDK) 25 or newer
- IntelliJ IDEA or Eclipse (optional)

## Project Layout

The Java project is located in `ZARVIVAL_FINAL/ZAR Studio(Final)`.

- `src/` - Java source code
- `res/` - game levels, audio, and other resources
- `bin/` - compiled project output and runtime data
- `src/main/MainClass.java` - application entry point

## Running the Game

### IntelliJ IDEA

1. Open `ZARVIVAL_FINAL/ZAR Studio(Final)` as a project.
2. Mark `src` as a Sources Root if needed.
3. Run `main.MainClass`.

Keep the working directory set to `ZARVIVAL_FINAL/ZAR Studio(Final)` so the game can find its resources.

### Command Line

From the project directory, compile the source files into a temporary output directory:

```powershell
cd "ZARVIVAL_FINAL\ZAR Studio(Final)"
New-Item -ItemType Directory -Force out\classes
javac -d out\classes (Get-ChildItem -Recurse -Filter *.java src).FullName
java -cp "out\classes;res" main.MainClass
```

## Controls

Use the keyboard and mouse to navigate menus and control the selected character. In-game controls are handled by `inputs.KeyboardInputs` and `inputs.MouseInputs`.
