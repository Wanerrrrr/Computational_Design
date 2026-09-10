# Interaction System

## Archive scope

The site is a single MSCDP project archive rather than a Computational Design Workflows course microsite. It currently contains eleven projects:

- Computational Design Workflows — 07
- Mapping Systems — 04

Every public view is generated from `window.PROJECTS` in `js/projects.js`.

## Continuous Three.js state system

The main experience is one persistent Three.js scene. The same set of subdivided project meshes moves through four states:

```text
loading stack → scrolling ribbon → Info ring → project detail
```

Transitions interpolate geometry, position, scale, curvature, and material values. Views do not replace one card system with another or hide a content swap behind a black frame.

### Loading to ribbon

The archive begins as a small stepped stack on a black stage. The existing meshes then enlarge and unfold into the horizontal ribbon.

### Ribbon motion

Wheel, trackpad, pointer drag, touch drag, and keyboard input drive a spring-based position model. Velocity affects curvature and twist. Releasing input produces inertia, overshoot, damping, and a final snap to the nearest project.

### Image and video textures

Project covers are GPU textures. The Relational cover is a local looping MP4 rendered with `VideoTexture`; its playback clock is independent of ribbon position, so scrolling never recreates, seeks, or pauses the video. Animated-image textures are also refreshed without rebuilding their meshes.

### Info black-hole ring

Selecting Info bends the live ribbon into an elliptical torus with a true negative-space center. The project textures remain scrollable around the ring. Info copy enters after the geometry begins to settle, using an upward reveal.

### Small card to large detail card

Opening a project expands the selected mesh directly from the ribbon into the large landscape card. The light base, right-side media field, rounded edge, and adjacent project cards remain part of the WebGL composition during the transition.

### Detail media physics

Project media scrolls vertically inside the right side of the large card. Scroll velocity bends and stretches the subdivided media meshes; damping returns them to a flat resting state. The left project copy remains readable while the media archive moves independently.

### Large-card switching

Large cards can be dragged horizontally. Neighboring cards follow the gesture and remain visible. Release velocity determines whether the card returns or commits to the adjacent project; spring integration supplies overshoot and recovery. Previous and Next controls use the same continuous transition.

### Global water displacement

The Three.js scene first renders to a `WebGLRenderTarget`. A full-screen post-process shader then displaces the completed image with pointer-centered, propagating waves. This means project media, black stage, light card, and WebGL card edges share one water-ripple field.

### Local button depth

Navigation, links, filters, and circular controls track the pointer within their own bounds. A local highlight, inset shadow, and text displacement create convex hover and concave pressed states. The effect follows the pointer instead of tilting the entire button as one rigid plane.

## Archive navigation

The primary hierarchy is intentionally small:

```text
Work  → spatial browsing and course filters
Info  → archive statement inside the live image ring
Index → low-motion list of every project
```

Hash routes preserve direct entry:

```text
root          Work
#info         Info ring
#index        Project Index
#project-id   Project detail
```

Browser Back and Forward restore those states.

## Course filters

Work can be filtered to All, CDW, or Mapping without splitting the archive into separate websites. Counts and active position update from the project data. Filtering resets the physical ribbon around a valid project.

## Project detail content

Each project may define:

```text
id, number, course, courseName, title, fullTitle, kicker, year
summary, statement, meta[], links[], images[]
```

The left column renders the statement, methods, readings, limits, and links. The WebGL media viewport renders the image/video sequence on the right and reports its caption and current position to the accessible interface.

## Index and fallback

Index groups projects by course and remains the direct, scan-friendly alternative to the spatial interface. Keyboard focus, explicit labels, visible focus states, and semantic buttons/links remain available. If WebGL is unavailable, Index becomes the primary route to each project’s live or source link.

## Responsive behavior

The same Three.js state model remains active on small screens, with lower pixel density, reduced card count at the edges, a tighter ring, and a stacked detail composition. `prefers-reduced-motion` shortens transitions while preserving navigation and content.

## Performance constraints

- Device pixel ratio is capped.
- Geometry and materials are reused.
- Video elements persist for the lifetime of their textures.
- Detail media is prepared only for the active project and nearby cards.
- Physics and shader uniforms update inside a single animation loop.
- Resize updates the render target, cameras, and detail scissor rectangle together.
