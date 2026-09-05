# FEATURES.md

## Purpose

This document defines the current interaction system and feature priorities for the final course archive.

The website contains seven digital objects but is designed as one continuous interactive experience.

## 1. Horizontal Project Index

**Status:** Implemented.

The homepage presents all seven projects on one horizontal rail. Users can navigate with mouse wheel, trackpad, pointer drag, or cursor-edge autopan.

Vertical wheel movement is converted into horizontal navigation. The rail uses inertia rather than following input at a strict 1:1 ratio.

## 2. Automatic Homepage Calibration

**Status:** Implemented.

After wheel movement, dragging, or cursor-edge navigation stops, the system calculates which project title is closest to the center of the viewport and smoothly aligns it with screen center.

Calibration should never interrupt an active gesture.

## 3. Center-Based Homepage Scaling

**Status:** Implemented.

Every homepage title has a dynamic scale based on its distance from screen center.

The scale is composed from:

```text
base scale
+ center proximity
+ scrolling motion boost
+ hover boost
```

## 4. Homepage Hover Expansion

**Status:** Implemented.

Hovering over a project:

- enlarges the title
- keeps the title centered in its own position
- pushes neighboring projects outward
- reveals two project preview images
- reveals a small “View Project” label

Current preview size:

```css
width: clamp(150px, 13vw, 250px);
```

Neighbor displacement should be large enough that the preview images have visible breathing room around the active title.

## 5. Pointer-Edge Homepage Navigation

**Status:** Implemented.

The horizontal rail responds to pointer position. Approximately the outer 15% of the viewport acts as an edge-navigation zone.

Closer to the edge = stronger navigation force. Movement remains intentionally slow. When the cursor exits the edge zone, homepage snapping resumes.

## 6. Project Page Entrance

**Status:** Implemented.

Homepage → Project uses an overlapping crossfade / micro-zoom transition. The incoming page should already exist underneath the outgoing page before the outgoing page becomes invisible.

This avoids white flashes, black pauses, and empty frames.

Fixed typography enters from right to left in a staggered sequence:

1. Back link
2. Project number
3. Project title
4. Year
5. Project kicker
6. Archive instruction

## 7. Fixed Project Identity Panel

**Status:** Implemented.

The left side of each project page remains fixed and provides stable project identity while the archive content moves independently.

## 8. Counter-Moving Archive Columns

**Status:** Implemented.

The right project region contains an information column and an image column. The columns move in opposing vertical directions.

Native scrolling acts as the master input, while JavaScript transforms the two columns into different trajectories.

## 9. Automatic Project Preview Scroll

**Status:** Implemented.

When a project first opens, the archive briefly animates by itself:

1. short delay
2. travel through part of the archive
3. slight reverse / settle motion
4. automatic calibration
5. control returns to user

Any direct user input immediately cancels this animation.

## 10. Archive Center Calibration

**Status:** Implemented.

After archive movement stops, the closest card to the visual center is identified. The project scroll position is then smoothly adjusted so that card becomes visually centered.

Candidates include both text cards and image cards.

## 11. Archive Proximity Scaling

**Status:** Implemented.

All archive elements scale dynamically based on proximity to viewport center, active scrolling energy, and hover state.

When the archive is moving, all content receives a subtle enlargement. Cards closest to center become slightly larger. Hover adds another layer of emphasis.

## 12. Slow Card Hover

**Status:** Implemented.

Project cards should not jump immediately to their hover scale.

Each card stores a `hoverProgress` value from `0` to `1` and eases toward the target over multiple animation frames:

```js
hoverProgress +=
  (hoverTarget - hoverProgress) * hoverSpeed;
```

This allows both enlargement and return to feel soft.

## 13. Intrinsic Image Ratios

**Status:** Current direction.

Archive image width remains consistent, but image height follows the source media:

```css
width: 100%;
height: auto;
aspect-ratio: auto;
object-fit: contain;
```

Avoid forced alternating aspect ratios.

## 14. Animated Media Support

**Status:** Supported in DOM views.

Project images may include PNG, JPG, GIF, and other browser-supported image formats.

Animated GIFs work directly in homepage previews and project archives because those states use HTML `<img>` elements.

Animated media should be optimized before deployment to GitHub Pages.

## 15. Dataset Links

**Status:** Supported.

Metadata can contain links to external datasets.

Example:

```js
[
  "Dataset 01 — Heat Vulnerability",
  "NYC Heat Vulnerability Index",
  "https://..."
]
```

Dataset cards should remain visually consistent with other information cards and open external resources in a new tab.

## 16. Original Project Links

**Status:** Implemented.

Every project page includes an `Original Project` card linking to the original course exercise.

URLs should be stored as plain strings rather than Markdown syntax:

```js
originalUrl: "https://example.com/project"
```

## 17. Pointer-Edge Project Navigation

**Status:** Implemented.

When viewing a project archive:

- pointer near top → move toward earlier archive content
- pointer near bottom → move toward later archive content

The movement stops when the pointer returns to the central zone, then automatic snapping resumes.

## 18. Focus Mode

**Status:** Implemented.

Clicking an archive image opens a fullscreen dark focus state containing the selected image, project name, image number, project medium, image caption, and close control.

Users may browse images with mouse wheel or arrow keys.

## 19. Focus Typography Animation

**Status:** Implemented.

Metadata enters from right to left with staggered timing rather than appearing simultaneously.

The animation should begin after the image has clearly entered focus mode.

## 20. WebGL Mesh Transition

**Status:** Experimental / active.

The selected image transition is rendered using a subdivided WebGL plane. The mesh allows both boundary deformation and internal pixel deformation.

The shader uses deterministic deformation rather than random noise.

Current refinement goals:

- exact wave timing
- crest amplitude
- damping
- relationship between image movement and deformation
- transition performance across browsers

If WebGL is unavailable, use a restrained DOM FLIP transition rather than a noisy SVG effect.

## 21. Responsive Layout

**Status:** Implemented at a basic level.

Desktop is the primary designed experience.

Below approximately 850px:

- homepage becomes vertically scrollable
- homepage preview images are removed
- project identity becomes a top region
- project archive moves below it
- image cards become fluid-width
- focus image becomes wider relative to viewport

The mobile version prioritizes usability over reproducing every desktop interaction.

## 22. Performance Priorities

The final site should maintain:

- GPU-friendly transforms
- `requestAnimationFrame` for continuous motion
- restrained layout reads
- optimized GIF/image sizes
- restrained blur/filter animation
- no high-frequency displacement noise
- no blocking transition phases

Smoothness is more important than adding additional effects.

## 23. Final Feature Priority

### Priority 1

- all seven projects load correctly
- every original project link works
- dataset links work
- homepage navigation is reliable

### Priority 2

- smooth snapping
- smooth card scaling
- project archive does not clip borders
- images preserve correct proportions

### Priority 3

- WebGL focus transition refinement
- hover timing refinement
- additional decorative motion

The website should remain fully understandable even if the advanced WebGL effect fails.
