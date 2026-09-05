# STYLE.md

## Project
**Computational Design Workshop — Final Archive**  
A single website presenting seven digital objects produced throughout the course:

1. Spatial 2D
2. Spatial 3D
3. Temporal Structure
4. Relational Structure
5. Geospatial Structure
6. Engagement Component
7. Agent

The website is treated as a designed project in itself rather than as a simple collection of assignments.

## 1. Overall Visual Direction

The visual language combines an **editorial portfolio**, an **experimental digital archive**, and a **fashion / cultural website interface**.

The interface should feel spacious, typographic, cinematic, precise, and soft in motion. The seven assignments use very different visual systems—including p5.js, Three.js, D3.js, Mapbox, Firebase, and an AI agent—so the surrounding interface remains controlled and consistent.

The website therefore uses a limited neutral palette, oversized typography, rounded media, and carefully paced transitions.

## 2. Color System

### Main Interface

```css
--paper: #efefe8;
--ink: #11120f;
--muted: #77786f;
--line: rgba(17,18,15,.18);
```

The main pages use a warm off-white background rather than pure white. This gives the interface a softer editorial quality and helps screenshots sit naturally inside the page.

### Information Cards

Project-description cards use the opposite visual treatment:

```css
background: #11120f;
color: #f1f0e8;
```

The black cards create a strong hierarchy between project media, contextual writing, and the interface itself.

### Focus Mode

Image focus mode uses a nearly black environment:

```css
--dark: #1a1b19;
--dark-ink: #f0f0ea;
```

The dark state visually separates close viewing from archive browsing.

## 3. Typography

### Display Titles

Large project titles use **Mea Culpa**:

```css
font-family: "Kalnia", cursive;
```

The script typography introduces an expressive identity to the otherwise systematic archive. It is primarily used for homepage project titles and fixed project-detail titles.

### Interface / Body Typography

Interface text and project writing use **DM Sans**:

```css
font-family: "DM Sans", Arial, sans-serif;
```

This includes navigation, card labels, descriptions, captions, metadata, project numbers, tool information, and dataset information.

The contrast between expressive display typography and quiet sans-serif text is intentional.

## 4. Homepage Composition

The homepage is a horizontal index rather than a conventional vertical portfolio. Each project appears as a large title arranged along a continuous horizontal track.

The active project should always become the visual center of the viewport.

Key behaviors:

- oversized project names
- very small project number and year
- generous horizontal spacing
- two image previews on hover
- neighboring titles move outward when a title expands
- the hovered title itself stays visually centered
- smooth automatic calibration after scrolling

The homepage should feel more like browsing an exhibition index than selecting from a card grid.

## 5. Homepage Hover Language

Hovering over a project title produces three related changes:

1. The active title enlarges while maintaining its center position.
2. Titles on the left move farther left and titles on the right move farther right.
3. Two project images appear on either side of the title.

The preview images are intentionally large and slightly rotated:

```css
.index-preview {
  width: clamp(150px, 13vw, 250px);
  border-radius: 16px;
}
```

The images should not touch the title. A visible buffer between typography and media is important.

## 6. Project Detail Composition

Each project page uses a split layout.

### Left Side

The left side is fixed and contains:

- back navigation
- project number
- large project title
- year
- project type / kicker
- small archive instruction

This content does not move while the project archive is being explored. When entering a project, these fixed elements slide from right to left with staggered timing.

### Right Side

The right side behaves as a vertical archive containing two parallel columns.

**Text column:** Context, Study descriptions when relevant, Attempt, Interaction, Tools, Dataset, Reference, and Original Project link.

**Image column:** project documentation images.

The two columns move in opposing directions to make the page feel less like conventional document scrolling and more like navigating a spatial archive.

## 7. Project Information Cards

Information cards use:

- black background
- white text
- rounded corners
- generous internal space
- small uppercase labels
- larger descriptive copy

Hover enlargement should be slow and soft rather than immediate. The card should appear to gently approach the viewer.

## 8. Project Images

Project archive images preserve the dimensions of the original work.

The image column has a consistent width, while each image height is determined by its intrinsic aspect ratio:

```css
.gallery-card img {
  width: 100%;
  height: auto;
  aspect-ratio: auto;
  object-fit: contain;
}
```

Do not force all documentation images into the same aspect ratio. The archive contains square p5.js canvases, landscape visualizations, maps, interface screenshots, vertical compositions, and animated GIFs.

## 9. Motion Style

Motion is a primary aesthetic layer of the website.

Preferred motion qualities:

- long easing
- gradual acceleration
- soft deceleration
- overlapping transitions
- low-amplitude scale changes
- continuous opacity transitions
- no sudden black frames
- no hard page replacement

Primary easing:

```css
cubic-bezier(.16, 1, .3, 1)
```

Transitions should feel physically continuous.

## 10. Center Emphasis

Both the homepage and project archive use **proximity-based scaling**. Objects become slightly larger as they approach the visual center of the viewport.

Scaling can combine:

- proximity to center
- current scrolling velocity
- hover emphasis

These layers should remain subtle enough that the content does not visually jump.

## 11. Edge Navigation

The cursor also acts as a navigation device.

### Homepage

- pointer near left edge → slowly moves toward earlier projects
- pointer near right edge → slowly moves toward later projects

### Project Archive

- pointer near top edge → slowly moves upward
- pointer near bottom edge → slowly moves downward

The movement increases gradually as the cursor approaches the edge. When the cursor returns to the central area, the interface stops drifting and automatically calibrates to the nearest meaningful item.

## 12. Focus View

Clicking a project image enters a dedicated dark viewing environment. The selected image becomes the dominant object, while supporting metadata remains minimal and distributed around it.

Typography enters from right to left.

The visual transition should imply that the image is physically leaving the archive and expanding into a new viewing state.

## 13. WebGL Image Transition

The image transition uses a subdivided WebGL mesh rather than a simple CSS scale.

Goals:

- internal image pixels deform with the image boundary
- the image behaves like a flexible surface
- motion follows one controlled transition progress
- deformation settles into an undistorted final state
- avoid random noise or high-frequency jitter

The effect should resemble elastic material or a soft membrane rather than a glitch effect.

## 14. Rounded Geometry

Rounded corners are used consistently across homepage preview images, information cards, archive image cards, and focus images.

Typical range:

```css
border-radius: 16px–22px;
```

## 15. Design Priorities

When making new visual decisions, use this order of priority:

1. Legibility of the seven projects
2. Smoothness of interaction
3. Consistency between different project media
4. Strong editorial hierarchy
5. Motion quality
6. Decorative effects

No decorative effect should make the project itself more difficult to inspect.
