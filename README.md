# ZARVIVAL

ZARVIVAL is a Java 2D platformer game developed with Java AWT/Swing. The game includes multiple playable characters, enemies, levels, audio, menus, options, credits, and pause/game-over screens.

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
