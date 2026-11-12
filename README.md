# Kestrel 9

A single-seat fighter you fly in the browser. One HTML file, Three.js r128 from a CDN, no build step.

What it does that a toy sim does not:

- **Fisheye cockpit camera.** The scene is rendered to a texture and re-sampled through a barrel-distortion pass with chromatic aberration at the edges, so the view feels like an action camera bolted to the glare shield.
- **Scratched canopy.** Fine grooves in five directions are lit anisotropically toward the sun; they are nearly invisible until you turn into it, then they flare.
- **Rain on the glass.** Inside the cloud deck, drops form, run, and leave dotted trails. Leave the cloud and beads stay on the glass until airflow strips them off.
- **A real-ish flight model.** Lift curve with stall past 17 degrees, Mach drag rise, G-limited fly-by-wire pitch, gear and speedbrake drag, blackout above 6 g and redout under negative g, over-G airframe failure, runway-only landings with a touchdown rate readout.
- **F-16 style HUD.** Pitch ladder, flight-path marker, heading, airspeed and altitude tapes, AOA, Mach, G, radar altitude, and PULL UP / STALL / OVER G cues.

## Fly it

Keyboard: `S`/`W` pitch, `A`/`D` roll, `Q`/`E` rudder, `Shift`/`Ctrl` throttle, `F` afterburner, `G` gear, `B` brakes, `C` camera, mouse drag to look, `R` reset, `M` mute, `P` pause. Gamepad and touch are supported.

Rotate at 150 knots. The cloud deck starts around 6,000 ft.

## CI

Every push runs `scripts/smoke.mjs` on a GitHub runner: it serves `site/`, flies a scripted takeoff under SwiftShader, teleports into the cloud deck and back out, and saves five stills as the `stills` artifact. If the takeoff fails, rain never develops, or the console logs an error, the deploy is blocked. Otherwise `site/` goes to GitHub Pages.
