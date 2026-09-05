# PROJECT_IDEAS.md

## Final Archive Concept

### Working Title
**Seven Structures**

Alternative titles:

- **Computational Objects**
- **Seven Digital Studies**
- **Structures / Systems / Interfaces**
- **CDW Archive 2026**

The project is an interactive archive of seven exercises developed throughout Computational Design Workshop.

Rather than presenting them as isolated homework assignments, the archive frames them as seven different ways of organizing digital experience:

```text
space
space in 3D
time
relationships
geography
participation
agency
```

## 1. Spatial 2D

### Theme
**Perception as Space**

Spatial 2D contains two small studies rather than one single final composition.

### Study 01 — Visual Illusion

Explore how repetition, contrast, scale, spacing, and pattern density can make a flat composition appear to vibrate, expand, contract, recede, or move.

The project does not construct literal three-dimensional space. Instead, it uses the viewer's perception as the mechanism that creates depth.

### Study 02 — Animated Perceptual Field

Introduce temporal change into a repeated geometric system. Animation can alter scale, rhythm, visual density, position, and contrast.

The resulting image becomes a changing perceptual field rather than a static composition.

### Tools

- p5.js
- JavaScript
- HTML/CSS

### Archive Media

Use animated GIFs where motion is central to understanding the study.

## 2. Spatial 3D

### Theme
**Geometry vs. Material**

Spatial 3D also contains two related studies.

### Study 01 — Geometric Composition

Construct a three-dimensional composition from simple volumes. Focus on axis, orientation, overlap, proportion, camera, and perspective.

The viewer understands the object differently from each angle.

### Study 02 — Material + Light

Keep the underlying geometry while changing its perceptual quality through transparency, frosted-glass materials, reflection, lighting, atmosphere, and fog.

The study asks how much of spatial experience comes from geometry and how much comes from material and light.

### Tools

- Three.js
- WebGL
- OrbitControls
- JavaScript

## 3. Temporal Structure

### Theme
**Cinema as Time + Data**

Use a movie dataset to organize films across time.

The visualization can combine release year, box-office performance, film identity, bubble size, and timeline placement.

The structure emphasizes that temporal visualization is not only about plotting dates. It is also about revealing change, clustering, growth, and comparison.

### Interaction Ideas

- hover for film details
- animated bubble entrance
- filtering
- timeline exploration

### Tools

- D3.js
- JavaScript
- CSV

## 4. Relational Structure

### Theme
**Character Relationships as a Network**

Represent characters from *Coco* as nodes in a relational system. Relationships become edges between characters.

This shifts attention away from chronology and toward connection.

Questions include:

- Which characters occupy central positions?
- Which relationships form clusters?
- How does a network change our understanding of a narrative?
- How does visual styling affect network readability?

### Interaction

- draggable nodes
- force simulation
- persistent links
- hover states

### Visual Direction

Use a visual language inspired by the film rather than generic circles.

### Tools

- D3.js
- force simulation
- CSV / JSON
- JavaScript

## 5. Geospatial Structure

### Theme
**Heat Vulnerability as Spatial Inequality**

Create a Mapbox interface examining heat vulnerability across New York City.

The project combines vulnerability values with geographic boundaries so users can inspect both citywide patterns and specific ZIP Code areas.

### Dataset 01 — Heat Vulnerability

NYC Heat Vulnerability Index.

Used to represent differences in heat vulnerability across areas.

### Dataset 02 — ZIP Code Geography

NYC ZIP Code / ZCTA boundaries.

Used to draw geographic polygons, connect HVI values to spatial areas, and support ZIP Code search.

### Interaction

- pan
- zoom
- ZIP Code search
- animated map navigation
- hover / selected states
- neighborhood-scale context

### Design Question

How do classification, color, labels, scale, and search tools shape how environmental vulnerability is interpreted?

### Tools

- Mapbox GL JS
- GeoJSON
- JavaScript

## 6. Engagement Component

### Theme
**Participation as Data**

The engagement component changes the user from viewer into contributor.

A Firebase-connected poll asks users about neighborhood Open Streets.

Possible questions include:

- Would you want blocks in your neighborhood converted to Open Streets?
- When should an Open Street operate?
- What should it prioritize?

Possible priorities include play, gathering, walking, cycling, markets, outdoor dining, and community programming.

### Concept

The object explores how a web interface can collect public preferences and turn participation into structured data.

### Tools

- Firebase
- JavaScript
- HTML/CSS

### Archive Documentation

Show the initial question, response interface, aggregated result state, and Firebase-backed interaction.

## 7. Agent

### Theme
**Interface as Conversation**

The final object introduces an AI agent into the website.

Instead of clicking predefined controls, the user communicates through natural language.

The agent can be framed as a guide, assistant, conversational interface, or project-specific information layer.

The important question is not simply whether a chatbot works, but what role conversational interaction plays inside a designed system.

### Possible Archive Questions

- What can the agent help users understand?
- What information is stored in Firebase?
- How does conversational interaction differ from direct manipulation?
- When is an agent useful and when is it unnecessary?

### Tools

- OpenAI API
- JavaScript
- Firebase
- HTML/CSS

## 8. Relationship Between the Seven Objects

The final archive can frame the seven assignments as an expanding sequence:

```text
01  Spatial 2D
    pixels and perception

02  Spatial 3D
    geometry and material

03  Temporal
    change through time

04  Relational
    connections between entities

05  Geospatial
    data situated in territory

06  Engagement
    users contribute to the system

07  Agent
    the system responds conversationally
```

The progression moves from **representation** toward **interaction and agency**.

This gives the final website a conceptual structure beyond chronological assignment order.

## 9. Website as an Eighth Design Object

The archive itself should be considered a computational design exercise.

Its interaction system combines:

- inertial scrolling
- automatic calibration
- cursor-position navigation
- proximity scaling
- counter-moving columns
- dynamic image ratios
- page transitions
- WebGL deformation

The site therefore does not simply display previous computational work. It applies computational behavior to the act of documenting and navigating that work.

## 10. Documentation Strategy

Each project page should answer the same basic questions.

### Context
What was the exercise investigating?

### Attempt
What did I try to create or test?

### Study 01 / Study 02
Use these when an assignment contains multiple experiments.

### Interaction
What can the viewer do, or how does the work change?

### Tools
What technologies were used?

### Dataset
What information was used, when applicable?

### Reference
What visual, artistic, cartographic, or interaction precedents informed the work?

### Original Project
Where can the full interactive assignment be opened?

This shared structure keeps seven very different projects legible inside one archive.

## 11. Final Polish Ideas

Before submission:

- replace temporary images with final screenshots / optimized GIFs
- verify all seven original project URLs
- verify external dataset links
- make image captions specific rather than generic
- keep title capitalization consistent
- check spelling of “Spatial”
- confirm GIF sizes are appropriate for GitHub Pages
- test Chrome and Safari
- test GitHub Pages after deployment
- test navigation with both mouse and trackpad
- confirm no project card borders are clipped while scaling
- confirm page transitions contain no blank or black pause frames

The final goal is a website that feels intentional before the user has even opened the first assignment.
