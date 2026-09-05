/*
  PROJECT CONTENT
  ------------------------------------------------------------
  All text, image paths, and original project links live here.
  To swap images only, replace files in assets/images/ while keeping
  the same filenames. No HTML editing is required.
*/

window.PROJECTS = [
  {
    id: "spatial-2d",
    number: "01",
    title: "Spatial 2D",
    kicker: "2D Spatial Canvas",
    year: "2026",
    statement: "I used p5.js to explore visual illusion: how a completely flat image can create a convincing sensation of depth, vibration, and spatial instability. The composition is built from repeated geometric units arranged in a strict grid, where contrast, spacing, alignment, and alternating patterns disrupt the viewer’s perception of a stable surface. Rather than constructing real three-dimensional space, I was interested in how the eye interprets repetition and high-contrast relationships as movement, recession, or distortion. The exercise treats perception itself as the spatial material of the canvas.",
    meta: [
      [
        "Study 01 — Visual Illusion",
        "The first study uses repeated geometric units and high-contrast patterns to create an optical illusion. Changes in scale, spacing, and density make the flat surface appear to expand, contract, vibrate, or recede, turning visual perception itself into a spatial effect."
      ],
      [
        "Study 02 — Animated Spatial Field",
        "The second study introduces time and motion into a repeated 2D system. Animated elements continuously shift in size, position, and intensity, transforming a simple graphic pattern into a dynamic field that appears to pulse and move through depth."
      ],
      [
        "Attempt",
        "Use two different rule-based drawing systems to test how a flat canvas can suggest depth and spatial movement through perception rather than perspective."
      ],
      [
        "Interaction",
        "The compositions change continuously through animation. Their spatial effect also depends on viewing distance and sustained attention: repeated forms can appear to vibrate, shift, deepen, or flatten as the viewer looks across the canvas."
      ],
      [
        "Tools",
        "p5.js · JavaScript · HTML/CSS"
      ],
      [
        "Reference",
        "Op Art, optical illusion, generative drawing, and perceptual experiments using repetition, figure-ground contrast, rhythm, and scale."
      ]
    ],
  
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/Spatial_canvas.html",
    images: [
      ["assets/images/spatial_2d/2d.png", "2D Spacial Canvas 1"],
      ["assets/images/spatial_2d/2d2.gif", "2D Spacial Canvas 2"]

    ]
  },
  {
    id: "spatial-3d",
    number: "02",
    title: "Spatial 3D",
    kicker: "3D Spatial Canvas",
    year: "2026",
    statement: "For the 3D canvas, I moved from screen-space drawing to a navigable Three.js scene. The core geometry is built from three matching rectangular volumes aligned to the XY, YZ, and XZ planes and intersecting at a shared center. I then developed the composition through translucent, frosted-glass materials, lighting, camera perspective, and atmospheric depth. The goal was to understand how relatively simple geometry changes once material, illumination, and viewpoint become part of the design system.",
    meta: [
      [
        "Study 01 — Geometric Composition",
        "The first study constructs a spatial composition from three identical rectangular volumes oriented along different coordinate planes and intersecting at a shared center. The experiment focuses on proportion, orientation, overlap, perspective, and the changing relationship between objects as the viewer moves around the scene."
      ],
      [
        "Study 02 — Material + Light",
        "The second study keeps the geometric structure but transforms its appearance through translucent frosted-glass materials, lighting, reflection, and atmospheric effects. Instead of changing the form itself, the experiment tests how surface and illumination alter depth, weight, transparency, and spatial perception."
      ],
      [
        "Attempt",
        "Compare two approaches to constructing three-dimensional experience: first through geometric organization, and then through material and lighting conditions."
      ],
      [
        "Interaction",
        "Orbit controls allow the viewer to rotate around and inspect the composition from different viewpoints. Changing the camera angle reveals new overlaps, intersections, reflections, and relationships between the volumes."
      ],
      [
        "Tools",
        "Three.js · WebGL · JavaScript · OrbitControls"
      ],
      [
        "Reference",
        "Minimal geometric sculpture, translucent architectural materials, frosted glass, and digital studies of light, reflection, and atmospheric depth."
      ]
    ],
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/Spatial_canvas.html",
    images: [
      ["assets/images/spatial_3d/3d1_1.png", "3D Spacial Canvas 1"],
      ["assets/images/spatial_3d/3d2_1.png", "3D Spacial Canvas 2"],
      ["assets/images/spatial_3d/3d1_2.png", "3D Spacial Canvas 1"],
      ["assets/images/spatial_3d/3d2_2.png", "3D Spacial Canvas 2"],
      ["assets/images/spatial_3d/3d1_3.png", "3D Spacial Canvas 1"],
      ["assets/images/spatial_3d/3d2_3.png", "3D Spacial Canvas 2"],
    ]
  },
  {
    id: "temporal",
    number: "03",
    title: "Temporal",
    kicker: "Temporal Structure",
    year: "2026",
    statement: "This D3.js exercise explores time through Pixar films. I organized a CSV of film titles, release years, and box-office values into a bubble-based temporal visualization, using release year as the chronological structure and revenue as a comparative measure. The project asks how a familiar cultural archive changes when it is read as data: individual films remain recognizable, but their relative scale and position reveal patterns that are difficult to see in a conventional list.",
    meta: [
      ["Attempt", "Translate a chronological dataset into a visual system that communicates both sequence and magnitude."],
      ["Interaction", "Hover states reveal film-level information; labels keep individual titles identifiable while the bubbles support comparison."],
      ["Tools", "D3.js · JavaScript · CSV"],
      ["Dataset", "Pixar film titles, release years, and box-office performance."],
    ],
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/pixar_timeline/index.html",
    images: [
      ["assets/images/temporal/1.png", "Overview"],
      ["assets/images/temporal/2.png", "Film Details"],
      ["assets/images/temporal/3.png", "Original Films"],
      ["assets/images/temporal/4.png", "Sequels"],
    ]
  },
  {
    id: "relational",
    number: "04",
    title: "Relational",
    kicker: "Relational Structure",
    year: "2026",
    statement: "I used a force-directed network to represent relationships between characters from Pixar's Coco. Instead of treating the cast as an ordered list, the visualization makes connection itself the organizing principle. Character nodes are styled with skull-like imagery to connect the interface to the visual world of the film, while links remain attached as nodes are dragged. The result is both a data structure and a small interactive portrait of the story's social network.",
    meta: [
      ["Attempt", "Use a node-link structure to make relationships, clusters, and central characters visible through spatial organization."],
      ["Interaction", "Nodes can be dragged while the D3 force simulation continuously recalculates positions and preserves links."],
      ["Tools", "D3.js · JavaScript · CSV"],
      ["Dataset", "Coco characters as nodes and character-to-character relationships as edges."],
      ["Reference", "Force-directed graphs and the decorative skull / Día de Muertos visual language associated with Coco."]
    ],
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/coco_character_network/index.html",
    images: [
      ["assets/images/relational/relational.gif", "Dragged network state"],
      ["assets/images/relational/1.png", "Full relationship network"],
      ["assets/images/relational/2.png", "Character node detail"],
      ["assets/images/relational/3.png", "Character node detail"],
    ]
  },
  {
    id: "geospatial",
  
    number: "05",
  
    title: "Geospatial",
  
    kicker: "Geospatial Structure",
  
    year: "2026",
  
    statement: "This Mapbox project examines heat vulnerability as a spatial condition across New York City. I mapped Heat Vulnerability Index values by ZIP Code and designed the interface so that the thematic data remains readable alongside the basemap. A ZIP Code search moves directly to a selected area, while broader map views shift toward neighborhood-scale context. The exercise became a study in how data classification, labeling, zoom level, and interface controls shape the way an urban issue is interpreted.",
  
    meta: [
      [
        "Attempt",
        "Turn a citywide vulnerability dataset into a navigable thematic map that supports both overview and local inspection."
      ],
  
      [
        "Interaction",
        "Pan / zoom, hover or selection states, and ZIP Code search with animated map navigation."
      ],
  
      [
        "Tools",
        "Mapbox GL JS · GeoJSON · JavaScript"
      ],
  
      [
        "Dataset1",
        "NYC Heat Vulnerability Index",
        "https://data.cityofnewyork.us/Health/Heat-Vulnerability-Index-Rankings/4mhf-duep/about_data"
      ],

      [
        "Dataset2",
        "NYC ZIP Code Tabulation Areas",
        "https://data.cityofnewyork.us/City-Government/ZIP-Code-Tabulation-Areas/35j5-n34v/about_data"
      ],
  
      [
        "Reference",
        "Thematic choropleth mapping and public-facing urban data interfaces."
      ]
    ],
  
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/geospatial_structures/index.html",
  
    images: [
      ["assets/images/geospatial/1.png", "Overview"],
      ["assets/images/geospatial/2.png", "Detail"],
      ["assets/images/geospatial/3.png", "ZIP Code search"],
      ["assets/images/geospatial/4.png", "All high HVI areas"]
    ]
  },
  {
    id: "engagement",
    number: "06",
    title: "Engagement",
    kicker: "Engagement Component",
    year: "2026",
    statement: "For the engagement exercise, I built a multi-step public poll around the NYC Open Streets program and connected it to Firebase. Rather than presenting participation as a single yes-or-no question, the interface moves from general support to more specific priorities: whether people want an Open Street in their neighborhood, when or what form it should take, and what a converted block should prioritize. The project explores how a lightweight interface can turn a planning topic into a structured exchange with users.",
    meta: [
      ["Attempt", "Create an engagement tool that collects structured public preferences while keeping the interaction short and understandable."],
      ["Interaction", "Multi-step poll, conditional progression, submission feedback, and live data storage through Firebase."],
      ["Tools", "Firebase · JavaScript · HTML/CSS"],
      ["Dataset", "User-generated poll responses collected through the website."],
      ["Questions", "Neighborhood support · preferred timing / format · priorities for a converted street block."]
    ],
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/open-streets-poll/index.html",
    images: [
      ["assets/images/engagment/1.png", "Overview & question1"],
      ["assets/images/engagment/2.png", "Question 2"],
      ["assets/images/engagment/3.png", "Question 3"],
      ["assets/images/engagment/4.png", "Question 4"],
      ["assets/images/engagment/5.png", "Question 5"]
    ]
  },
  {
    id: "agent",
    number: "07",
    title: "Agent",
    kicker: "Conversational Agent",
    year: "2026",
    statement: "The agent exercise extends the Open Streets engagement project with a conversational interface powered by the OpenAI API. I treated the chatbot as a project-specific guide rather than a generic assistant: its role is to help a visitor understand the topic, ask questions in natural language, and move between information and participation without leaving the site. Building the agent also required thinking about prompt context, interface tone, backend communication, and how conversational output should fit within an existing design system.",
    meta: [
      ["Attempt", "Integrate a contextual chatbot into a web project and define a clear role for the agent within the larger user experience."],
      ["Interaction", "Natural-language chat with multi-turn responses inside the webpage."],
      ["Tools", "OpenAI API · JavaScript · Firebase / backend service"],
      ["Design", "The chat UI prioritizes short exchanges, legibility, and continuity with the visual language of the project rather than imitating a standalone chat app."]
    ],
    originalUrl: "https://wanerrrrr.github.io/cdw-repo/open-streets-agent-final/site/index.html",
    images: [
      ["assets/images/agent/1.png", "Agent interface"],
      ["assets/images/agent/2.png", "Conversation state"],
      ["assets/images/agent/3.png", "Prompt / response flow"],
      ["assets/images/agent/4.png", "Prompt / response flow"]
    ]
  }
];
