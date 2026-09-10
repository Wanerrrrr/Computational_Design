# Visual and Motion Direction

## Project

**Waner Li — MSCDP Project Archive** integrates eleven projects from Computational Design Workflows and Mapping Systems. Course names provide context, but the site reads as one evolving design practice.

## Visual thesis

The archive pairs a nearly black cinematic stage with a single living strip of project imagery. Interface typography is quiet and precise; physical motion carries the personality.

The reference aesthetic depends on continuity:

- one image surface that changes state rather than separate page templates
- soft materials that bend, stretch, and rebound
- generous negative space
- small, restrained interface labels
- project imagery as the only persistent source of color

## Palette

```css
--black: #050505;
--paper: #edede9;
--paper-deep: #d9d9d3;
--ink: #11110f;
--white: #f5f5f0;
```

Work and Info live on the black stage. Detail expands into warm paper rather than pure white. No permanent accent competes with project media.

## Typography

The interface uses DM Sans with Helvetica/Arial fallbacks.

- Display titles: medium weight, tight tracking, compact leading.
- Navigation and metadata: 8–10px, uppercase, generous tracking.
- Body copy: compact sans serif with open line height.

Typography should remain stable while geometry moves. Text transitions use clipping and vertical continuation, not full-panel opacity cuts.

## Hierarchy

The navigation is deliberately reduced to `Work`, `Info`, and `Index`.

- Work is the default spatial archive.
- Info explains the combined MSCDP practice without leaving the living ribbon.
- Index is the efficient, low-motion catalogue.

Course filters sit inside Work. They are secondary metadata, not top-level sections.

## Work ribbon

Project cards form a curved horizontal ribbon across the black stage. The active card remains largest and most frontal; neighboring cards recede along a shared curve. High-speed input adds bend and twist before the material settles.

At load, the cards begin as a very small stepped stack. The stack itself unfolds into the final ribbon, maintaining texture identity throughout.

## Info ring

Info is not a separate About layout. The current ribbon pinches and wraps into an elliptical ring around a black center. Left and right portions remain visually connected to the ring, and scrolling continues to move imagery through it.

The statement rises into the center only after the ring is legible. The central void is created by geometry, not a black circle placed over images.

## Project detail

The active small card unbends and expands into a large rounded landscape card.

Desktop proportion:

```text
93vw × 90vh
35% project copy | 65% media archive
```

The left column is warm paper and editorial. The right column is a vertically moving media field. Adjacent large cards remain just beyond the side edges so horizontal dragging feels continuous.

## Motion language

Motion is spring-based rather than duration-only easing.

- Position and velocity are stored separately.
- Input transfers momentum into the ribbon or card.
- Release can overshoot before settling.
- Scroll velocity controls mesh deformation.
- Geometry returns to rest through damping.
- State transitions preserve the same texture and mesh.

DOM copy uses short upward reveals and clipping only after the related WebGL form is in place.

## Water ripple

Water displacement is a full-frame WebGL post-process. A ripple begins near the pointer, propagates, and decays. It should be most visible across image boundaries and the large light card edge, then settle back to a clean frame.

The effect remains subtle during ordinary navigation and becomes legible through movement or press; it must not look like permanent noisy glass.

## Controls

Buttons and links use a local concave/convex response:

- highlight follows the pointer position
- the opposite edge receives an inset shadow
- label/arrow moves by only one or two pixels
- press reverses the light and shadow relationship
- release springs back to neutral

Whole-button perspective tilt is avoided.

## Corners and surfaces

Rounded forms unify cards, media, captions, pills, and circular controls. Radii remain controlled: large cards feel architectural, while captions and links may be fully rounded.

## Responsive direction

Mobile retains the Three.js idea rather than replacing it with a generic list. The camera tightens, edge cards reduce, and the detail layout stacks copy above media. Index remains available for users who prefer direct scanning.

## Accessibility and restraint

- Every non-canvas action has a semantic control.
- Index provides a complete low-motion path.
- Focus rings remain visible.
- Project links stay usable if WebGL fails.
- Reduced motion shortens the physical transition without removing content.
- Effects never obscure the project title, caption, or primary action at rest.
