# AGENTS.md

## Project summary and core loop
Explore, find an object, answer a question, get feedback with an explanation, and the world changes (gate opens, habitat glows, specimen is collected). Then head for the next area.

## How to play / controls
Pick your biology topics, then explore the microscopic world. Walk up to glowing objects and press E to answer a review question. Correct answers open membrane gates, restore habitats and collect specimens. You win once every habitat is restored and every specimen is collected.
Controls: WASD/arrows move, mouse look, Shift run, Space jump, E investigate, click answers, Esc pause.

## Important files
- `/index.html` — entry point: importmap, canvas/DOM shell, script bootstrap
- `/rosebud/game-defaults.css` — project file
- `/rosebud/game-defaults.js` — game module
- `/rosie/README.md` — Rosie pre-built helper module
- `/rosie/roseblox.js` — Rosie pre-built helper module
- `/art_direction.md` — visual direction used for generated art
- `/sound_direction.md` — audio direction used for generated sound
- `/questions.js` — game module
- `/main.js` — game bootstrap and main loop

## Assets and audio
Images: `assets/cell-ground.webp`, `assets/micro-sky.webp`
Models: `assets/models/explorer.glb`, `assets/models/specimen.glb`
Audio: `assets/audio/correct.mp3`, `assets/audio/micro-music.mp3`, `assets/audio/wrong.mp3`
Sound direction: - Music: calm, curious, bubbly ambient electronic loop. - SFX: correct-answer sparkle chime, wrong-answer soft bloop.
Playback note: reference media as `assets/...`; browsers start audio only after the first user gesture.

## Notes for future edits
Questions are in /questions.js (TOPICS: q, a, c = correct index, e = explanation). Edit or add questions there. The arena has an inner ring wall at radius 20 with 3 sphere-collider gates, and an outer wall at radius 42. Everything you can investigate is stored in the `interactables` array in main.js, with kind gate, habitat or specimen. The player comes from roseblox in third person. The quiz calls player.pause(), and the Continue button calls player.start().

## Final validation status
Static: 0 blocking, 19 advisory; overall clean. Runtime behavior was not checked during generation.
Finished via the `finish` tool.
