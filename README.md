# Little Bolt, Big Moon

![Little Bolt, Big Moon – Game Cover](img/cover/little-bolt-big-moon-cover-v1.png)

> One discarded robot. One enormous tower. One friend waiting on the moon.

**Little Bolt, Big Moon** is a vertical HTML5 Canvas precision platformer.
Guide Byte from a scrapyard through five industrial biomes, master charged
jumps and combat encounters, and reach the Moon Warden at the top.

## Tech Stack

- HTML5 Canvas for the game world and rendering
- vanilla JavaScript with native ES modules
- object-oriented gameplay architecture without a framework or bundler
- semantic HTML and responsive CSS for menus, dialogs, and touch controls
- JSON and configuration modules for levels, balancing, and asset metadata
- `localStorage` for settings, tutorial progress, and local records
- Node.js for the lightweight local development server and test runner
- ESLint, TypeScript checking, and native Node.js acceptance tests

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22 or newer
- npm, included with Node.js
- a modern browser with Canvas and native ES module support

### Installation

```bash
git clone https://github.com/willidevac/Little-Bolt-Big-Moon.git
cd Little-Bolt-Big-Moon
npm install
npm run dev
```

Open `http://127.0.0.1:4173` in your browser. The local server is required
because the application loads HTML fragments and native ES modules. There is
no build step, backend, framework, or external runtime service.

## Quality Checks

Run the complete local release gate with:

```bash
npm run check
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the lightweight local development server |
| `npm test` | Run the complete, automatically discovered acceptance suite |
| `npm run lint` | Check production and test code with ESLint |
| `npm run typecheck` | Check the deterministic core modules with TypeScript |
| `npm run test:quick` | Check clean code, imports, and runtime assets |
| `npm run test:architecture` | Verify import and architecture boundaries |
| `npm run test:release` | Verify central gameplay, UI, and responsive flows |

The acceptance suite currently covers 97 mandatory quality areas, including
game states, physics, combat, audio storage, responsive controls, tutorial
progression, the boss encounter, and release-critical UI paths.

## Technical Documentation

- [`docs/project-structure.md`](docs/project-structure.md) – folders, modules, and responsibilities
- [`docs/quality-audit.md`](docs/quality-audit.md) – visible and technical acceptance criteria
- [`docs/game-design.md`](docs/game-design.md) – story, progression, and gameplay pillars
- [`docs/tutorial-plan.md`](docs/tutorial-plan.md) – tutorial design and acceptance criteria
- [`docs/asset-guide.md`](docs/asset-guide.md) – visual direction and asset dimensions
- [`docs/asset-licensing.md`](docs/asset-licensing.md) – asset origin and usage rights
- [`tests/README.md`](tests/README.md) – test layers and release gates
- [`data/asset-credits.json`](data/asset-credits.json) – machine-readable asset credits

## Recommended Review Path

For a course or portfolio review, start with **Tutorial – recommended**. It
presents the checklist-relevant mechanics, resources, enemy variants, and a
dedicated tutorial boss in a compact level. The main game is intentionally a
much harder precision-platforming challenge and is best tested afterwards.

## Mentor Review Mode

Review Mode is an optional, unscored QA tool for quickly inspecting the large
vertical world. It is not an easier version of the game and is not the
recommended way to learn the mechanics. Use the guided Tutorial for a normal
feature review.

To unlock Review Mode, click the version label five times and enter
`MOON-REVIEW-150`. The toolbar can jump to a biome or measured height, while
the arrow keys enable free flight and Shift increases flight speed. Review
runs never write scores, heights, or times to the normal local records.

## Gameplay Overview

Byte climbs one continuous 150,000-pixel world instead of moving through
separate horizontal stages. Precision jumps, wall rebounds, recovery after
long falls, environmental platform mechanics, and open combat arenas shape
the run.

The main progression loop is:

1. climb static and mechanical platforms
2. collect gears, energy cells, arc charges, and new weapons
3. survive combat encounters without being knocked down
4. choose one of three upgrades after major encounters
5. recover lost height after a fall
6. reach the moon and defeat the final boss

## Guided Tutorial

Select **Tutorial – recommended** from the main menu to enter a compact,
approximately 1,600-pixel training world. Ten localized lessons introduce:

- movement and visible facing direction
- energy cells and collectible gears
- short and fully charged jumps
- wall rebounds
- spring, falling, and trap platforms
- the bolt thrower and ranged attacks
- a harmless practice target
- a safe, automatically triggered crawler, spring-mine, and drone combat wave
- the Scrap Overseer, a dedicated tutorial boss that keeps the Moon Warden a
  main-game reveal

Section checkpoints reduce repetition after a fall or defeat. Tutorial score,
height, and time remain separate from the main-game records. Completion opens
direct actions for starting the main game, replaying the tutorial, or returning
to the main menu. The localized instruction panel can be collapsed at any time
on smaller screens and opens automatically for each new lesson.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | `A` / `D` or Left / Right Arrow |
| Charge and release jump | `W`, Up Arrow, or Space |
| Brake during a wall rebound | `S` or Down Arrow |
| Attack | `F` or `J` |
| Switch weapon | `Q` |
| Pause | `Escape` |

Touch controls appear only on supported mobile and tablet layouts. Mobile play
is designed for landscape orientation; portrait mode displays a rotate-device
notice.

## Features

- five biomes across 15 handcrafted vertical sections
- charged precision jumping and wall-rebound movement
- static, spring, falling, and trap platforms
- three regular enemy archetypes, intermediate encounters, and a final boss
- melee and projectile weapons with weapon switching
- selectable upgrades after completed encounters
- animated idle, sleep, movement, jump, hurt, attack, and death states
- background music and layered sound effects with persistent mute settings
- local high score, maximum height, and best-time records
- responsive desktop and landscape touch controls
- German and English interface localization
- start, pause, victory, game-over, restart, and home-screen flows
- optional fullscreen mode
- a wordless opening and ending sequence

## Story and World

Byte and Luma were built as repair robots for a moon mission. Byte was
discarded because of his crooked antenna, while Luma was sent to the moon
alone. Transport crates, abandoned production lines, a divided moon badge,
and Luma's blue signal tell their story without dialogue.

The environment changes with the climb:

```text
Moon and final boss
        ↑
Space station and stars
        ↑
Clouds and launch tower
        ↑
Factory
        ↑
Scrapyard
```

Warm rust and industrial colors gradually shift toward violet, lunar blue,
and cyan while the moon grows larger in the background.

## Architecture

The project follows KISS principles: no framework, no bundler, and no
unnecessary runtime dependency. `script.js` delegates to a central composition
root and contains no gameplay logic. Gameplay classes do not know about DOM
bootstrap or concrete UI initialization. Level data and balancing plans are
separated from builders and runtime systems.

Production code is organized by responsibility and checked against the project
rules for descriptive naming, JSDoc coverage, a maximum of 14 code lines per
function, and a maximum of 400 code lines per file.

## Project Status

The game is playable from the main menu through the final encounter and ending
sequence. Gameplay, enemies, upgrades, audio, localization, responsive input,
the guided tutorial, and completion flows are implemented and covered by the
release checks described above.

## Additional Scope Beyond the Assignment

- one continuous 150,000-pixel precision world
- 15 sections with biome-specific jump patterns and difficulty progression
- encounter gates and intermediate boss-style phases
- discoverable weapons, weapon switching, and run upgrades
- environmental storytelling from the scrapyard to the moon
- local records and separate music and effect volume settings
- hidden unscored traversal tools for mentor and visual QA
- a replayable guided tutorial with its own boss and separate progress state

## Asset Credits

The visual concept, cover art, and production graphics were created with
OpenAI image generation and prepared specifically for this project. Asset
origin and usage information is documented in
[`docs/asset-licensing.md`](docs/asset-licensing.md) and
[`data/asset-credits.json`](data/asset-credits.json).
