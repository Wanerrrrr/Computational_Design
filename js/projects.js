/*
  PROJECT ARCHIVE
  Add or edit projects here; the interface, filters, index, and detail pages
  are generated from this single list.
*/

window.PROJECTS = [
  {
    id: "spatial-2d",
    number: "01",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Spatial 2D",
    kicker: "2D Spatial Canvas",
    year: "2026",
    summary: "A pair of rule-based p5.js studies that use repetition, contrast, and motion to make a flat canvas feel unstable, deep, and alive.",
    statement: "I used p5.js to explore visual illusion: how a completely flat image can create a convincing sensation of depth, vibration, and spatial instability. Rather than constructing real three-dimensional space, the work treats perception itself as the spatial material of the canvas.",
    meta: [
      ["Study", "Visual illusion + animated spatial field"],
      ["Interaction", "Continuous animation; the spatial effect changes with viewing distance and sustained attention."],
      ["Tools", "p5.js · JavaScript · HTML/CSS"],
      ["Reference", "Op Art, generative drawing, figure-ground contrast, rhythm, and scale."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/Spatial_canvas.html" }
    ],
    images: [
      ["assets/images/spatial_2d/2d.png", "Geometric optical-illusion study"],
      ["assets/images/spatial_2d/2d2.gif", "Animated spatial field"]
    ]
  },
  {
    id: "spatial-3d",
    number: "02",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Spatial 3D",
    kicker: "3D Spatial Canvas",
    year: "2026",
    summary: "Intersecting volumes, translucent materials, and light turn a simple Three.js construction into a navigable atmospheric study.",
    statement: "For the 3D canvas, I moved from screen-space drawing to a navigable Three.js scene. Three matching rectangular volumes meet along the XY, YZ, and XZ planes. Material, illumination, camera perspective, and atmospheric depth become part of the design system.",
    meta: [
      ["Study", "Geometric composition + material and light"],
      ["Interaction", "Orbit controls reveal changing overlaps, reflections, and intersections."],
      ["Tools", "Three.js · WebGL · JavaScript · OrbitControls"],
      ["Reference", "Minimal geometric sculpture, frosted glass, reflection, and atmospheric depth."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/Spatial_canvas.html" }
    ],
    images: [
      ["assets/images/spatial_3d/3d1_1.png", "Geometric composition, view one"],
      ["assets/images/spatial_3d/3d2_1.png", "Frosted-glass material study"],
      ["assets/images/spatial_3d/3d1_2.png", "Geometric composition, view two"],
      ["assets/images/spatial_3d/3d2_2.png", "Material and lighting detail"],
      ["assets/images/spatial_3d/3d1_3.png", "Geometric composition, view three"],
      ["assets/images/spatial_3d/3d2_3.png", "Atmospheric spatial view"]
    ]
  },
  {
    id: "temporal",
    number: "03",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Temporal",
    kicker: "Temporal Structure",
    year: "2026",
    summary: "A bubble-based D3.js timeline reads Pixar films through release chronology and comparative box-office scale.",
    statement: "This D3.js exercise explores time through Pixar films. Release year forms the chronological structure and revenue supplies a comparative measure, allowing a familiar cultural archive to reveal patterns that are difficult to see in a conventional list.",
    meta: [
      ["Study", "Chronology translated into a visual system of sequence and magnitude."],
      ["Interaction", "Hover states reveal film-level information while labels preserve identity."],
      ["Tools", "D3.js · JavaScript · CSV"],
      ["Dataset", "Pixar titles, release years, and box-office performance."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/pixar_timeline/index.html" }
    ],
    images: [
      ["assets/images/temporal/1.png", "Timeline overview"],
      ["assets/images/temporal/2.png", "Film details"],
      ["assets/images/temporal/3.png", "Original films"],
      ["assets/images/temporal/4.png", "Sequels"]
    ]
  },
  {
    id: "relational",
    number: "04",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Relational",
    kicker: "Relational Structure",
    year: "2026",
    summary: "A draggable force-directed network makes the relationships among characters in Pixar’s Coco the organizing structure.",
    statement: "Instead of treating the cast as an ordered list, this visualization makes connection itself the organizing principle. Character nodes borrow from the film’s decorative skull imagery while links remain attached as the network is rearranged.",
    meta: [
      ["Study", "Relationships, clusters, and central characters through spatial organization."],
      ["Interaction", "Nodes can be dragged while the force simulation continuously recalculates the network."],
      ["Tools", "D3.js · JavaScript · CSV"],
      ["Dataset", "Coco characters as nodes and character relationships as edges."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/coco_character_network/index.html" }
    ],
    images: [
      ["assets/images/relational/1.png", "Full relationship network"],
      ["assets/images/relational/2.png", "Character-node detail"],
      ["assets/images/relational/3.png", "Character-node detail"]
    ]
  },
  {
    id: "geospatial",
    number: "05",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Geospatial",
    kicker: "Geospatial Structure",
    year: "2026",
    summary: "A navigable Mapbox choropleth examines New York City heat vulnerability from citywide patterns down to ZIP Code detail.",
    statement: "This project maps Heat Vulnerability Index values by ZIP Code and keeps the thematic data readable alongside the basemap. Search and zoom connect a citywide view to neighborhood-scale context.",
    meta: [
      ["Study", "A public-facing thematic map for overview and local inspection."],
      ["Interaction", "Pan, zoom, selection, and ZIP Code search with animated navigation."],
      ["Tools", "Mapbox GL JS · GeoJSON · JavaScript"],
      ["Dataset", "NYC Heat Vulnerability Index + ZIP Code Tabulation Areas."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/geospatial_structures/index.html" },
      { label: "HVI data", url: "https://data.cityofnewyork.us/Health/Heat-Vulnerability-Index-Rankings/4mhf-duep/about_data" }
    ],
    images: [
      ["assets/images/geospatial/1.png", "Citywide heat-vulnerability map"],
      ["assets/images/geospatial/2.png", "Area detail"],
      ["assets/images/geospatial/3.png", "ZIP Code search"],
      ["assets/images/geospatial/4.png", "High-HVI areas"]
    ]
  },
  {
    id: "engagement",
    number: "06",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Engagement",
    kicker: "Engagement Component",
    year: "2026",
    summary: "A multi-step public poll turns the NYC Open Streets program into a short, structured exchange about neighborhood priorities.",
    statement: "The interface moves from general support to specific preferences: where and when an Open Street should operate, what form it should take, and what a converted block should prioritize. Responses are stored through Firebase.",
    meta: [
      ["Study", "Lightweight civic participation through a focused multi-step interaction."],
      ["Interaction", "Conditional progression, submission feedback, and live data storage."],
      ["Tools", "Firebase · JavaScript · HTML/CSS"],
      ["Dataset", "User-generated poll responses collected through the website."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/open-streets-poll/index.html" }
    ],
    images: [
      ["assets/images/engagment/1.png", "Poll introduction"],
      ["assets/images/engagment/2.png", "Survey question two"],
      ["assets/images/engagment/3.png", "Survey question three"],
      ["assets/images/engagment/4.png", "Survey question four"],
      ["assets/images/engagment/5.png", "Survey completion state"]
    ]
  },
  {
    id: "agent",
    number: "07",
    course: "cdw",
    courseName: "Computational Design Workflows",
    title: "Agent",
    kicker: "Conversational Agent",
    year: "2026",
    summary: "A project-specific conversational guide helps visitors understand NYC Open Streets and move between information and participation.",
    statement: "The agent extends the Open Streets engagement project with a conversational interface powered by the OpenAI API. Its role is deliberately narrow: explain the topic, answer natural-language questions, and connect visitors to the surrounding project.",
    meta: [
      ["Study", "A contextual agent with a defined role inside a larger experience."],
      ["Interaction", "Natural-language chat with multi-turn responses."],
      ["Tools", "OpenAI API · JavaScript · Firebase / backend service"],
      ["Design", "Short exchanges and visual continuity with the project rather than a generic chat app."]
    ],
    links: [
      { label: "Open project", url: "https://wanerrrrr.github.io/cdw-repo/open-streets-agent-final/site/index.html" }
    ],
    images: [
      ["assets/images/agent/1.png", "Agent interface"],
      ["assets/images/agent/2.png", "Conversation state"],
      ["assets/images/agent/3.png", "Prompt and response flow"],
      ["assets/images/agent/4.png", "Prompt and response flow"]
    ]
  },
  {
    id: "cooling-equity",
    number: "08",
    course: "mapping",
    courseName: "Mapping Systems",
    title: "NYC Cooling Equity",
    fullTitle: "Heat Vulnerability and Cooling Equity in New York City",
    kicker: "Spatial Data Analysis",
    year: "2026",
    summary: "NYC Parks spray showers are mapped against heat vulnerability to identify high-risk ZCTAs with limited mapped spray-shower provision.",
    statement: "This study asks whether public cooling infrastructure aligns with the places most vulnerable to extreme heat. It combines Heat Vulnerability Index rankings with mapped spray showers, comparing their distribution without presenting the result as a per-capita measure.",
    meta: [
      ["Question", "Where do high heat vulnerability and limited spray-shower access overlap?"],
      ["Method", "Spatial joins, ZCTA-level counts and density comparisons, distribution plots, and zero-resource shares."],
      ["Reading", "Several high-risk ZCTAs show sparse or no mapped spray-shower provision."],
      ["Limits", "HVI is relative; spray showers are one cooling resource; ZCTAs do not describe walking access. Population-normalized claims are intentionally excluded."],
      ["Tools", "Python · GeoPandas · pandas · Matplotlib"]
    ],
    links: [
      { label: "View source", url: "https://github.com/Wanerrrrr/cdp-mapping-systems/tree/main/content/Assignments/Assignment1_Heat_Vulnerability_and_Cooling_Equity_NYC_submission" }
    ],
    images: [
      ["assets/images/mapping/cooling-equity/hero.png", "Cooling equity study overview"],
      ["assets/images/mapping/cooling-equity/hvi-by-zcta.png", "Heat Vulnerability Index by ZCTA"],
      ["assets/images/mapping/cooling-equity/spray-density.png", "Spray-shower density"],
      ["assets/images/mapping/cooling-equity/hvi-distribution.png", "HVI distribution"],
      ["assets/images/mapping/cooling-equity/density-boxplot.png", "Density comparison"],
      ["assets/images/mapping/cooling-equity/zero-spray-share.png", "Share of ZCTAs with no mapped spray shower"]
    ]
  },
  {
    id: "network-distance",
    number: "09",
    course: "mapping",
    courseName: "Mapping Systems",
    title: "Walking Central Park",
    fullTitle: "From The Met to Central Park Attractions",
    kicker: "Pedestrian Network Analysis",
    year: "2026",
    summary: "Straight-line distance and shortest pedestrian routes from The Met to twelve Central Park attractions reveal the detours hidden by proximity.",
    statement: "The project compares Euclidean distance with route distance on a pedestrian network. A destination can look nearby on a map while paths, entrances, and network geometry produce a meaningfully longer walk.",
    meta: [
      ["Question", "How different is apparent proximity from the distance a pedestrian must actually travel?"],
      ["Method", "Twelve attraction points, an OpenStreetMap walking network, shortest paths, and detour ratios."],
      ["Reading", "Network routes reveal which destinations require disproportionate detours despite short straight-line distances."],
      ["Limits", "Locations are snapped to approximate network nodes; the OSM snapshot does not measure slope, comfort, safety, or accessibility."],
      ["Tools", "Python · OSMnx · NetworkX · GeoPandas"]
    ],
    links: [
      { label: "View source", url: "https://github.com/Wanerrrrr/cdp-mapping-systems/tree/main/content/Assignments/Assignment3_Network" }
    ],
    images: [
      ["assets/images/mapping/network-distance/hero.png", "Walking-distance study overview"],
      ["assets/images/mapping/network-distance/pedestrian-network.png", "Central Park pedestrian network"],
      ["assets/images/mapping/network-distance/euclidean-connections.png", "Straight-line connections"],
      ["assets/images/mapping/network-distance/shortest-routes.png", "Shortest pedestrian routes"],
      ["assets/images/mapping/network-distance/distance-comparison.png", "Euclidean and network-distance comparison"],
      ["assets/images/mapping/network-distance/detour-ratio.png", "Detour ratio by destination"],
      ["assets/images/mapping/network-distance/08_distance_scatterplot.png", "Euclidean and network-distance scatterplot"]
    ]
  },
  {
    id: "geography-web",
    number: "10",
    course: "mapping",
    courseName: "Mapping Systems",
    title: "The Geography of a Website",
    fullTitle: "Mapping the Server Infrastructure Behind McDonald’s U.S. Website",
    kicker: "Interactive Web Infrastructure Map",
    year: "2026",
    summary: "A HAR-derived map makes the otherwise invisible geography of fifteen servers contacted by McDonald’s U.S. website visible.",
    statement: "Network requests captured in a HAR file are translated into approximate server locations. The map reframes a familiar website as distributed infrastructure, including first- and third-party services rather than physical restaurant or office locations.",
    meta: [
      ["Question", "What geographic network sits behind a single visit to a familiar website?"],
      ["Method", "HAR request extraction, IP lookup, approximate geolocation, and a Mapbox interface."],
      ["Reading", "The fifteen mapped requests concentrate in a few U.S. infrastructure regions."],
      ["Limits", "IP geolocation is approximate; it identifies network infrastructure, not company offices. Provider labels may be incomplete."],
      ["Tools", "HAR · IP geolocation · GeoJSON · Mapbox GL JS"]
    ],
    links: [
      { label: "Open live map", url: "https://wanerrrrr.github.io/mapping_system_web_mapping/" },
      { label: "View submission", url: "https://github.com/Wanerrrrr/cdp-mapping-systems/tree/main/content/Assignments/Assignment4_Web_mapping1" }
    ],
    images: [
      ["assets/images/mapping/geography-web/hero.png", "Server-location popup in the interactive map"],
      ["assets/images/mapping/geography-web/us-map.png", "Server locations across the United States"],
      ["assets/images/mapping/geography-web/ny-region.png", "Server locations around the New York region"]
    ]
  },
  {
    id: "open-streets",
    number: "11",
    course: "mapping",
    courseName: "Mapping Systems",
    title: "NYC Open Streets",
    fullTitle: "When and Where Are NYC Open Streets Accessible?",
    kicker: "Capstone · Urban Accessibility",
    year: "2026",
    summary: "Approved schedules, spatial distribution, and an approximate 800-meter walking threshold explore potential proximity to NYC Open Streets across time and space.",
    statement: "This capstone joins temporal availability with spatial access. It studies approved operating hours, where sites concentrate, and which parts of the city fall within an approximate ten-minute walk, then extends the analysis through a live explorer.",
    meta: [
      ["Question", "How does Open Streets access change across time, space, and boroughs?"],
      ["Method", "Schedule parsing, site distribution, approved-hours mapping, 800 m buffers, and borough-level comparison."],
      ["Reading", "Availability is uneven in both operating time and geographic coverage."],
      ["Limits", "Approved schedules do not guarantee actual operation; an 800 m buffer is not a pedestrian-network isochrone; static analysis and live data are distinct snapshots."],
      ["Tools", "Python · GeoPandas · Leaflet · Turf.js · Carto · NYC Open Data"]
    ],
    links: [
      { label: "Open local explorer", url: "projects/open-streets/index.html" },
      { label: "View source", url: "https://github.com/Wanerrrrr/cdp-mapping-systems/tree/main/content/Assignments/Final_Project_NYC_Open_Streets_2026_Live_Project" }
    ],
    images: [
      ["assets/images/mapping/open-streets/hero.png", "NYC Open Streets capstone overview"],
      ["assets/images/mapping/open-streets/time-availability.png", "Temporal availability"],
      ["assets/images/mapping/open-streets/02_daily_hours_distribution.png", "Daily operating-hours distribution"],
      ["assets/images/mapping/open-streets/03_daily_hours_by_weekday.png", "Daily operating hours by weekday"],
      ["assets/images/mapping/open-streets/04_full_period_hours_distribution.png", "Full-period operating-hours distribution"],
      ["assets/images/mapping/open-streets/approved-hours-map.png", "Approved operating hours"],
      ["assets/images/mapping/open-streets/site-concentration.png", "Open Streets site concentration"],
      ["assets/images/mapping/open-streets/06_site_count_by_borough.png", "Open Streets site count by borough"],
      ["assets/images/mapping/open-streets/07_site_density_by_borough.png", "Open Streets site density by borough"],
      ["assets/images/mapping/open-streets/08_length_density_by_borough.png", "Open Streets length density by borough"],
      ["assets/images/mapping/open-streets/ten-minute-access.png", "Approximate ten-minute walking access"],
      ["assets/images/mapping/open-streets/access-by-borough.png", "Access by borough"]
    ]
  },
  {
    id: "with-herself",
    number: "12",
    course: "research",
    courseName: "Design Research",
    title: "With Herself",
    kicker: "Wearable Interaction · AR Companion",
    year: "2025–2026",
    summary: "An AR smart-glasses companion exploring safety, presence, and support for women travelling alone.",
    detailLayout: "full-media",
    images: [
      ["assets/images/design-research/with-herself/01.jpg", "With Herself — project overview"],
      ["assets/images/design-research/with-herself/02.jpg", "Background research and interviews"],
      ["assets/images/design-research/with-herself/03.jpg", "AR glasses — inspiration and structural design"],
      ["assets/images/design-research/with-herself/04.jpg", "AR glasses — styling studies"],
      ["assets/images/design-research/with-herself/05.jpg", "3D printing and fabrication"],
      ["assets/images/design-research/with-herself/06.jpg", "Risk detection and Arduino prototype"],
      ["assets/images/design-research/with-herself/07.jpg", "App design and interaction flows"],
      ["assets/images/design-research/with-herself/08.jpg", "High-fidelity app and AR interface"],
      ["assets/images/design-research/with-herself/09.jpg", "In-context experience and wearable styling"]
    ]
  },
  {
    id: "tongue-trace",
    number: "13",
    course: "research",
    courseName: "Design Research",
    title: "Tongue Trace",
    kicker: "Health Interaction · Data Visualization",
    year: "2025",
    summary: "A health-app design project exploring tongue-image analysis and dynamic visualization for ongoing self-awareness.",
    detailLayout: "full-media",
    images: [
      ["assets/images/design-research/tongue-trace/01.jpg", "Tongue Trace — project overview"],
      ["assets/images/design-research/tongue-trace/02.jpg", "Research context and design question"],
      ["assets/images/design-research/tongue-trace/03.jpg", "Tongue appearance and medical data foundation"],
      ["assets/images/design-research/tongue-trace/04.jpg", "Analysis code and interpretation system"],
      ["assets/images/design-research/tongue-trace/05.jpg", "Visual construction and particle generation"],
      ["assets/images/design-research/tongue-trace/06.jpg", "Dynamic visualization studies"],
      ["assets/images/design-research/tongue-trace/07.jpg", "App flow, wireframes, and user testing"],
      ["assets/images/design-research/tongue-trace/08.jpg", "Final UI and in-context use"]
    ]
  },
  {
    id: "slope-analyzer",
    number: "14",
    course: "research",
    courseName: "Design Research",
    title: "Slope Analyzer",
    kicker: "Urban Accessibility · Spatial Tool",
    year: "2026",
    summary: "A spatial diagnostic tool exploring street slope, sustained wheelchair mobility burden, and potential recovery opportunities in steep urban networks.",
    detailLayout: "full-media",
    imageLinks: [
      {
        imageIndex: 5,
        href: "https://wanerrrrr.github.io/Slope_Analyser/",
        label: "Open Slope Analyzer web map (opens in a new tab)",
        bounds: [0.15, 0.068, 0.365, 0.04]
      }
    ],
    images: [
      ["assets/images/design-research/slope-analyzer/01.jpg", "Slope Analyzer — project overview"],
      ["assets/images/design-research/slope-analyzer/02.jpg", "Analysis parameters, metrics, and workflow"],
      ["assets/images/design-research/slope-analyzer/03.jpg", "Grasshopper definition and street-analysis output"],
      ["assets/images/design-research/slope-analyzer/04.jpg", "Street-network and landing-opportunity analysis"],
      ["assets/images/design-research/slope-analyzer/05.jpg", "Applying the tool to Washington Heights"],
      ["assets/images/design-research/slope-analyzer/06.jpg", "Interactive web-map views"]
    ]
  }
];
