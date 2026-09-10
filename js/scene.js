import * as THREE from "./vendor/three.module.min.js";

const TAU = Math.PI * 2;
const EPSILON = 0.0001;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const damp = (current, target, lambda, delta) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
const mod = (value, length) => ((value % length) + length) % length;
const isVideoSource = (source = "") => /\.(mp4|webm|ogv|mov)(?:[?#].*)?$/i.test(source);
const isAnimatedImage = (source = "") => /\.(gif|apng)(?:[?#].*)?$/i.test(source);

function projectImage(project, imageIndex = 0) {
  const entry = project?.images?.[imageIndex] ?? project?.image ?? project?.cover ?? "";
  return Array.isArray(entry) ? entry[0] : entry;
}

function projectImageAlt(project, imageIndex = 0) {
  const entry = project?.images?.[imageIndex];
  return Array.isArray(entry) ? entry[1] || project?.title || "" : project?.title || "";
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Three.js project-scene engine.
 *
 * The canvas is intentionally alpha-enabled. Every visible WebGL element is
 * first rendered to a transparent RenderTarget, then passed through one
 * full-frame water-displacement shader. That means cards, the detail-paper
 * edge, the black-hole halo and transparency boundaries share one ripple.
 */
export class Gallery3D {
  get activeProject() {
    if (this.mode === "detail" && this.detailProject) return this.detailProject;
    return this.visibleProjects[this.activeIndex] || null;
  }

  constructor({
    canvas,
    projects = [],
    onReady = () => {},
    onActiveChange = () => {},
    onSelect = () => {},
    onHoverChange = () => {},
    onRingChange = () => {},
    onRingClose = () => {},
    onDetailProjectChange = () => {},
    onDetailMediaChange = () => {},
    onDragStart = () => {},
    onDragEnd = () => {},
    onError = (error) => console.error(error),
    loop = true,
    captureWheel = true,
    autoIntro = true,
    introDelay = 450,
    reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    detailRect = null
  } = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Gallery3D requires a canvas element.");
    }


    this.canvas = canvas;
    this.projects = [...projects];
    this.visibleProjects = [...projects];
    this.loop = loop;
    this.captureWheel = captureWheel;
    this.reducedMotion = reducedMotion;
    this.callbacks = {
      onReady,
      onActiveChange,
      onSelect,
      onHoverChange,
      onRingChange,
      onRingClose,
      onDetailProjectChange,
      onDetailMediaChange,
      onDragStart,
      onDragEnd,
      onError
    };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    if (this.renderer.debug) {
      this.renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
        const error = [
          gl.getProgramInfoLog(program),
          gl.getShaderInfoLog(vertexShader),
          gl.getShaderInfoLog(fragmentShader)
        ].filter(Boolean).join(" | ");
        document.documentElement.dataset.shaderError = error.slice(0, 1800);
        this.callbacks?.onError?.(new Error(error || "A WebGL shader failed to compile."));
      };
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.z = 14.72;
    this.camera.lookAt(0, 0, 0);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2(10, 10);
    this.pointerUV = new THREE.Vector2(0.5, 0.5);

    this.sharedUniforms = {
      time: { value: 0 },
      motion: { value: 0 },
      ripple: { value: reducedMotion ? 0 : 1 }
    };

    this.cardGeometry = new THREE.PlaneGeometry(1, 1, 49, 33);
    this.cardShellGeometry = new THREE.BoxGeometry(1.012, 1.012, 0.055, 1, 1, 1);
    this.paperGeometry = new THREE.PlaneGeometry(1, 1, 64, 40);
    this.placeholderTexture = this._makePlaceholderTexture();
    this.textureCache = new Map();
    this.labelTextures = new Set();
    this.videoElements = new Set();
    this.animatedImageTextures = new Set();
    this.cards = [];
    this.detailMeshes = [];

    this.position = 0;
    this.positionTarget = 0;
    this.velocity = 0;
    this.activeIndex = 0;
    this.lastActiveIndex = -1;
    this.mode = "ribbon";
    this.modeBeforeDetail = "ribbon";
    this.aboutMix = 0;
    this.aboutTarget = 0;
    this.ringMix = 0;
    this.ringTarget = 0;
    this.ringProject = null;
    this.detailMix = 0;
    this.detailTarget = 0;
    this.detailProject = null;
    this.detailProjectIndex = -1;
    this.detailScroll = 0;
    this.detailScrollTarget = 0;
    this.detailScrollVelocity = 0;
    this.detailMediaIndex = 0;
    this.detailSwipe = 0;
    this.detailSwipeTarget = 0;
    this.detailSwipeVelocity = 0;
    this.detailDragging = false;
    this.detailDragDistance = 0;
    this.detailMediaReveal = 1;
    this.detailMediaRevealStart = 0;
    this.detailRect = detailRect;
    this.transitionDuration = reducedMotion ? 0 : 1050;
    this._transitionWaiters = [];

    this.introMix = reducedMotion ? 1 : 0;
    this.introStart = Infinity;
    this.introDuration = reducedMotion ? 0 : 2350;
    this.autoIntro = autoIntro;
    this.introDelay = introDelay;
    this.ready = false;
    this.enabled = true;
    this.destroyed = false;
    this.inputLockedUntil = 0;

    this.pointer = {
      down: false,
      id: null,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastTime: 0,
      moved: false,
      hit: null
    };
    this.hoveredCard = null;
    this.wheelSnapTimer = null;
    this.lastFrameTime = performance.now();

    // A short history of cursor positions drives an actual decaying wake in
    // the render-target pass. Each vec3 stores screen UV plus remaining life.
    this.rippleTrail = Array.from({ length: 12 }, () => new THREE.Vector3(-2, -2, 0));
    this.rippleTrailCursor = 0;
    this.lastRippleSample = new THREE.Vector2(-2, -2);

    this.cardGroup = new THREE.Group();
    this.cardGroup.name = "Gallery cards";
    this.scene.add(this.cardGroup);

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = "Continuous ring surface";
    this.scene.add(this.previewGroup);
    this.ringAnchorPosition = 0;
    // Screen-space X where the selected card begins its ring transition.
    // Keeping this separate from the gallery's normal left-hand focal point
    // lets any visible card travel straight from where it was clicked to the
    // centre, without first stopping at the work-ribbon focus.
    this.ringEntryOffsetX = 0;
    this.useContinuumTransition = false;
    this._buildPreviewMesh();

    // The ring is not a second carousel. It is one high-density strip whose
    // middle is displaced outward to make a hole. A linear canvas atlas gives
    // every visible project one continuous coordinate along that strip, so
    // scrolling moves material through the opening instead of crossfading
    // separate project meshes.
    this.continuumGroup = new THREE.Group();
    this.continuumGroup.name = "Continuous flowing ribbon";
    this.scene.add(this.continuumGroup);
    this.ribbonAtlasTexture = null;
    this.ribbonAtlasVersion = 0;
    this.ringTextureSignature = "";
    this.ribbonSurfaceMaterials = [];
    this.ringRibbonMeshes = [];
    this._buildContinuumRibbon();
    this._buildRingRibbonSurfaces();

    this.detailGroup = new THREE.Group();
    this.detailGroup.name = "Detail media";
    this.scene.add(this.detailGroup);

    this._buildBlackHole();
    this._buildDetailPaper();
    this._buildPostProcess();
    this._bindEvents();
    this.resize();
    this.setProjects(this.projects);

    this._tick = this._tick.bind(this);
    this.animationFrame = requestAnimationFrame(this._tick);

    // Do not hold the loader until every gallery image has downloaded. The
    // first cover or a short fallback is enough to reveal the staged intro.
    window.setTimeout(() => this._markReady(), 360);
  }

  _makePlaceholderTexture() {
    const pixels = new Uint8Array([
      34, 34, 33, 255,
      21, 21, 21, 255,
      21, 21, 21, 255,
      34, 34, 33, 255
    ]);
    const texture = new THREE.DataTexture(pixels, 2, 2, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _buildPreviewMesh() {
    const material = this._cardMaterial();
    material.depthWrite = true;
    material.depthTest = true;
    this.previewMesh = new THREE.Mesh(this.cardGeometry, material);
    this.previewMesh.name = "Continuous ring surface (shared depth)";
    // Keep the ring in the same depth-sorted pass as the side cards. A high
    // forced renderOrder makes it read as a floating overlay instead of one
    // continuous surface.
    this.previewMesh.renderOrder = 10;
    this.previewMesh.visible = false;
    this.previewMesh.userData = { project: null, isPreview: true };
    this.previewMesh.scale.set(6.14, 3.72, 1);
    this.previewGroup.add(this.previewMesh);
  }

  _buildContinuumRibbon() {
    const geometry = new THREE.PlaneGeometry(1, 1, 420, 156);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        uAtlas: { value: this.placeholderTexture },
        uCount: { value: 1 },
        uPosition: { value: 0 },
        uSegmentWidth: { value: 5.8 },
        uViewWidth: { value: 16 },
        uHeight: { value: 3.72 },
        uTransitionOffsetX: { value: 0 },
        uRing: { value: 0 },
        uOpacity: { value: 0 },
        uTime: this.sharedUniforms.time,
        uMotion: this.sharedUniforms.motion
      },
      vertexShader: /* glsl */`
        uniform float uPosition;
        uniform float uSegmentWidth;
        uniform float uViewWidth;
        uniform float uHeight;
        uniform float uTransitionOffsetX;
        uniform float uRing;
        uniform float uTime;
        uniform float uMotion;
        varying vec2 vUv;
        varying float vStrip;
        varying float vSourceRadius;
        varying float vRingInfluence;
        varying float vShade;
        varying vec2 vWorldXY;

        float ribbonDepthAt(float screenX) {
          float front = 2.80 * exp(-pow((screenX - 0.355) / 0.225, 2.0));
          float rear = 3.00 * exp(-pow((screenX - 0.700) / 0.220, 2.0));
          return front - rear - 0.040;
        }

        void main() {
          vUv = uv;
          float width = uViewWidth * 1.38;
          float x = position.x * width;
          float y = position.y * uHeight;
          // One coordinate spans the whole gallery. The centered project's
          // middle is at x=0; its shoulders and both neighbouring projects
          // remain part of this exact same texture stream.
          vStrip = uPosition + 0.5 + x / max(uSegmentWidth, 0.001);

          vec2 base = vec2(x, y);
          float halfHeight = max(uHeight * 0.5, 0.001);
          float absX = abs(x);
          float verticalT = clamp(abs(y) / halfHeight, 0.0, 1.0);
          float side = step(0.0, y) * 2.0 - 1.0;

          // Parameterise the aperture as two ordered halves of the original
          // strip. The middle row is pushed to the elliptical inner edge and
          // the top/bottom rows to the outer contour. X never changes, so the
          // current project's flat shoulders remain stitched to the ring and
          // the following projects remain the same continuous strip.
          float innerProfile = 2.08 * sqrt(max(
            0.0,
            1.0 - pow(absX / 2.24, 2.0)
          ));
          // A zero-slope bell returns the ring to the flat ribbon gradually.
          // Unlike max(ellipse, ribbon), it has no corner where the two
          // silhouettes meet.
          float shoulderBase = max(
            0.0,
            1.0 - pow(absX / 3.66, 2.0)
          );
          float outerProfile = halfHeight
            + 1.32 * pow(shoulderBase, 1.72);
          float holeInfluence = 1.0 - smoothstep(2.02, 2.52, absX);
          float mappedT = mix(
            verticalT,
            pow(verticalT, 0.82),
            holeInfluence
          );
          float mappedY = side * mix(
            innerProfile,
            outerProfile,
            mappedT
          );
          float localMask = 1.0 - smoothstep(3.42, 3.66, absX);
          float influence = uRing * localMask;
          vec2 ribbonXY = vec2(x, mix(y, mappedY, influence));

          float screenX = 0.5 + x / max(uViewWidth, 0.001);
          float depth = ribbonDepthAt(screenX);
          float activity = smoothstep(0.015, 0.42, abs(uMotion));
          float radius = length(base / vec2(3.88, halfHeight));
          float theta = atan(base.y / halfHeight, base.x / 3.88);
          float liquid = activity * (
            sin(radius * 13.0 - uPosition * 5.2 + uTime * 2.5) * 0.060
            + sin(theta * 5.0 - uTime * 2.1) * 0.025
          );
          float ringBand = sin(verticalT * 3.14159265) * localMask;
          float ringDepth = 0.08 + ringBand * 0.16 + liquid
            + uMotion * sign(x) * 0.055;

          float depthLight = smoothstep(-3.05, 2.55, depth);
          vShade = mix(0.72 + depthLight * 0.34, 0.96 + liquid * 0.12, influence);
          vSourceRadius = radius;
          vRingInfluence = influence;
          vWorldXY = ribbonXY;
          vec3 world = vec3(
            ribbonXY.x + uTransitionOffsetX,
            0.055 + ribbonXY.y,
            // In ring mode the complete strip shares one depth plane. If the
            // side shoulders retained the work-mode Z wave, perspective would
            // introduce a visible hinge exactly where the local XY warp ends.
            mix(depth, ringDepth, uRing)
          );
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uAtlas;
        uniform float uCount;
        uniform float uRing;
        uniform float uOpacity;
        uniform float uTime;
        uniform float uMotion;
        varying vec2 vUv;
        varying float vStrip;
        varying float vSourceRadius;
        varying float vRingInfluence;
        varying float vShade;
        varying vec2 vWorldXY;

        float positiveMod(float value, float divisor) {
          return mod(mod(value, divisor) + divisor, divisor);
        }

        void main() {
          // Sampling never switches textures. Scrolling changes one continuous
          // atlas coordinate, so imagery physically flows through the same
          // deformed surface instead of cross-fading between projects.
          float segment = positiveMod(vStrip, uCount);
          float activity = smoothstep(0.015, 0.42, abs(uMotion));
          float flow = activity * sin(vStrip * 9.0 + vUv.y * 8.0 - uTime * 3.0) * 0.010;
          float velocityFlow = clamp(uMotion, -1.0, 1.0) * 0.009;
          vec2 atlasUv = vec2(
            positiveMod(vStrip + flow, uCount) / uCount,
            clamp(
              vUv.y
                + activity * sin(vStrip * 4.1 - uTime * 2.4) * 0.008
                + velocityFlow,
              0.002,
              0.998
            )
          );
          vec3 image = texture2D(uAtlas, atlasUv).rgb;

          // Grow the actual cutout with the geometry so entry and
          // exit never need a translucent black DOM layer over the image.
          float hole = length(vWorldXY / vec2(2.24, 2.08));
          if (uRing > 0.002 && hole < uRing * 0.995) discard;
          float innerGlow = exp(-pow((hole - 1.02) * 8.5, 2.0));
          image *= vShade;
          image += innerGlow * vRingInfluence * vec3(0.026, 0.034, 0.034);
          float alpha = uOpacity;
          if (alpha < 0.003) discard;
          gl_FragColor = vec4(image, alpha);
        }
      `
    });
    this.continuumMesh = new THREE.Mesh(geometry, material);
    this.continuumMesh.name = "One-piece glass ribbon";
    this.continuumMesh.renderOrder = 11;
    this.continuumMesh.visible = false;
    this.continuumGroup.add(this.continuumMesh);
  }

  _buildRingRibbonSurfaces() {
    const ringMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        uAtlas: { value: this.placeholderTexture },
        uImage: { value: this.placeholderTexture },
        uImageNext: { value: this.placeholderTexture },
        uCount: { value: 1 },
        uPosition: { value: 0 },
        uFlow: { value: 0 },
        uBlend: { value: 0 },
        uMorph: { value: 0 },
        uFlatOffsetX: { value: 0 },
        uFlatDepth: { value: 0 },
        uOpacity: { value: 0 },
        uTime: this.sharedUniforms.time,
        uMotion: this.sharedUniforms.motion
      },
      vertexShader: /* glsl */`
        uniform float uPosition;
        uniform float uTime;
        uniform float uMotion;
        uniform float uMorph;
        uniform float uFlatOffsetX;
        uniform float uFlatDepth;
        varying float vImageX;
        varying float vImageY;
        varying float vAngle;
        varying float vRadius;
        varying float vGlass;
        varying vec3 vWorldPosition;
        void main() {
          float theta = atan(position.y, position.x);
          float radius = length(position.xy);
          float activity = smoothstep(0.015, 0.42, abs(uMotion));
          float liquid = sin(theta * 3.0 - uPosition * 1.7) * 0.030;
          liquid += sin(theta * 7.0 + uPosition * 0.9) * 0.012;
          liquid += activity * sin(theta * 4.0 - uPosition * 5.6 + uTime * 2.1) * 0.075;
          liquid += activity * sin(theta * 9.0 + uTime * 3.2) * 0.026;
          float radialT = clamp((radius - 0.62) / 0.38, 0.0, 1.0);
          float body = sin(radialT * 3.14159265);
          vec2 direction = vec2(cos(theta), sin(theta));
          float squareBoundary = 0.5 / max(max(abs(direction.x), abs(direction.y)), 0.001);
          float sourceRadius = radialT * squareBoundary * 0.985;
          vec2 sourceUv = vec2(0.5) + direction * sourceRadius;
          vec2 flatPosition = (sourceUv - 0.5) * vec2(5.86, 3.72)
            + vec2(uFlatOffsetX, 0.0);
          float mappedRadiusX = mix(0.645, 1.0, radialT);
          float mappedRadiusY = mix(0.735, 1.0, radialT);
          vec2 ringPosition = vec2(
            direction.x * mappedRadiusX * (3.58 + liquid),
            direction.y * mappedRadiusY * (3.00 + liquid * 0.70)
          );
          float morph = uMorph * uMorph * (3.0 - 2.0 * uMorph);
          vec3 p = vec3(mix(flatPosition, ringPosition, morph), 0.0);
          float ringZ = 0.10 + body * 0.105
            + liquid * 0.18
            + activity * sin(theta * 2.0 - uTime * 2.4) * 0.045
            + uMotion * cos(theta) * 0.045;
          p.z = mix(uFlatDepth, ringZ, morph);
          // The source square is sampled radially: its centre collapses to a
          // point in ribbon mode, then becomes the inner boundary of the hole.
          vImageX = sourceUv.x;
          vImageY = sourceUv.y;
          vAngle = (theta + 3.14159265) / 6.2831853;
          vRadius = radius;
          vGlass = liquid;
          vWorldPosition = p;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uImage;
        uniform sampler2D uImageNext;
        uniform float uPosition;
        uniform float uOpacity;
        uniform float uTime;
        uniform float uFlow;
        uniform float uBlend;
        uniform float uMotion;
        varying float vImageX;
        varying float vImageY;
        varying float vAngle;
        varying float vRadius;
        varying float vGlass;
        varying vec3 vWorldPosition;
        void main() {
          vec2 source = vec2(vImageX, vImageY);
          vec2 fromCentre = source - 0.5;
          float signedFlow = uFlow - floor(uFlow + 0.5);
          float flowAngle = signedFlow * 0.18;
          mat2 flowRotation = mat2(cos(flowAngle), -sin(flowAngle), sin(flowAngle), cos(flowAngle));
          fromCentre = flowRotation * fromCentre;
          source = vec2(0.5) + fromCentre;
          float sourceLength = max(length(fromCentre), 0.0001);
          vec2 tangent = vec2(-fromCentre.y, fromCentre.x) / sourceLength;
          vec2 radial = fromCentre / sourceLength;
          float activity = smoothstep(0.015, 0.42, abs(uMotion));
          float refraction = sin(vAngle * 12.0 + sourceLength * 18.0 + uFlow * 7.0) * 0.005;
          refraction += activity * sin(vAngle * 27.0 - uTime * 3.4 - uFlow * 4.0) * 0.012;
          vec2 uv = source
            + tangent * (refraction + uFlow * 0.020)
            + radial * sin(vAngle * 9.0 - uFlow * 5.0 + uTime * 2.6 * activity)
              * (0.003 + activity * 0.012);
          uv = clamp(uv, 0.003, 0.997);
          vec3 fromImage = texture2D(uImage, uv).rgb;
          vec3 toImage = texture2D(uImageNext, uv).rgb;
          float liquidFront = sin(vImageY * 13.0 + vImageX * 7.0 + uFlow * 3.0) * 0.085;
          liquidFront += sin(vRadius * 42.0 - vAngle * 11.0 - uTime * 3.0 * activity)
            * (0.012 + activity * 0.042);
          float wipe = smoothstep(-0.18, 0.18, uBlend - vAngle + liquidFront);
          wipe = mix(wipe, 0.0, 1.0 - smoothstep(0.0, 0.015, uBlend));
          wipe = mix(wipe, 1.0, smoothstep(0.985, 1.0, uBlend));
          vec3 image = mix(fromImage, toImage, wipe);
          float innerRim = exp(-pow((vRadius - 0.62) * 13.0, 2.0));
          float outerShade = smoothstep(0.62, 1.0, vRadius);
          vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 2.4);
          vec3 lightDirection = normalize(vec3(-0.4, 0.75, 1.0));
          float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 28.0);
          vec3 glass = image * (0.76 + vGlass * 0.20) + vec3(0.006, 0.010, 0.011);
          glass += innerRim * vec3(0.024, 0.036, 0.036);
          glass += fresnel * vec3(0.024, 0.032, 0.032) + specular * vec3(0.052);
          gl_FragColor = vec4(mix(glass, image * 0.94, outerShade * 0.40), uOpacity);
        }
      `
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 1.0, 320, 36), ringMaterial);
    ring.name = "Glass aperture from continuous ribbon";
    ring.renderOrder = 14;
    ring.visible = false;
    this.continuumGroup.add(ring);
    this.ringRibbonMeshes.push(ring);
    this.ribbonSurfaceMaterials.push(ringMaterial);

    [-1, 1].forEach((side) => {
      const wingMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
        uniforms: {
          uAtlas: { value: this.placeholderTexture },
          uImage: { value: this.placeholderTexture },
          uImageNext: { value: this.placeholderTexture },
          uCount: { value: 1 },
          uPosition: { value: 0 },
          uOpacity: { value: 0 },
          uBlend: { value: 0 },
          uTime: this.sharedUniforms.time,
          uMotion: this.sharedUniforms.motion,
          uSide: { value: side }
        },
        vertexShader: /* glsl */`
          uniform float uPosition;
          uniform float uTime;
          uniform float uMotion;
          uniform float uSide;
          varying float vStrip;
          varying vec2 vUv;
          varying float vShade;
          varying float vDistance;
          varying vec3 vWorldPosition;
          void main() {
            vUv = uv;
            float distanceOut = position.x + 0.5;
            float join = smoothstep(0.0, 0.30, distanceOut);
            // The wing overlaps the ring's outer shoulder before it opens to
            // full height, giving the two materials a soft continuous join.
            float edgeY = position.y * 2.0;
            float edgeAngle = edgeY * 0.68;
            float innerX = uSide * 3.58 * cos(edgeAngle);
            float innerY = 3.00 * sin(edgeAngle);
            float outerX = uSide * (3.26 + distanceOut * 4.25);
            float outerY = position.y * 2.10;
            float blendDistance = smoothstep(0.0, 1.0, distanceOut);
            float x = mix(innerX, outerX, blendDistance);
            float y = mix(innerY, outerY, blendDistance);
            float activity = smoothstep(0.015, 0.42, abs(uMotion));
            float wave = sin(distanceOut * 5.0 + position.y * 3.0 - uPosition * 3.8) * 0.018;
            wave += activity * sin(distanceOut * 7.0 + position.y * 4.0 - uTime * 2.5) * 0.055;
            float z = 0.085 - distanceOut * 0.30 + wave + uMotion * uSide * 0.04;
            // One atlas coordinate spans the complete gallery. At the join it
            // lands exactly on the left/right edge of the image currently
            // wrapped around the aperture, then continues into its neighbour.
            vStrip = uPosition + uSide * (0.5 + distanceOut * 1.12);
            vShade = 0.70 + 0.16 * join + wave * 0.35;
            vDistance = distanceOut;
            vWorldPosition = vec3(x, 0.055 + y, z);
            gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform sampler2D uAtlas;
          uniform sampler2D uImage;
          uniform sampler2D uImageNext;
          uniform float uCount;
          uniform float uOpacity;
          uniform float uTime;
          uniform float uBlend;
          uniform float uMotion;
          uniform float uSide;
          varying float vStrip;
          varying vec2 vUv;
          varying float vShade;
          varying float vDistance;
          varying vec3 vWorldPosition;
          float positiveMod(float value, float divisor) { return mod(mod(value, divisor) + divisor, divisor); }
          void main() {
            float activity = smoothstep(0.015, 0.42, abs(uMotion));
            float ripple = sin(vUv.y * 18.0 + vStrip * 3.5) * 0.002;
            ripple += activity * sin(vUv.y * 18.0 + vStrip * 3.5 - uTime * 3.0) * 0.010;
            float drift = activity * sin(vStrip * 13.0 - uTime * 3.4 + vUv.y * 9.0) * 0.014;
            vec2 uv = vec2(positiveMod(vStrip + drift, uCount) / uCount, clamp(vUv.y + ripple, 0.003, 0.997));
            vec3 atlasImage = texture2D(uAtlas, uv).rgb;
            vec3 currentImage = texture2D(uImage, vec2(
              uSide < 0.0 ? clamp(vDistance * 0.72, 0.0, 1.0) : clamp(1.0 - vDistance * 0.72, 0.0, 1.0),
              vUv.y
            )).rgb;
            // The shoulder belongs to the centered project only. Neighbours
            // are rendered by their own card meshes, with a real black gap in
            // between; the atlas is intentionally not allowed to bridge it.
            float shoulder = 1.0 - smoothstep(0.42, 0.62, vDistance);
            vec3 surfaceImage = mix(atlasImage, currentImage, shoulder);
            vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 2.2);
            float travellingGloss = pow(max(0.0, sin(vStrip * 4.8 - uTime * 3.0 * activity)), 12.0);
            vec3 image = surfaceImage * vShade + vec3(0.006, 0.010, 0.011);
            image += fresnel * vec3(0.035, 0.045, 0.048)
              + travellingGloss * activity * vec3(0.055);
            float shoulderAlpha = 1.0 - smoothstep(0.54, 0.68, vDistance);
            float finalAlpha = uOpacity * shoulderAlpha;
            if (finalAlpha < 0.003) discard;
            gl_FragColor = vec4(image, finalAlpha);
          }
        `
      });
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 180, 72), wingMaterial);
      wing.name = side < 0 ? "Continuous left ribbon wing" : "Continuous right ribbon wing";
      wing.renderOrder = 13;
      wing.visible = false;
      this.continuumGroup.add(wing);
      this.ringRibbonMeshes.push(wing);
      this.ribbonSurfaceMaterials.push(wingMaterial);
    });
  }

  _rebuildRibbonAtlas() {
    const projects = this.visibleProjects.length ? this.visibleProjects : this.projects;
    const version = ++this.ribbonAtlasVersion;
    const count = Math.max(projects.length, 1);
    const cellWidth = 512;
    const cellHeight = 384;
    const canvas = document.createElement("canvas");
    canvas.width = cellWidth * count;
    canvas.height = cellHeight;
    const context = canvas.getContext("2d");
    if (!context || !this.continuumMesh) return;

    context.fillStyle = "#080908";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const previous = this.ribbonAtlasTexture;
    this.ribbonAtlasTexture = texture;
    this.continuumMesh.material.uniforms.uAtlas.value = texture;
    this.continuumMesh.material.uniforms.uCount.value = count;
    this.ribbonSurfaceMaterials.forEach((material) => {
      material.uniforms.uAtlas.value = texture;
      material.uniforms.uCount.value = count;
    });
    previous?.dispose?.();

    const drawCover = (image, index) => {
      if (version !== this.ribbonAtlasVersion || this.destroyed) return;
      const width = image.naturalWidth || image.videoWidth || 1;
      const height = image.naturalHeight || image.videoHeight || 1;
      const gutter = 2;
      const imageWidth = cellWidth - gutter * 2;
      const scale = Math.max(imageWidth / width, cellHeight / height);
      const drawWidth = width * scale;
      const drawHeight = height * scale;
      context.save();
      context.beginPath();
      context.rect(index * cellWidth + gutter, 0, imageWidth, cellHeight);
      context.clip();
      context.drawImage(
        image,
        index * cellWidth + gutter + (imageWidth - drawWidth) * 0.5,
        (cellHeight - drawHeight) * 0.5,
        drawWidth,
        drawHeight
      );
      context.restore();
      texture.needsUpdate = true;
    };

    projects.forEach((project, index) => {
      const source = projectImage(project);
      if (!source || isVideoSource(source)) return;
      const image = new Image();
      image.decoding = "async";
      image.crossOrigin = "anonymous";
      image.onload = () => drawCover(image, index);
      image.src = source;
    });
    texture.needsUpdate = true;
  }

  _buildBlackHole() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: this.sharedUniforms.time,
        uOpacity: { value: 0 }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float radius = length(p);
          float swirl = sin(atan(p.y, p.x) * 7.0 - uTime * 0.55 + radius * 19.0);
          float outer = smoothstep(1.06, 0.70, radius);
          float core = smoothstep(0.52, 0.62, radius);
          float rim = exp(-pow((radius - 0.66) * 9.0, 2.0));
          float filaments = smoothstep(0.2, 1.0, swirl) * rim * 0.2;
          vec3 color = mix(vec3(0.018), vec3(0.42, 0.45, 0.48), rim * 0.52 + filaments);
          float alpha = outer * (core * 0.24 + rim * 0.66 + filaments) * uOpacity;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    this.blackHole = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 4.2, 1, 1), material);
    this.blackHole.position.z = -0.5;
    this.blackHole.renderOrder = -10;
    this.scene.add(this.blackHole);
  }

  _buildDetailPaper() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: this.sharedUniforms.time,
        uMotion: this.sharedUniforms.motion,
        uOpacity: { value: 0 },
        uRadius: { value: 0.055 },
        uInward: { value: 0 }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uMotion;
        uniform float uInward;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float waist = sin(uv.y * 3.14159265);
          p.x *= 1.0 - waist * uInward;
          float edge = pow(abs(uv.x - 0.5) * 2.0, 2.0);
          p.z += sin(uv.y * 13.0 + uTime * 1.1) * edge * uMotion * 0.035;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uOpacity;
        uniform float uRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        void main() {
          float distanceToEdge = roundedBoxSDF(vUv - 0.5, vec2(0.5), uRadius);
          float alpha = 1.0 - smoothstep(-0.004, 0.004, distanceToEdge);
          vec3 paper = vec3(0.938, 0.935, 0.912);
          gl_FragColor = vec4(paper, alpha * uOpacity);
        }
      `
    });
    this.detailPaper = new THREE.Mesh(this.paperGeometry, material);
    this.detailPaper.position.z = -0.03;
    this.detailPaper.renderOrder = -2;
    this.scene.add(this.detailPaper);
  }

  _buildPostProcess() {
    this.renderTarget = new THREE.WebGLRenderTarget(2, 2, {
      depthBuffer: true,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    });
    this.renderTarget.texture.colorSpace = THREE.SRGBColorSpace;

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: this.renderTarget.texture },
        uTime: this.sharedUniforms.time,
        uMotion: this.sharedUniforms.motion,
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uPointerEnergy: { value: 0 },
        uTrail: { value: this.rippleTrail },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uStrength: { value: this.reducedMotion ? 0 : 1 }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tScene;
        uniform float uTime;
        uniform float uMotion;
        uniform float uPointerEnergy;
        uniform float uStrength;
        uniform vec2 uPointer;
        uniform vec2 uResolution;
        uniform vec3 uTrail[12];
        varying vec2 vUv;

        void main() {
          vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
          vec2 pointerDelta = (vUv - uPointer) * aspect;
          float pointerDistance = length(pointerDelta);
          float pointerRing = sin(pointerDistance * 56.0 - uTime * 4.4)
            * exp(-pointerDistance * 8.0) * uPointerEnergy;

          vec2 trailDisplacement = vec2(0.0);
          for (int i = 0; i < 12; i++) {
            vec2 trailDelta = (vUv - uTrail[i].xy) * aspect;
            float trailDistance = length(trailDelta);
            float life = clamp(uTrail[i].z, 0.0, 1.0);
            float wave = sin(trailDistance * 168.0 - (1.0 - life) * 22.0)
              * exp(-trailDistance * 21.0) * life * life;
            vec2 direction = trailDistance > 0.0001
              ? trailDelta / trailDistance
              : vec2(0.0);
            trailDisplacement += direction * wave;
          }

          float slowA = sin(vUv.y * 16.0 + uTime * 0.72 + sin(vUv.x * 8.0));
          float slowB = cos(vUv.x * 18.0 - uTime * 0.58 + vUv.y * 7.0);
          float energy = min(abs(uMotion), 1.0) * 0.0024 * uStrength;
          vec2 displacement = vec2(slowA, slowB) * energy
            + vec2(pointerRing, pointerRing * 0.7) * 0.00055 * uStrength
            + trailDisplacement * 0.0038 * uStrength;

          // Preserve alpha while displacing it: transparent boundaries and
          // the large paper edge ripple together with the imagery.
          vec4 center = texture2D(tScene, vUv + displacement);
          float chroma = min(abs(uMotion), 1.0) * 0.00075 * uStrength;
          float red = texture2D(tScene, vUv + displacement + vec2(chroma, 0.0)).r;
          float blue = texture2D(tScene, vUv + displacement - vec2(chroma, 0.0)).b;
          center.rgb = vec3(red, center.g, blue);
          gl_FragColor = center;
        }
      `
    });
    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    this.postScene.add(this.postQuad);
  }

  _cardMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      uniforms: {
        uTexture: { value: this.placeholderTexture },
        uLabel: { value: this.placeholderTexture },
        uImageAspect: { value: 1 },
        uPlaneAspect: { value: 0.72 },
        uTime: this.sharedUniforms.time,
        uMotion: this.sharedUniforms.motion,
        uRipple: this.sharedUniforms.ripple,
        uOpacity: { value: 0 },
        uHover: { value: 0 },
        uHoverPoint: { value: new THREE.Vector2(0.5, 0.5) },
        uCurve: { value: 0 },
        uDetail: { value: 0 },
        uMediaDetach: { value: 0 },
        uMediaReveal: { value: 1 },
        uProjectRing: { value: 0 },
        uRibbonSurface: { value: 0 },
        uRibbonRelative: { value: 0 },
        uRibbonHeight: { value: 3.72 },
        uRibbonSegmentWidth: { value: 5.8 },
        uRibbonViewWidth: { value: 16 },
        uRibbonOffsetX: { value: 0 },
        uSideAttach: { value: 0 },
        uSideSign: { value: 0 },
        uRing: { value: 0 },
        uRingAngle: { value: 0 },
        uRingSpan: { value: 0.6 },
        uRingRadius: { value: new THREE.Vector2(4.5, 2.45) },
        uRingFlow: { value: 0 },
        uRingFlowVelocity: { value: 0 },
        uClipEnabled: { value: 0 },
        uClipRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        uMobile: { value: 0 },
        uIsMedia: { value: 0 },
        uInward: { value: 0 },
        uAnimated: { value: 0 }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uMotion;
        uniform float uRipple;
        uniform float uHover;
        uniform float uCurve;
        uniform float uDetail;
        uniform float uProjectRing;
        uniform float uRibbonSurface;
        uniform float uRibbonRelative;
        uniform float uRibbonHeight;
        uniform float uRibbonSegmentWidth;
        uniform float uRibbonViewWidth;
        uniform float uRibbonOffsetX;
        uniform float uSideAttach;
        uniform float uSideSign;
        uniform float uRing;
        uniform float uRingAngle;
        uniform float uRingSpan;
        uniform vec2 uRingRadius;
        uniform float uRingFlow;
        uniform float uRingFlowVelocity;
        uniform vec2 uHoverPoint;
        uniform float uInward;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vRibbonShade;

        float ribbonDepthAt(float screenX) {
          // A fixed, asymmetric viewport-space field: the strip approaches
          // the camera around the first third and falls away around the
          // second third. Projects travel through this field while scrolling.
          float front = 2.80 * exp(-pow((screenX - 0.355) / 0.225, 2.0));
          float rear = 3.00 * exp(-pow((screenX - 0.700) / 0.220, 2.0));
          return front - rear - 0.040;
        }

        void main() {
          vUv = uv;
          vRibbonShade = 1.0;
          vec3 p = position;
          float verticalWaist = sin(uv.y * 3.14159265);
          p.x *= 1.0 - verticalWaist * uInward;
          vec2 hoverDelta = uv - uHoverPoint;
          float convex = exp(-dot(hoverDelta, hoverDelta) * 17.0) * uHover;
          float edge = pow(abs(uv.x - 0.5) * 2.0, 2.0);
          float movingWave = sin(uv.y * 13.0 + uTime * 1.7 + uv.x * 3.0)
            * uMotion * (0.025 + edge * 0.08);
          float water = sin((uv.x + uv.y) * 19.0 - uTime * 1.25)
            * 0.0045 * uRipple * smoothstep(0.015, 0.22, abs(uMotion));
          float ribbonMicroDepth = convex * 0.12 + movingWave + water;
          p.z += ribbonMicroDepth;
          p.z += edge * uCurve * 0.13;
          p.x += sin(uv.y * 4.0 - uTime * 0.5) * uMotion * 0.012;
          p.y += sin(uv.x * 7.0 + uTime * 0.6) * uDetail * uMotion * 0.018;
          // Project preview: the original subdivided image behaves like an
          // elastic membrane. Its centre is pushed to the inner rim while the
          // outer pixels remain at the outside edge of one thick ellipse.
          vec2 q = (uv - 0.5) * 2.0;
          float qLength = length(q);
          vec2 qDirection = qLength > 0.0001 ? q / qLength : vec2(1.0, 0.0);
          // max(abs(direction)) normalises every ray against the square
          // boundary, avoiding the clover/four-leaf outline produced by a
          // naive Euclidean radius on a rectangular card.
          float boundaryNormaliser = max(abs(qDirection.x), abs(qDirection.y));
          float qRadius = clamp(qLength * boundaryNormaliser, 0.0, 1.0);
          float ringProgress = smoothstep(0.035, 1.0, qRadius);
          float membraneRadiusX = mix(0.340, 0.505, ringProgress);
          float membraneRadiusY = mix(0.360, 0.465, ringProgress);
          float ringTheta = atan(q.y, q.x);
          // Scroll bends the same membrane instead of selecting a new slide.
          // The phase travels around the torus while a small radial pulse
          // makes its surface read as thick, refractive glass.
          float flowPhase = ringTheta * 3.0 - uRingFlow * 6.8 + uTime * 1.15;
          float liquidWave = sin(flowPhase) * 0.030
            + sin(flowPhase * 2.3 + qRadius * 7.0) * 0.012;
          float liquidDepth = cos(flowPhase * 1.35) * 0.095
            + sin(ringTheta * 5.0 - uRingFlow * 4.1) * 0.028;
          vec3 projectRingPosition = vec3(
            qDirection.x * (membraneRadiusX + liquidWave),
            qDirection.y * (membraneRadiusY + liquidWave * 0.82),
            sin(qRadius * 3.14159265) * 0.115
              + cos(ringTheta * 2.0) * 0.025
              + liquidDepth * sin(qRadius * 3.14159265)
              + uRingFlowVelocity * qDirection.x * 0.014
          );
          p = mix(p, projectRingPosition, uProjectRing);
          vec4 flatWorld = modelMatrix * vec4(p, 1.0);
          // Each card contributes one contiguous interval to the same strip.
          // The tiny 0.992 inset leaves only a hairline seam while preserving
          // a shared curve and tangent across project boundaries.
          float ribbonS = uRibbonRelative + position.x * 0.992;
          float ribbonX = uRibbonOffsetX + ribbonS * uRibbonSegmentWidth;
          float screenX = 0.5 + ribbonX / max(uRibbonViewWidth, 0.001);
          float ribbonDepth = ribbonDepthAt(screenX);
          float depthLeft = ribbonDepthAt(screenX - 0.004);
          float depthRight = ribbonDepthAt(screenX + 0.004);
          float depthSlope = (depthRight - depthLeft)
            / max(uRibbonViewWidth * 0.008, 0.001);
          float ribbonVertical = position.y * uRibbonHeight;
          float velocityFlex = uMotion
            * sin(screenX * 6.2831853 + position.y * 1.2)
            * (0.025 + abs(position.y) * 0.045);
          vec4 ribbonWorld = vec4(
            ribbonX,
            0.055 + ribbonVertical + velocityFlex,
            ribbonDepth + ribbonMicroDepth
              + uMotion * position.y * 0.085 * sin(screenX * 3.14159265),
            1.0
          );
          float depthLight = smoothstep(-3.05, 2.55, ribbonDepth);
          float facingShade = 1.0 - min(abs(depthSlope) * 0.055, 0.12);
          vRibbonShade = mix(
            1.0,
            clamp((0.70 + depthLight * 0.34) * facingShade, 0.62, 1.06),
            uRibbonSurface
          );
          flatWorld = mix(flatWorld, ribbonWorld, uRibbonSurface);

          // In preview mode the closest flat cards terminate on the ellipse
          // itself. Their inner columns are pulled onto the outer boundary;
          // the rest eases backward, making a smooth side-ribbon connection.
          float innerEdge = uSideSign > 0.0 ? (1.0 - uv.x) : uv.x;
          float attach = pow(clamp(innerEdge, 0.0, 1.0), 2.35) * uSideAttach;
          flatWorld.y += attach * (0.12 + (flatWorld.y - 0.045) * 0.07);
          float normalY = clamp((flatWorld.y - 0.12) / 3.255, -0.98, 0.98);
          // Slight overlap prevents a dark seam between the project wings and
          // the ring's outside edge while still preserving their curvature.
          float ellipseX = 4.02 * sqrt(max(0.0, 1.0 - normalY * normalY));
          flatWorld.x = mix(flatWorld.x, uSideSign * ellipseX, attach);
          flatWorld.z = mix(flatWorld.z, 0.035 + (1.0 - innerEdge) * -0.32, attach);
          float theta = uRingAngle + position.x * uRingSpan;
          float radial = position.y * 1.72;
          vec3 ringWorld = vec3(
            cos(theta) * (uRingRadius.x + radial),
            sin(theta) * (uRingRadius.y + radial * 0.72),
            -0.36 + cos(theta) * 0.22 + sin(position.x * 3.14159) * uMotion * 0.11
          );
          vec4 worldPosition = mix(flatWorld, vec4(ringWorld, 1.0), uRing);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uTexture;
        uniform sampler2D uLabel;
        uniform float uTime;
        uniform float uImageAspect;
        uniform float uPlaneAspect;
        uniform float uOpacity;
        uniform float uHover;
        uniform float uDetail;
        uniform float uMediaDetach;
        uniform float uMediaReveal;
        uniform float uProjectRing;
        uniform float uRingFlow;
        uniform float uRingFlowVelocity;
        uniform float uRibbonSurface;
        uniform float uSideAttach;
        uniform float uIsMedia;
        uniform float uMobile;
        uniform float uClipEnabled;
        uniform vec4 uClipRect;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vRibbonShade;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        vec2 coverUv(vec2 sourceUv, float planeAspect) {
          vec2 sampleUv = sourceUv;
          if (uImageAspect > planeAspect) {
            sampleUv.x = (sampleUv.x - 0.5) * (planeAspect / uImageAspect) + 0.5;
          } else {
            sampleUv.y = (sampleUv.y - 0.5) * (uImageAspect / planeAspect) + 0.5;
          }
          return clamp(sampleUv, 0.001, 0.999);
        }

        void main() {
          if (uClipEnabled > 0.5 && (
            vWorldPosition.x < uClipRect.x || vWorldPosition.y < uClipRect.y ||
            vWorldPosition.x > uClipRect.z || vWorldPosition.y > uClipRect.w
          )) discard;
          vec2 sourceUv = coverUv(vUv, uPlaneAspect);
          vec2 polar = vUv - 0.5;
          float theta = atan(polar.y, polar.x);
          float radial = length(polar);
          vec2 tangent = vec2(-polar.y, polar.x) / max(radial, 0.0001);
          float flowPhase = theta * 4.0 - uRingFlow * 7.2 + uTime * 1.2;
          float scrollShift = sin(uRingFlow * 0.85) * 0.075;
          float glassWave = sin(flowPhase) * 0.018
            + sin(flowPhase * 2.2 + radial * 18.0) * 0.009;
          vec2 liquidUv = sourceUv
            + tangent * (scrollShift + glassWave)
            + normalize(polar + vec2(0.0001))
              * sin(flowPhase * 1.4) * (0.008 + abs(uRingFlowVelocity) * 0.004);
          vec4 membraneImage = texture2D(uTexture, coverUv(liquidUv, uPlaneAspect));
          vec4 image = mix(
            texture2D(uTexture, sourceUv),
            membraneImage,
            uProjectRing
          );
          vec4 label = texture2D(uLabel, vUv);
          vec2 detailUv = vec2(clamp((vUv.x - 0.37) / 0.56, 0.0, 1.0), vUv.y);
          vec3 detailImage = texture2D(uTexture, coverUv(detailUv, uPlaneAspect * 0.56)).rgb;
          float imageStart = smoothstep(0.362, 0.378, vUv.x);
          float imageEnd = 1.0 - smoothstep(0.925, 0.938, vUv.x);
          float imageSide = imageStart * imageEnd;
          vec3 mediaWell = mix(detailImage, vec3(0.855, 0.852, 0.830), uMediaDetach);
          vec3 desktopDetail = mix(vec3(0.938, 0.935, 0.912), mediaWell, imageSide);

          vec2 mobileUv = vec2(vUv.x, clamp(vUv.y / 0.48, 0.0, 1.0));
          vec3 mobileImage = texture2D(uTexture, coverUv(mobileUv, uPlaneAspect / 0.48)).rgb;
          vec3 mobileWell = mix(mobileImage, vec3(0.855, 0.852, 0.830), uMediaDetach);
          float mobileImageSide = 1.0 - smoothstep(0.475, 0.49, vUv.y);
          vec3 mobileDetail = mix(vec3(0.938, 0.935, 0.912), mobileWell, mobileImageSide);
          vec3 detailColor = mix(desktopDetail, mobileDetail, uMobile);
          float distanceToEdge = roundedBoxSDF(vUv - 0.5, vec2(0.5), 0.037);
          float edgeAlpha = 1.0 - smoothstep(-0.006, 0.006, distanceToEdge);
          float sourceRadius = length((vUv - 0.5) * vec2(1.0, 1.08));
          float holeMask = smoothstep(0.045, 0.095, sourceRadius);
          float radialHighlight = exp(-pow((sourceRadius - 0.20) * 9.0, 2.0));
          image.rgb *= 1.0 + uProjectRing * radialHighlight * 0.16;
          image.rgb *= 1.0 - uProjectRing * smoothstep(0.39, 0.72, sourceRadius) * 0.13;
          edgeAlpha = mix(edgeAlpha, 1.0, uSideAttach * 0.98);
          edgeAlpha = mix(edgeAlpha, holeMask, uProjectRing);
          edgeAlpha = mix(edgeAlpha, 1.0, uIsMedia);
          float mediaWipe = 1.0 - smoothstep(uMediaReveal, uMediaReveal + 0.026, vUv.x);
          edgeAlpha *= mix(1.0, mediaWipe, uIsMedia);
          image.rgb = mix(image.rgb, detailColor, uDetail);
          image.rgb = mix(
            image.rgb,
            label.rgb,
            label.a * (1.0 - uDetail) * (1.0 - uIsMedia) * (1.0 - uProjectRing)
          );
          image.rgb *= vRibbonShade;
          image.rgb *= 1.0 + uHover * 0.045;
          float finalAlpha = image.a * edgeAlpha * uOpacity;
          if (finalAlpha < 0.003) discard;
          gl_FragColor = vec4(image.rgb, finalAlpha);
        }
      `
    });
  }

  async _loadTexture(source) {
    if (!source) return { texture: this.placeholderTexture, aspect: 1 };
    if (this.textureCache.has(source)) return this.textureCache.get(source);

    const pending = isVideoSource(source)
      ? this._loadVideoTexture(source)
      : this._loadImageTexture(source);
    this.textureCache.set(source, pending);
    return pending;
  }

  _loadImageTexture(source) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.crossOrigin = "anonymous";
      image.onload = () => {
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        if (isAnimatedImage(source)) this.animatedImageTextures.add(texture);
        this._markReady();
        resolve({
          texture,
          aspect: (image.naturalWidth || 1) / (image.naturalHeight || 1),
          animated: isAnimatedImage(source)
        });
      };
      image.onerror = () => resolve({ texture: this.placeholderTexture, aspect: 1, failed: true });
      image.src = source;
    });
  }

  _loadVideoTexture(source) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = source;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      const finish = () => {
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        this.videoElements.add(video);
        video.play().catch(() => {});
        this._markReady();
        resolve({
          texture,
          aspect: (video.videoWidth || 16) / (video.videoHeight || 9),
          animated: true,
          video
        });
      };
      video.addEventListener("loadedmetadata", finish, { once: true });
      video.addEventListener("error", () => resolve({ texture: this.placeholderTexture, aspect: 1, failed: true }), { once: true });
      video.load();
    });
  }

  _applyTexture(mesh, source) {
    mesh.userData.source = source;
    this._loadTexture(source).then((asset) => {
      if (this.destroyed || mesh.userData.source !== source) return;
      mesh.material.uniforms.uTexture.value = asset.texture;
      mesh.material.uniforms.uImageAspect.value = asset.aspect || 1;
      mesh.material.uniforms.uAnimated.value = asset.animated ? 1 : 0;
      mesh.material.needsUpdate = true;
    });
  }

  _makeLabelTexture(project) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    if (!context) return this.placeholderTexture;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const shade = context.createLinearGradient(0, 410, 0, 640);
    shade.addColorStop(0, "rgba(0, 0, 0, 0)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0.68)");
    context.fillStyle = shade;
    context.fillRect(0, 405, canvas.width, 235);
    context.fillStyle = "#ffffff";
    context.textBaseline = "alphabetic";
    context.font = "600 43px Arial, Helvetica, sans-serif";
    context.fillText(String(project?.title || "UNTITLED").toUpperCase(), 54, 540, 900);
    context.globalAlpha = 0.78;
    context.font = "500 18px Arial, Helvetica, sans-serif";
    const descriptor = [project?.course, project?.category, project?.year]
      .filter(Boolean)
      .join("  ·  ")
      .toUpperCase();
    context.fillText(descriptor, 56, 578, 900);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.labelTextures.add(texture);
    return texture;
  }

  _createCard(project, index) {
    const material = this._cardMaterial();
    material.uniforms.uLabel.value = this._makeLabelTexture(project);
    const mesh = new THREE.Mesh(this.cardGeometry, material);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x181817,
      transparent: true,
      opacity: 0,
      depthWrite: true,
      side: THREE.DoubleSide
    });
    const shell = new THREE.Mesh(this.cardShellGeometry, shellMaterial);
    shell.name = `Project card depth: ${project.id || index}`;
    shell.position.z = -0.045;
    shell.renderOrder = 8 + index;
    mesh.add(shell);
    mesh.name = `Project card: ${project.id || index}`;
    // Equal render order lets Three.js sort by the live camera distance;
    // depth testing then resolves intersections along the bent strip.
    mesh.renderOrder = 10;
    mesh.userData = {
      project,
      index,
      id: project.id,
      targetOpacity: 1,
      visibleInFilter: true,
      isDetailMedia: false,
      shell
    };
    mesh.scale.setScalar(0.001);
    this._applyTexture(mesh, projectImage(project));
    return mesh;
  }

  _disposeCard(mesh) {
    if (!mesh) return;
    mesh.parent?.remove(mesh);
    mesh.userData?.shell?.material?.dispose?.();
    const labelTexture = mesh.material?.uniforms?.uLabel?.value;
    if (labelTexture && labelTexture !== this.placeholderTexture && this.labelTextures.has(labelTexture)) {
      labelTexture.dispose();
      this.labelTextures.delete(labelTexture);
    }
    mesh.material?.dispose();
  }

  _markReady() {
    if (this.ready || this.destroyed) return;
    this.ready = true;
    try { this.callbacks.onReady(this); } catch (error) { console.error(error); }
    if (this.autoIntro) this.startIntro(this.introDelay);
  }

  startIntro(delay = 0) {
    this.introMix = this.reducedMotion ? 1 : 0;
    this.introStart = performance.now() + Math.max(0, delay);
    return this;
  }

  _bindEvents() {
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onResize = this.resize.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._onContextLost = this._onContextLost.bind(this);

    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("pointercancel", this._onPointerUp);
    this.canvas.addEventListener("pointerleave", this._onPointerLeave);
    this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    this.canvas.addEventListener("webglcontextlost", this._onContextLost);
    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("visibilitychange", this._onVisibility);
  }

  _onVisibility() {
    this.videoElements.forEach((video) => {
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    });
  }

  _onContextLost(event) {
    event.preventDefault();
    try {
      this.callbacks.onError(new Error("The WebGL context was lost. Reload the page to restart the gallery."));
    } catch (error) {
      console.error(error);
    }
  }

  _eventPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      nx: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      ny: -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1,
      u: (event.clientX - rect.left) / Math.max(rect.width, 1),
      v: 1 - (event.clientY - rect.top) / Math.max(rect.height, 1)
    };
  }

  _onPointerDown(event) {
    if (!this.enabled || event.button !== 0 || performance.now() < this.inputLockedUntil) return;
    const point = this._eventPosition(event);
    if (this._raycast(point.nx, point.ny)?.object) this._recordRipple(point.u, point.v);
    this.pointer.down = true;
    this.pointer.id = event.pointerId;
    this.pointer.x = this.pointer.lastX = this.pointer.startX = point.x;
    this.pointer.y = this.pointer.startY = point.y;
    this.pointer.lastTime = performance.now();
    this.pointer.moved = false;
    this.pointer.hit = this._raycast(point.nx, point.ny)?.object ?? null;
    this.canvas.setPointerCapture?.(event.pointerId);
    if (this.mode === "detail") this.beginDetailDrag();
    try { this.callbacks.onDragStart(this.mode); } catch (error) { console.error(error); }
  }

  _onPointerMove(event) {
    if (!this.enabled) return;
    const point = this._eventPosition(event);
    this.pointerNDC.set(point.nx, point.ny);
    this.postMaterial.uniforms.uPointer.value.set(point.u, point.v);
    const rippleHit = this._raycast(point.nx, point.ny);
    if (rippleHit?.object) this._recordRipple(point.u, point.v);

    if (!this.pointer.down || this.pointer.id !== event.pointerId) {
      this._updateHover(point.nx, point.ny, rippleHit);
      return;
    }

    const now = performance.now();
    const elapsed = Math.max(8, now - this.pointer.lastTime);
    const deltaX = point.x - this.pointer.lastX;
    const totalX = point.x - this.pointer.startX;
    const totalY = point.y - this.pointer.startY;
    const velocityPixels = deltaX / elapsed * 1000;
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.lastX = point.x;
    this.pointer.lastTime = now;
    this.pointer.moved ||= Math.hypot(totalX, totalY) > 6;

    if (this.mode === "detail") {
      this.dragDetail(deltaX, velocityPixels);
    } else {
      const width = Math.max(this.canvas.clientWidth, 1);
      const projectDelta = -deltaX / width * 4.5;
      this.positionTarget += projectDelta;
      this.position = damp(this.position, this.positionTarget, 32, elapsed / 1000);
      this.velocity = -velocityPixels / width * 4.5;
    }
    this.postMaterial.uniforms.uPointerEnergy.value = 1;
  }

  _onPointerUp(event) {
    if (!this.pointer.down || this.pointer.id !== event.pointerId) return;
    const point = this._eventPosition(event);
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.pointer.down = false;

    if (this.mode === "detail") {
      this.endDetailDrag(this.detailSwipeVelocity);
    } else if (this.mode === "ring") {
      // Ring browsing is phase-based rather than card-snapped. Release keeps
      // the inertial travel so the torus remains a single browsing surface.
      this.positionTarget = this.position + this.velocity * 0.18;
      if (!this.pointer.moved) {
        const hit = this._raycast(point.nx, point.ny)?.object;
        const activeId = this.visibleProjects[this._activeFromPosition()]?.id;
        if (this._isRingBand(point)) {
          // The ring is an object, not a close target.
        } else if (hit?.userData?.project?.id && hit.userData.project.id !== activeId) {
          this.goTo(hit.userData.project.id);
        } else {
          this.closeRing();
        }
      }
    } else if (this.mode === "about") {
      this._snapPosition(this.position + this.velocity * 0.18);
    } else {
      // The reference behaves like a freely travelling film strip: release
      // projects the current velocity forward, but does not snap every card.
      this.positionTarget = this.position + this.velocity * 0.18;
      if (!this.loop && this.visibleProjects.length) {
        this.positionTarget = clamp(this.positionTarget, 0, this.visibleProjects.length - 1);
      }
      if (!this.pointer.moved) {
        const hit = this._raycast(point.nx, point.ny)?.object;
        if (hit?.userData?.project) this._activateHit(hit);
      }
    }
    try { this.callbacks.onDragEnd(this.mode); } catch (error) { console.error(error); }
    this.pointer.hit = null;
  }

  _onPointerLeave() {
    if (!this.pointer.down) this._clearHover();
  }

  _onWheel(event) {
    if (!this.enabled) return;
    if (this.captureWheel) event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (this.mode === "detail") {
      this.scrollDetail(event.deltaY || delta);
      return;
    }

    const normalized = clamp(delta, -120, 120);
    this.positionTarget += normalized * 0.00325;
    this.velocity += normalized * 0.0016;
    this.postMaterial.uniforms.uPointerEnergy.value = clamp(
      this.postMaterial.uniforms.uPointerEnergy.value + Math.abs(normalized) / 180,
      0,
      1
    );
    window.clearTimeout(this.wheelSnapTimer);
    if (this.mode === "about") {
      this.wheelSnapTimer = window.setTimeout(() => this._snapPosition(this.positionTarget), 135);
    }
  }

  _raycast(nx = this.pointerNDC.x, ny = this.pointerNDC.y) {
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const candidates = this.mode === "detail"
      ? [this.cards[this.detailProjectIndex], ...this.detailMeshes].filter(Boolean)
      : [
          ...(this.previewMesh?.visible ? [this.previewMesh] : []),
          ...this.cards.filter((card) => card.visible && card.material.uniforms.uOpacity.value > 0.08)
        ];
    return this.raycaster.intersectObjects(candidates, false)[0] ?? null;
  }

  _updateHover(nx, ny, knownHit = null) {
    const hit = knownHit || this._raycast(nx, ny);
    const mesh = hit?.object?.userData?.project ? hit.object : null;
    if (mesh && hit.uv) {
      mesh.material.uniforms.uHoverPoint.value.copy(hit.uv);
      this.postMaterial.uniforms.uPointerEnergy.value = Math.max(
        this.postMaterial.uniforms.uPointerEnergy.value,
        0.32
      );
    }
    if (mesh !== this.hoveredCard) {
      this.hoveredCard = mesh;
      this.canvas.style.cursor = mesh ? "pointer" : this.pointer.down ? "grabbing" : "grab";
      try { this.callbacks.onHoverChange(mesh?.userData?.project ?? null); } catch (error) { console.error(error); }
    }
  }

  _recordRipple(u, v) {
    const next = new THREE.Vector2(u, v);
    if (next.distanceToSquared(this.lastRippleSample) < 0.00022) return;
    this.lastRippleSample.copy(next);
    const sample = this.rippleTrail[this.rippleTrailCursor];
    sample.set(u, v, 1);
    this.rippleTrailCursor = (this.rippleTrailCursor + 1) % this.rippleTrail.length;
    this.postMaterial.uniforms.uPointerEnergy.value = 1;
  }

  _isRingBand(point) {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    const pixelsPerWorld = height / Math.max(this.viewHeight, EPSILON);
    const centerX = width * 0.5;
    const centerY = height * 0.5 + 0.055 * pixelsPerWorld;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const outerX = 3.92 * pixelsPerWorld;
    const outerY = 3.18 * pixelsPerWorld;
    const innerX = 2.24 * pixelsPerWorld;
    const innerY = 2.08 * pixelsPerWorld;
    const outer = Math.hypot(dx / Math.max(outerX, 1), dy / Math.max(outerY, 1));
    const inner = Math.hypot(dx / Math.max(innerX, 1), dy / Math.max(innerY, 1));
    return outer <= 1.06 && inner >= 0.94;
  }

  _clearHover() {
    if (!this.hoveredCard) return;
    this.hoveredCard = null;
    this.canvas.style.cursor = this.pointer.down ? "grabbing" : "grab";
    try { this.callbacks.onHoverChange(null); } catch (error) { console.error(error); }
  }

  _activateHit(mesh) {
    const project = mesh.userData.project;
    if (this.mode === "ribbon") {
      // Let the app open the selected project immediately. openRing() records
      // this card's current on-screen X before changing the atlas position.
      try { this.callbacks.onSelect(project); } catch (error) { console.error(error); }
      return;
    }
    const visibleIndex = this.visibleProjects.findIndex((item) => item.id === project.id);
    const centered = visibleIndex === this.activeIndex && Math.abs(this._relativeIndex(visibleIndex)) < 0.25;
    if (!centered) {
      this.goTo(project.id);
      return;
    }
    try { this.callbacks.onSelect(project); } catch (error) { console.error(error); }
  }

  _relativeIndex(index) {
    const count = this.visibleProjects.length;
    if (!count) return 0;
    let relative = index - this.position;
    if (this.loop && count > 2) {
      relative = mod(relative + count / 2, count) - count / 2;
    }
    return relative;
  }

  _snapPosition(value = this.positionTarget) {
    const count = this.visibleProjects.length;
    if (!count) return;
    let target = Math.round(value);
    if (!this.loop) target = clamp(target, 0, count - 1);
    this.positionTarget = target;
  }

  _activeFromPosition() {
    const count = this.visibleProjects.length;
    if (!count) return -1;
    const rounded = Math.round(this.position);
    return this.loop ? mod(rounded, count) : clamp(rounded, 0, count - 1);
  }

  _ribbonMetrics() {
    const viewWidth = Math.max(this.viewWidth || 9, EPSILON);
    const mobile = this.canvas.clientWidth <= 760;
    return {
      viewWidth,
      // At the front depth this projects to roughly one third of the screen.
      offsetX: -viewWidth * 0.15,
      segmentWidth: mobile
        ? clamp(viewWidth * 0.72, 3.8, 5.0)
        : clamp(viewWidth * 0.37, 5.0, 6.4),
      height: mobile ? 3.42 : 3.72
    };
  }

  _ribbonDepthAtX(x) {
    const viewWidth = Math.max(this.viewWidth || 9, EPSILON);
    const screenX = 0.5 + x / viewWidth;
    const front = 2.80 * Math.exp(-Math.pow((screenX - 0.355) / 0.225, 2));
    const rear = 3.00 * Math.exp(-Math.pow((screenX - 0.700) / 0.220, 2));
    return front - rear - 0.040;
  }

  _ribbonLayout(index) {
    const relative = this._relativeIndex(index);
    const absolute = Math.abs(relative);
    const metrics = this._ribbonMetrics();
    const x = metrics.offsetX + relative * metrics.segmentWidth;
    const z = this._ribbonDepthAtX(x);
    const sample = Math.max(metrics.segmentWidth * 0.035, 0.08);
    const depthSlope = (
      this._ribbonDepthAtX(x + sample) - this._ribbonDepthAtX(x - sample)
    ) / (sample * 2);
    return {
      position: new THREE.Vector3(x, 0.055, z),
      rotation: new THREE.Euler(0, -Math.atan(depthSlope), 0),
      scale: new THREE.Vector3(
        metrics.segmentWidth * 0.992,
        metrics.height,
        1
      ),
      opacity: absolute > 4.8 ? 0 : clamp(1 - Math.max(0, absolute - 3.4) * 0.28, 0.06, 1),
      curve: 0
    };
  }

  _stairLayout(index) {
    const count = Math.max(this.visibleProjects.length, 1);
    const relative = index - (count - 1) * 0.5;
    const depth = Math.abs(relative);
    return {
      position: new THREE.Vector3(relative * 0.245, relative * 0.145, -depth * 0.055),
      rotation: new THREE.Euler(-0.11, -0.20, -0.055),
      scale: new THREE.Vector3(0.27, 0.18, 1),
      opacity: 0.74,
      curve: 0.08
    };
  }

  _ringLayout(index) {
    const count = Math.max(this.visibleProjects.length, 1);
    const relative = this._relativeIndex(index);
    const angle = -Math.PI * 0.5 + relative / count * TAU;
    return {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      opacity: 1,
      curve: 0.18,
      angle
    };
  }

  _projectRingLayout(index) {
    const relative = this._relativeIndex(index);
    const absolute = Math.abs(relative);
    const viewportScale = clamp(this.viewWidth / 13.2, 0.72, 1.05);
    const focus = 1 - THREE.MathUtils.smoothstep(absolute, 0.14, 0.84);
    const direction = Math.sign(relative);
    const sideX = direction * (7.0 + Math.max(0, absolute - 1) * 5.55) * viewportScale;
    const x = sideX * (1 - focus);
    const sideScale = Math.max(0.72, 1 - Math.max(0, absolute - 1) * 0.06);
    return {
      position: new THREE.Vector3(x, 0.12 - absolute * 0.075, -absolute * 0.62),
      rotation: new THREE.Euler(0, -Math.atan(relative * 0.27) * (1 - focus), relative * -0.008),
      scale: new THREE.Vector3(
        THREE.MathUtils.lerp(6.10 * viewportScale * sideScale, 8.05 * viewportScale, focus),
        THREE.MathUtils.lerp(3.72 * sideScale, 7.0, focus),
        1
      ),
      opacity: absolute > 2.15 ? 0 : clamp(1 - Math.max(0, absolute - 0.7) * 0.34, 0.16, 1),
      curve: clamp(THREE.MathUtils.lerp(0.12 + absolute * 0.10, 0.38, focus)
        + Math.abs(this.velocity) * 0.08, 0.12, 0.9),
      focus
    };
  }

  _detailViewportWorld() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const rect = this.detailRect
      ? {
          left: this.detailRect.left ?? canvasRect.left,
          top: this.detailRect.top ?? canvasRect.top,
          width: this.detailRect.width ?? canvasRect.width,
          height: this.detailRect.height ?? canvasRect.height
        }
      : {
          left: canvasRect.left + canvasRect.width * 0.365,
          top: canvasRect.top + canvasRect.height * 0.06,
          width: canvasRect.width * 0.60,
          height: canvasRect.height * 0.88
        };
    const localLeft = rect.left - canvasRect.left;
    const localTop = rect.top - canvasRect.top;
    const centerPxX = localLeft + rect.width * 0.5;
    const centerPxY = localTop + rect.height * 0.5;
    const centerX = (centerPxX / Math.max(canvasRect.width, 1) - 0.5) * this.viewWidth;
    const centerY = (0.5 - centerPxY / Math.max(canvasRect.height, 1)) * this.viewHeight;
    const width = rect.width / Math.max(canvasRect.width, 1) * this.viewWidth;
    const height = rect.height / Math.max(canvasRect.height, 1) * this.viewHeight;
    return { rect, canvasRect, localLeft, localTop, centerX, centerY, width, height };
  }

  _detailPanelWorld() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const compact = canvasRect.width <= 760;
    const widthPixels = compact ? canvasRect.width - 14 : Math.min(canvasRect.width * 0.94, 1600);
    const heightPixels = compact ? canvasRect.height - 14 : Math.min(canvasRect.height * 0.78, 900);
    const left = canvasRect.left + (canvasRect.width - widthPixels) * 0.5;
    const top = canvasRect.top + (canvasRect.height - heightPixels) * 0.5;
    const centerX = ((left - canvasRect.left + widthPixels * 0.5) / Math.max(canvasRect.width, 1) - 0.5) * this.viewWidth;
    const centerY = (0.5 - (top - canvasRect.top + heightPixels * 0.5) / Math.max(canvasRect.height, 1)) * this.viewHeight;
    return {
      rect: { left, top, width: widthPixels, height: heightPixels },
      centerX,
      centerY,
      width: widthPixels / Math.max(canvasRect.width, 1) * this.viewWidth,
      height: heightPixels / Math.max(canvasRect.height, 1) * this.viewHeight
    };
  }

  _detailPanelLayout(relativeProject = 0) {
    const panel = this._detailPanelWorld();
    const step = panel.width * 1.015;
    const x = panel.centerX + relativeProject * step + this.detailSwipe;
    return {
      // Side projects sit behind the white detail-paper. Their outer edges
      // remain visible beyond the panel, while the paper masks any overlap
      // instead of letting a neighbour cover the current project's content.
      position: new THREE.Vector3(
        x,
        panel.centerY,
        relativeProject === 0 ? 0.03 : -0.12
      ),
      rotation: new THREE.Euler(0, -relativeProject * 0.055 + this.detailSwipeVelocity * -0.000025, relativeProject * 0.006),
      scale: new THREE.Vector3(panel.width, panel.height, 1),
      opacity: Math.abs(relativeProject) <= 1 ? 1 : 0,
      curve: clamp(Math.abs(this.detailSwipeVelocity) / 1200 + Math.abs(relativeProject) * 0.08, 0, 0.8)
    };
  }

  _detailLayout(mediaIndex = 0) {
    const viewport = this._detailViewportWorld();
    const mediaAreaCenterX = viewport.centerX;
    const width = viewport.width;
    const height = Math.min(width / 1.36, viewport.height * 0.74);
    const step = height + viewport.height * 0.035;
    const offset = mediaIndex - this.detailScroll;
    return {
      position: new THREE.Vector3(
        mediaAreaCenterX + this.detailSwipe,
        viewport.centerY + viewport.height * 0.5 - height * 0.5 - offset * step,
        0.08 - Math.abs(offset) * 0.025
      ),
      rotation: new THREE.Euler(0, this.detailSwipe * -0.035, this.detailSwipeVelocity * -0.00003),
      scale: new THREE.Vector3(width, height, 1),
      opacity: clamp(1 - Math.max(0, Math.abs(offset) - 0.72) * 0.34, 0.12, 1),
      curve: clamp(Math.abs(this.detailSwipeVelocity) / 1100, 0, 0.8)
    };
  }

  _mixLayout(a, b, mix) {
    const position = a.position.clone().lerp(b.position, mix);
    const qa = new THREE.Quaternion().setFromEuler(a.rotation);
    const qb = new THREE.Quaternion().setFromEuler(b.rotation);
    const quaternion = qa.slerp(qb, mix);
    const scale = a.scale.clone().lerp(b.scale, mix);
    return {
      position,
      quaternion,
      scale,
      opacity: THREE.MathUtils.lerp(a.opacity, b.opacity, mix),
      curve: THREE.MathUtils.lerp(a.curve, b.curve, mix)
    };
  }

  _setPreviewProject(project) {
    if (!project || this.previewMesh.userData.project?.id === project.id) return;
    this.previewMesh.userData.project = project;
    this._applyTexture(this.previewMesh, projectImage(project));
    this._setRingTexture(project);
    const sourceCard = this.cards.find((card) => card.userData.id === project.id);
    if (sourceCard) {
      this.previewMesh.material.uniforms.uLabel.value = sourceCard.material.uniforms.uLabel.value;
    }
  }

  _setRingTexture(project) {
    const surfaces = this.ringRibbonMeshes || [];
    if (!project || !surfaces.length) return;
    const source = projectImage(project);
    this.ringTextureSignature = "";
    this._loadTexture(source).then((asset) => {
      surfaces.forEach((surface) => {
        if (this.destroyed) return;
        if (surface.material.uniforms.uImage) {
          surface.material.uniforms.uImage.value = asset.texture;
          surface.material.uniforms.uImageNext.value = asset.texture;
          surface.material.needsUpdate = true;
        }
      });
    });
  }

  _syncRingTextures(position = this.position) {
    const count = this.visibleProjects.length;
    if (!count || !this.ringRibbonMeshes?.length) return;
    const base = Math.floor(position);
    const blend = position - base;
    const fromProject = this.visibleProjects[mod(base, count)];
    const toProject = this.visibleProjects[mod(base + 1, count)];
    const signature = `${fromProject?.id || base}|${toProject?.id || base + 1}`;

    this.ringRibbonMeshes.forEach((surface) => {
      if (surface.material.uniforms.uBlend) {
        surface.material.uniforms.uBlend.value = blend;
      }
    });
    if (signature === this.ringTextureSignature) return;
    this.ringTextureSignature = signature;
    const fromCard = this.cards.find((card) => card.userData.id === fromProject?.id);
    const toCard = this.cards.find((card) => card.userData.id === toProject?.id);
    const fromTexture = fromCard?.material?.uniforms?.uTexture?.value;
    const toTexture = toCard?.material?.uniforms?.uTexture?.value;
    if (fromTexture && toTexture && fromTexture !== this.placeholderTexture && toTexture !== this.placeholderTexture) {
      this.ringRibbonMeshes.forEach((surface) => {
        const surfaceUniforms = surface.material.uniforms;
        if (!surfaceUniforms.uImage || !surfaceUniforms.uImageNext) return;
        surfaceUniforms.uImage.value = fromTexture;
        surfaceUniforms.uImageNext.value = toTexture;
      });
      return;
    }
    const requestedSignature = signature;
    Promise.all([
      this._loadTexture(projectImage(fromProject)),
      this._loadTexture(projectImage(toProject))
    ]).then(([fromAsset, toAsset]) => {
      if (this.destroyed || this.ringTextureSignature !== requestedSignature) return;
      this.ringRibbonMeshes.forEach((surface) => {
        const uniforms = surface.material.uniforms;
        if (!uniforms.uImage || !uniforms.uImageNext) return;
        uniforms.uImage.value = fromAsset.texture;
        uniforms.uImageNext.value = toAsset.texture;
        surface.material.needsUpdate = true;
      });
    });
  }

  _updatePreviewMesh(delta) {
    // About still uses its flat preview. Ring mode is rendered exclusively by
    // the continuous ribbon below, preventing the old floating-card overlay.
    const preview = this.aboutMix;
    const visibleMix = preview * (1 - this.detailMix);
    const viewportScale = clamp(this.viewWidth / 13.2, 0.72, 1.05);
    const ribbonMetrics = this._ribbonMetrics();
    const ribbonOffsetX = ribbonMetrics.offsetX;
    const ringScale = new THREE.Vector3(8.05 * viewportScale, 7.0, 1);
    const flatScale = new THREE.Vector3(
      ribbonMetrics.segmentWidth * 0.992,
      ribbonMetrics.height,
      1
    );
    const targetScale = flatScale.lerp(ringScale, preview);
    this.previewMesh.position.lerp(
      new THREE.Vector3(THREE.MathUtils.lerp(ribbonOffsetX, 0, preview), 0.12, 0.055),
      1 - Math.exp(-13 * delta)
    );
    this.previewMesh.scale.lerp(targetScale, 1 - Math.exp(-13 * delta));
    const uniforms = this.previewMesh.material.uniforms;
    uniforms.uOpacity.value = damp(uniforms.uOpacity.value, visibleMix, 11, delta);
    uniforms.uHover.value = damp(
      uniforms.uHover.value,
      this.previewMesh === this.hoveredCard ? 1 : 0,
      12,
      delta
    );
    uniforms.uProjectRing.value = damp(uniforms.uProjectRing.value, visibleMix, 7.2, delta);
    uniforms.uRibbonSurface.value = damp(
      uniforms.uRibbonSurface.value,
      this.introMix * (1 - preview) * (1 - this.detailMix),
      9,
      delta
    );
    uniforms.uRibbonRelative.value = 0;
    uniforms.uRibbonHeight.value = ribbonMetrics.height;
    uniforms.uRibbonSegmentWidth.value = ribbonMetrics.segmentWidth;
    uniforms.uRibbonViewWidth.value = ribbonMetrics.viewWidth;
    uniforms.uRibbonOffsetX.value = ribbonOffsetX;
    uniforms.uSideAttach.value = 0;
    uniforms.uDetail.value = 0;
    uniforms.uMediaDetach.value = 0;
    uniforms.uMediaReveal.value = 1;
    uniforms.uRing.value = 0;
    uniforms.uRingFlow.value = damp(
      uniforms.uRingFlow.value,
      this.mode === "ring" ? this.position - this.ringAnchorPosition : 0,
      14,
      delta
    );
    uniforms.uRingFlowVelocity.value = damp(
      uniforms.uRingFlowVelocity.value,
      this.mode === "ring" ? this.velocity : 0,
      10,
      delta
    );
    uniforms.uPlaneAspect.value = Math.max(
      this.previewMesh.scale.x / Math.max(this.previewMesh.scale.y, EPSILON),
      EPSILON
    );
    this.previewMesh.visible = uniforms.uOpacity.value > 0.003;
  }

  _updateContinuumRibbon(delta) {
    if (!this.continuumMesh) return;
    const material = this.continuumMesh.material;
    const uniforms = material.uniforms;
    const metrics = this._ribbonMetrics();
    const ringVisible = (this.useContinuumTransition ? 1 : 0) * (1 - this.detailMix);
    const focusMix = THREE.MathUtils.smoothstep(this.ringMix, 0, 0.32);
    const shapeMix = THREE.MathUtils.smoothstep(this.ringMix, 0.16, 0.86);
    // Ring mode is not assembled from an annulus, wings, and neighbouring
    // cards. It is the existing gallery itself, with only a local area around
    // the viewport centre displaced away from a circular aperture.
    uniforms.uPosition.value = damp(uniforms.uPosition.value, this.position, 18, delta);
    uniforms.uSegmentWidth.value = THREE.MathUtils.lerp(
      metrics.segmentWidth,
      metrics.segmentWidth * 1.48,
      focusMix
    );
    uniforms.uViewWidth.value = metrics.viewWidth;
    uniforms.uHeight.value = metrics.height;
    uniforms.uRing.value = shapeMix;
    // Begin at the selected card's real screen position. This makes a card
    // clicked on either side travel straight to the centre as the aperture
    // opens, instead of detouring through the normal left-hand focal point.
    uniforms.uTransitionOffsetX.value = this.ringEntryOffsetX * (1 - focusMix);
    uniforms.uOpacity.value = damp(uniforms.uOpacity.value, ringVisible, 11, delta);
    this.continuumMesh.visible = uniforms.uOpacity.value > 0.003;

    // The former three-piece ring is kept allocated only to avoid rebuilding
    // scene resources during transitions, but it never contributes pixels.
    this.ringRibbonMeshes.forEach((mesh) => {
      const surfaceUniforms = mesh.material.uniforms;
      surfaceUniforms.uOpacity.value = damp(
        surfaceUniforms.uOpacity.value,
        0,
        14,
        delta
      );
      mesh.visible = surfaceUniforms.uOpacity.value > 0.003;
    });
  }

  _updateCardTransforms(delta) {
    const intro = this.introMix;
    const ribbonMetrics = this._ribbonMetrics();
    this.cards.forEach((card, index) => {
      const layoutIndex = Number.isFinite(card.userData.filteredIndex)
        ? card.userData.filteredIndex
        : index;
      const ribbon = this._ribbonLayout(layoutIndex);
      const stair = this._stairLayout(layoutIndex);
      let layout = this._mixLayout(stair, ribbon, intro);
      let projectRingFocus = 0;
      const ringRelative = this._relativeIndex(layoutIndex);
      // During a ring transition cards gently give way to the one-piece
      // ribbon. They do not become a separate set of ring-side slides.
      const previewMix = this.aboutMix;

      if (previewMix > EPSILON) {
        const projectRing = this._projectRingLayout(layoutIndex);
        projectRingFocus = projectRing.focus;
        layout = this._mixLayout(
          { ...layout, rotation: new THREE.Euler().setFromQuaternion(layout.quaternion) },
          projectRing,
          previewMix
        );
      }

      if (this.ringMix > EPSILON) {
        // Keep the fading card ribbon registered with the incoming continuous
        // surface. This removes the apparent leftward detour before opening.
        layout.position.x -= ribbonMetrics.offsetX * this.ringMix;
        layout.position.z = THREE.MathUtils.lerp(layout.position.z, 0.08, this.ringMix);
        layout.scale.x *= THREE.MathUtils.lerp(1, 1.48, this.ringMix);
      }

      const ringAngle = -Math.PI * 0.5 + ringRelative / Math.max(this.visibleProjects.length, 1) * TAU;
      card.material.uniforms.uRing.value = damp(card.material.uniforms.uRing.value, 0, 8, delta);
      card.material.uniforms.uProjectRing.value = damp(
        card.material.uniforms.uProjectRing.value,
        0,
        7.2,
        delta
      );
      card.material.uniforms.uRibbonSurface.value = damp(
        card.material.uniforms.uRibbonSurface.value,
        intro * (1 - previewMix) * (1 - this.detailMix),
        9,
        delta
      );
      card.material.uniforms.uRibbonRelative.value = this._relativeIndex(layoutIndex);
      card.material.uniforms.uRibbonHeight.value = ribbonMetrics.height;
      card.material.uniforms.uRibbonSegmentWidth.value = ribbonMetrics.segmentWidth;
      card.material.uniforms.uRibbonViewWidth.value = ribbonMetrics.viewWidth;
      card.material.uniforms.uRibbonOffsetX.value = ribbonMetrics.offsetX;
      const neighborAttach = Math.exp(-Math.pow(Math.abs(ringRelative) - 1, 2) * 11)
        * previewMix * (1 - this.detailMix);
      card.material.uniforms.uSideAttach.value = damp(
        card.material.uniforms.uSideAttach.value,
        neighborAttach,
        10,
        delta
      );
      card.material.uniforms.uSideSign.value = Math.sign(ringRelative);
      card.material.uniforms.uRingAngle.value = ringAngle;
      card.material.uniforms.uRingSpan.value = TAU / Math.max(this.visibleProjects.length, 1) * 1.035;
      card.material.uniforms.uRingRadius.value.set(
        Math.min(this.viewWidth * 0.32, 4.62),
        Math.min(this.viewHeight * 0.275, 2.52)
      );

      const isSelected = index === this.detailProjectIndex;
      const detailVisibleIndex = this.detailProject
        ? this.visibleProjects.findIndex((project) => project.id === this.detailProject.id)
        : -1;
      const cardVisibleIndex = this.visibleProjects.findIndex((project) => project.id === card.userData.id);
      let detailRelative = cardVisibleIndex - detailVisibleIndex;
      if (this.loop && this.visibleProjects.length > 2 && detailVisibleIndex >= 0 && cardVisibleIndex >= 0) {
        detailRelative = mod(
          detailRelative + this.visibleProjects.length / 2,
          this.visibleProjects.length
        ) - this.visibleProjects.length / 2;
      }
      const isDetailNeighbor = detailVisibleIndex >= 0 && cardVisibleIndex >= 0 && Math.abs(detailRelative) <= 1;
      if (this.detailMix > EPSILON) {
        if (isDetailNeighbor) {
          const detail = this._detailPanelLayout(detailRelative);
          layout = this._mixLayout(
            { ...layout, rotation: new THREE.Euler().setFromQuaternion(layout.quaternion) },
            detail,
            this.detailMix
          );
        } else {
          layout.opacity *= 1 - this.detailMix;
          layout.scale.multiplyScalar(1 - this.detailMix * 0.1);
        }
      }

      const activePreviewFade = 1 - previewMix * projectRingFocus * (1 - this.detailMix);
      const continuumFade = (this.useContinuumTransition ? 0 : 1) * (1 - this.detailMix);
      // Keep the immediate neighbours as blank paper shells. Their contents
      // stay concealed until the physical card has arrived at centre.
      const detailSideOpacity = isDetailNeighbor && !isSelected
        ? layout.opacity * this.detailMix
        : 0;
      const ribbonOpacity = card.userData.visibleInFilter
        ? layout.opacity * activePreviewFade * continuumFade
        : 0;
      const targetOpacity = this.detailMix > EPSILON ? detailSideOpacity : ribbonOpacity;
      const responsiveness = this.pointer.down ? 24 : 13;
      card.position.lerp(layout.position, 1 - Math.exp(-responsiveness * delta));
      card.quaternion.slerp(layout.quaternion, 1 - Math.exp(-responsiveness * delta));
      card.scale.lerp(layout.scale, 1 - Math.exp(-responsiveness * delta));
      const detailCarouselIsClean = this.mode === "detail" && this.detailMix > 0.9;
      card.material.uniforms.uOpacity.value = detailCarouselIsClean
        ? targetOpacity
        : damp(card.material.uniforms.uOpacity.value, targetOpacity, 10, delta);
      const depthWrite = this.detailMix > 0.03 || this.ringMix < 0.03;
      if (card.material.depthWrite !== depthWrite) {
        card.material.depthWrite = depthWrite;
        card.material.needsUpdate = true;
      }
      card.material.uniforms.uCurve.value = damp(card.material.uniforms.uCurve.value, layout.curve, 11, delta);
      const detailInward = isDetailNeighbor
        ? clamp(Math.abs(this.detailScrollVelocity) * 0.028, 0, 0.022) * this.detailMix
        : 0;
      card.material.uniforms.uInward.value = damp(
        card.material.uniforms.uInward.value,
        detailInward,
        9,
        delta
      );
      const isDetailSideShell = isDetailNeighbor && !isSelected;
      const detailSurfaceTarget = isDetailSideShell ? this.detailMix : 0;
      card.material.uniforms.uDetail.value = detailCarouselIsClean
        ? (isDetailSideShell ? 1 : 0)
        : damp(card.material.uniforms.uDetail.value, detailSurfaceTarget, 10, delta);
      const detachTarget = isDetailSideShell ? this.detailMix : 0;
      card.material.uniforms.uMediaDetach.value = detailCarouselIsClean
        ? (isDetailSideShell ? 1 : 0)
        : damp(card.material.uniforms.uMediaDetach.value, detachTarget, 12, delta);
      const desiredHover = card === this.hoveredCard ? 1 : 0;
      card.material.uniforms.uHover.value = damp(card.material.uniforms.uHover.value, desiredHover, 12, delta);
      card.material.uniforms.uPlaneAspect.value = Math.max(card.scale.x / Math.max(card.scale.y, EPSILON), EPSILON);
      card.material.uniforms.uMobile.value = this.canvas.clientWidth <= 760 ? 1 : 0;
      const shell = card.userData.shell;
      if (shell) {
        const shellTarget = 0;
        shell.material.opacity = damp(shell.material.opacity, shellTarget, 10, delta);
        shell.visible = shell.material.opacity > 0.003;
      }
      card.visible = card.material.uniforms.uOpacity.value > 0.003;
    });
  }

  _updateDetailMedia(delta) {
    const viewport = this._detailViewportWorld();
    const clipLeft = viewport.centerX - viewport.width * 0.5;
    const clipBottom = viewport.centerY - viewport.height * 0.5;
    const clipRight = viewport.centerX + viewport.width * 0.5;
    const clipTop = viewport.centerY + viewport.height * 0.5;
    const mediaDetach = clamp((this.detailMix - 0.72) / 0.28, 0, 1);
    if (this.reducedMotion) {
      this.detailMediaReveal = 1;
    } else if (this.detailMediaReveal < 1 && this.detailMix > 0.72) {
      const now = performance.now();
      if (!this.detailMediaRevealStart) this.detailMediaRevealStart = now;
      const revealProgress = clamp((now - this.detailMediaRevealStart) / 460, 0, 1);
      this.detailMediaReveal = 1 - Math.pow(1 - revealProgress, 4);
    }
    this.detailMeshes.forEach((mesh, detailIndex) => {
      const layout = this._detailLayout(detailIndex);
      mesh.position.lerp(layout.position, 1 - Math.exp(-13 * delta));
      const targetQuaternion = new THREE.Quaternion().setFromEuler(layout.rotation);
      mesh.quaternion.slerp(targetQuaternion, 1 - Math.exp(-13 * delta));
      mesh.scale.lerp(layout.scale, 1 - Math.exp(-13 * delta));
      mesh.material.uniforms.uOpacity.value = damp(
        mesh.material.uniforms.uOpacity.value,
        layout.opacity * mediaDetach,
        11,
        delta
      );
      mesh.material.uniforms.uCurve.value = damp(mesh.material.uniforms.uCurve.value, layout.curve, 10, delta);
      mesh.material.uniforms.uInward.value = damp(
        mesh.material.uniforms.uInward.value,
        clamp(Math.abs(this.detailScrollVelocity) * 0.09, 0, 0.075),
        10,
        delta
      );
      mesh.material.uniforms.uDetail.value = 0;
      mesh.material.uniforms.uMediaDetach.value = 0;
      mesh.material.uniforms.uMediaReveal.value = this.detailMediaReveal;
      mesh.material.uniforms.uProjectRing.value = 0;
      mesh.material.uniforms.uRing.value = 0;
      mesh.material.uniforms.uClipEnabled.value = 1;
      mesh.material.uniforms.uClipRect.value.set(clipLeft, clipBottom, clipRight, clipTop);
      mesh.material.uniforms.uPlaneAspect.value = Math.max(mesh.scale.x / Math.max(mesh.scale.y, EPSILON), EPSILON);
      mesh.material.uniforms.uMobile.value = this.canvas.clientWidth <= 760 ? 1 : 0;
      mesh.material.uniforms.uIsMedia.value = 1;
      mesh.visible = mesh.material.uniforms.uOpacity.value > 0.003;
    });

    const panel = this._detailPanelWorld();
    this.detailPaper.position.set(panel.centerX + this.detailSwipe, panel.centerY, -0.03);
    this.detailPaper.scale.set(panel.width, panel.height, 1);
    this.detailPaper.material.uniforms.uOpacity.value = damp(
      this.detailPaper.material.uniforms.uOpacity.value,
      this.detailMix,
      12,
      delta
    );
    this.detailPaper.material.uniforms.uRadius.value = clamp(0.12 / Math.max(panel.width, 1), 0.018, 0.07);
    this.detailPaper.material.uniforms.uInward.value = damp(
      this.detailPaper.material.uniforms.uInward.value,
      clamp(Math.abs(this.detailScrollVelocity) * 0.026, 0, 0.022),
      9,
      delta
    );
    this.blackHole.material.uniforms.uOpacity.value = damp(
      this.blackHole.material.uniforms.uOpacity.value,
      this.aboutMix * 0.14,
      10,
      delta
    );
  }

  _updatePhysics(delta, now) {
    if (now >= this.introStart && this.introMix < 1) {
      const progress = clamp((now - this.introStart) / Math.max(this.introDuration, 1), 0, 1);
      // Quintic smoothstep: tiny stair holds briefly, then unfolds without a seam.
      this.introMix = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    }

    if (!this.pointer.down && this.mode !== "detail") {
      const acceleration = (this.positionTarget - this.position) * 48;
      this.velocity += acceleration * delta;
      this.velocity *= Math.exp(-9.2 * delta);
      this.position += this.velocity * delta;
      if (!this.loop && this.visibleProjects.length) {
        this.position = clamp(this.position, -0.2, this.visibleProjects.length - 0.8);
        this.positionTarget = clamp(this.positionTarget, 0, this.visibleProjects.length - 1);
      }
      if (
        Math.abs(this.positionTarget - this.position) < 0.0001
        && Math.abs(this.velocity) < 0.0001
      ) {
        this.position = this.positionTarget;
        this.velocity = 0;
      }
    }

    this.aboutMix = damp(this.aboutMix, this.aboutTarget, this.reducedMotion ? 1000 : 4.9, delta);
    this.ringMix = damp(this.ringMix, this.ringTarget, this.reducedMotion ? 1000 : 5.6, delta);
    this.detailMix = damp(this.detailMix, this.detailTarget, this.reducedMotion ? 1000 : 5.4, delta);

    this.rippleTrail.forEach((sample) => {
      sample.z = Math.max(0, sample.z - delta * 1.43);
    });

    const detailMax = Math.max(0, this.detailMeshes.length - 1);
    if (this.mode === "detail" && detailMax > 0) {
      // A damped spring integrates real velocity so wheel/touch input keeps
      // travelling briefly after release, then settles without a hard snap.
      const scrollAcceleration = (this.detailScrollTarget - this.detailScroll) * 46;
      this.detailScrollVelocity += scrollAcceleration * delta;
      this.detailScrollVelocity *= Math.exp(-6.2 * delta);
      this.detailScroll += this.detailScrollVelocity * delta;

      const bounded = clamp(this.detailScroll, 0, detailMax);
      if (bounded !== this.detailScroll) {
        this.detailScrollVelocity += (bounded - this.detailScroll) * 58 * delta;
        this.detailScroll = clamp(this.detailScroll, -0.16, detailMax + 0.16);
      }
      if (
        Math.abs(this.detailScrollTarget - this.detailScroll) < 0.0008
        && Math.abs(this.detailScrollVelocity) < 0.003
      ) {
        this.detailScroll = this.detailScrollTarget;
        this.detailScrollVelocity = 0;
      }
    } else {
      this.detailScroll = damp(this.detailScroll, this.detailScrollTarget, 12, delta);
      this.detailScrollVelocity = damp(this.detailScrollVelocity, 0, 10, delta);
    }

    if (!this.detailDragging) {
      const swipeAcceleration = (this.detailSwipeTarget - this.detailSwipe) * 58;
      this.detailSwipeVelocity += swipeAcceleration * delta;
      this.detailSwipeVelocity *= Math.exp(-10 * delta);
      this.detailSwipe += this.detailSwipeVelocity * delta;
    }

    const combinedMotion = clamp(
      this.velocity * 0.24 + this.detailScrollVelocity * 0.16 + this.detailSwipeVelocity * 0.0012,
      -1,
      1
    );
    this.sharedUniforms.motion.value = damp(this.sharedUniforms.motion.value, combinedMotion, 7, delta);
    if (Math.abs(this.sharedUniforms.motion.value) < 0.0008) {
      this.sharedUniforms.motion.value = 0;
    }
    this.postMaterial.uniforms.uPointerEnergy.value = damp(
      this.postMaterial.uniforms.uPointerEnergy.value,
      this.pointer.down ? 0.62 : 0,
      2.7,
      delta
    );

    const nextActive = this._activeFromPosition();
    const ringCommitReady = this.mode !== "ring" || (
      Math.abs(this.positionTarget - this.position) < 0.035 &&
      Math.abs(this.velocity) < 0.035
    );
    if (ringCommitReady && nextActive !== this.lastActiveIndex && nextActive >= 0) {
      this.activeIndex = nextActive;
      this.lastActiveIndex = nextActive;
      const activeProject = this.visibleProjects[nextActive];
      if (this.mode === "about") this._setPreviewProject(activeProject);
      if (this.mode === "ring") {
        // Ring imagery is already transitioning spatially around the circle;
        // only the textual/project state commits here after inertia settles.
      }
      try { this.callbacks.onActiveChange(activeProject, nextActive, this.visibleProjects.length); } catch (error) { console.error(error); }
      if (this.mode === "ring") {
        this.ringProject = activeProject;
        try { this.callbacks.onRingChange(activeProject, nextActive, this.visibleProjects.length); } catch (error) { console.error(error); }
      }
    }

    const nextMedia = clamp(Math.round(this.detailScroll), 0, Math.max(0, this.detailMeshes.length - 1));
    if (nextMedia !== this.detailMediaIndex) {
      this.detailMediaIndex = nextMedia;
      try {
        this.callbacks.onDetailMediaChange({
          project: this.detailProject,
          index: nextMedia,
          total: this.detailMeshes.length,
          alt: projectImageAlt(this.detailProject, nextMedia),
          caption: projectImageAlt(this.detailProject, nextMedia),
          progress: this.detailMeshes.length > 1 ? nextMedia / (this.detailMeshes.length - 1) : 0
        });
      } catch (error) { console.error(error); }
    }

    this._resolveTransitions();
  }

  _render() {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.postScene, this.postCamera);
  }

  _tick(time) {
    if (this.destroyed) return;
    const delta = clamp((time - this.lastFrameTime) / 1000, 0.001, 0.05);
    this.lastFrameTime = time;
    this.sharedUniforms.time.value += delta;

    // GIF and APNG textures need an upload each frame. VideoTexture updates
    // itself from requestVideoFrameCallback/currentTime and never uses scroll.
    this.animatedImageTextures.forEach((texture) => { texture.needsUpdate = true; });

    this._updatePhysics(delta, time);
    this._updateCardTransforms(delta);
    this._updatePreviewMesh(delta);
    this._updateContinuumRibbon(delta);
    this._updateDetailMedia(delta);
    this._render();
    this.animationFrame = requestAnimationFrame(this._tick);
  }

  _waitForTransition(kind, target, timeout = this.transitionDuration + 500) {
    if (this.reducedMotion) return nextFrame().then(() => this);
    return new Promise((resolve) => {
      const waiter = {
        kind,
        target,
        resolve,
        deadline: performance.now() + timeout
      };
      this._transitionWaiters.push(waiter);
    });
  }

  _resolveTransitions() {
    if (!this._transitionWaiters.length) return;
    const now = performance.now();
    this._transitionWaiters = this._transitionWaiters.filter((waiter) => {
      const current = waiter.kind === "detail"
        ? this.detailMix
        : waiter.kind === "ring"
          ? this.ringMix
          : this.aboutMix;
      if (Math.abs(current - waiter.target) < 0.014 || now >= waiter.deadline) {
        waiter.resolve(this);
        return false;
      }
      return true;
    });
  }

  setProjects(projects = [], preferredId = null) {
    this.projects = [...projects];
    this.visibleProjects = [...projects];
    this.cards.forEach((card) => this._disposeCard(card));
    this.cards = this.projects.map((project, index) => {
      const card = this._createCard(project, index);
      card.userData.filteredIndex = index;
      this.cardGroup.add(card);
      return card;
    });
    const preferred = preferredId
      ? this.visibleProjects.findIndex((project) => project.id === preferredId)
      : 0;
    this.position = this.positionTarget = Math.max(0, preferred);
    this.previewMesh.userData.project = null;
    this._setPreviewProject(this.visibleProjects[Math.max(0, preferred)] || this.visibleProjects[0]);
    this._rebuildRibbonAtlas();
    this.lastActiveIndex = -1;
    this._clearDetailMedia();
    return this;
  }

  setFilter(filter, preferredId = null) {
    if (typeof filter === "function") {
      this.visibleProjects = this.projects.filter(filter);
    } else if (Array.isArray(filter) || filter instanceof Set) {
      const ids = new Set(filter);
      this.visibleProjects = this.projects.filter((project) => ids.has(project.id));
    } else if (!filter || filter === "all") {
      this.visibleProjects = [...this.projects];
    } else {
      this.visibleProjects = this.projects.filter((project) =>
        project.course === filter || project.category === filter
      );
    }

    const visibleIds = new Set(this.visibleProjects.map((project) => project.id));
    this.cards.forEach((card) => {
      card.userData.visibleInFilter = visibleIds.has(card.userData.id);
    });

    // Reorder card indices so all layout math uses the filtered sequence.
    const cardById = new Map(this.cards.map((card) => [card.userData.id, card]));
    this.visibleProjects.forEach((project, index) => {
      const card = cardById.get(project.id);
      if (card) card.userData.filteredIndex = index;
    });

    const preferredIndex = preferredId
      ? this.visibleProjects.findIndex((project) => project.id === preferredId)
      : 0;
    this.position = this.positionTarget = Math.max(0, preferredIndex);
    this.velocity = 0;
    this._rebuildRibbonAtlas();
    this.lastActiveIndex = -1;
    return this;
  }

  // Alias used by app integrations that think of a filter as a project reset.
  resetProjects(projects = this.projects, preferredId = null) {
    return this.setProjects(projects, preferredId);
  }

  setMode(mode) {
    const aliases = { work: "ribbon", info: "about" };
    const normalizedMode = aliases[mode] || mode;
    if (!["ribbon", "ring", "about", "detail"].includes(normalizedMode)) {
      throw new RangeError(`Unknown Gallery3D mode: ${mode}`);
    }
    const previousMode = this.mode;
    this.mode = normalizedMode;
    if (normalizedMode === "about") {
      this.aboutTarget = 1;
      this.ringTarget = 0;
      this.detailTarget = 0;
    } else if (normalizedMode === "ring") {
      this.aboutTarget = 0;
      this.ringTarget = 1;
      this.detailTarget = 0;
    } else if (normalizedMode === "detail") {
      this.aboutTarget = 0;
      // A project opened from the preview keeps the ring as its source
      // geometry until the large card has covered it.
      this.ringTarget = previousMode === "ring" || this.modeBeforeDetail === "ring" ? 1 : 0;
      this.detailTarget = 1;
    } else {
      this.aboutTarget = 0;
      this.ringTarget = 0;
      this.detailTarget = 0;
    }
    if (normalizedMode === "about") {
      this._setPreviewProject(this.visibleProjects[this._activeFromPosition()]);
    }
    this._clearHover();
    return this;
  }

  showAbout(show = true) {
    this.setMode(show ? "about" : "ribbon");
    return this._waitForTransition("about", show ? 1 : 0);
  }

  async openRing(id = this.activeProject?.id) {
    const visibleIndex = this.visibleProjects.findIndex((project) => project.id === id);
    const metrics = this._ribbonMetrics();
    // Capture the card's actual position before goTo() recentres the atlas.
    // _ribbonLayout() uses this same equation, so the continuum begins exactly
    // where the clicked card was rendered on the preceding frame.
    this.ringEntryOffsetX = visibleIndex >= 0
      ? metrics.offsetX + this._relativeIndex(visibleIndex) * metrics.segmentWidth
      : metrics.offsetX;
    if (id) this.goTo(id, { immediate: true });
    this.ringProject = visibleIndex >= 0
      ? this.visibleProjects[visibleIndex]
      : this.visibleProjects[this._activeFromPosition()] || null;
    this.ringAnchorPosition = this.position;
    this._setPreviewProject(this.ringProject);
    this.useContinuumTransition = true;
    if (this.continuumMesh) {
      const uniforms = this.continuumMesh.material.uniforms;
      uniforms.uPosition.value = this.position;
      uniforms.uSegmentWidth.value = metrics.segmentWidth;
      uniforms.uViewWidth.value = metrics.viewWidth;
      uniforms.uHeight.value = metrics.height;
      uniforms.uRing.value = 0;
      uniforms.uTransitionOffsetX.value = this.ringEntryOffsetX;
      uniforms.uOpacity.value = 1;
      this.continuumMesh.visible = true;
    }
    this.cards.forEach((card) => {
      card.material.uniforms.uOpacity.value = 0;
      card.material.depthWrite = false;
      card.visible = false;
    });
    this.setMode("ring");
    this.inputLockedUntil = performance.now() + (this.reducedMotion ? 80 : 680);
    if (this.ringProject) {
      try {
        this.callbacks.onRingChange(
          this.ringProject,
          visibleIndex >= 0 ? visibleIndex : this._activeFromPosition(),
          this.visibleProjects.length
        );
      } catch (error) { console.error(error); }
    }
    return this._waitForTransition("ring", 1);
  }

  async closeRing() {
    // Closing returns to the work ribbon's conventional focus position.
    this.ringEntryOffsetX = this._ribbonMetrics().offsetX;
    this.mode = "ribbon";
    this.inputLockedUntil = performance.now() + (this.reducedMotion ? 80 : 900);
    this.aboutTarget = 0;
    this.ringTarget = 0;
    this.detailTarget = 0;
    try { this.callbacks.onRingClose(); } catch (error) { console.error(error); }
    const result = await this._waitForTransition("ring", 0);
    this.useContinuumTransition = false;
    this.cards.forEach((card, index) => {
      const layoutIndex = Number.isFinite(card.userData.filteredIndex)
        ? card.userData.filteredIndex
        : index;
      const layout = this._ribbonLayout(layoutIndex);
      const visible = Boolean(card.userData.visibleInFilter);
      card.material.uniforms.uOpacity.value = visible ? layout.opacity : 0;
      card.material.depthWrite = true;
      card.visible = visible && layout.opacity > 0.003;
    });
    if (this.continuumMesh) {
      this.continuumMesh.material.uniforms.uOpacity.value = 0;
      this.continuumMesh.visible = false;
    }
    this.ringProject = null;
    this.ringAnchorPosition = this.position;
    this.ringEntryOffsetX = this._ribbonMetrics().offsetX;
    return result;
  }

  openDetailFromRing(id = this.ringProject?.id || this.activeProject?.id, options = {}) {
    return id ? this.openDetail(id, options) : Promise.resolve(this);
  }

  goTo(indexOrId, { immediate = false } = {}) {
    const count = this.visibleProjects.length;
    if (!count) return this;
    let index = typeof indexOrId === "number"
      ? indexOrId
      : this.visibleProjects.findIndex((project) => project.id === indexOrId);
    if (index < 0) return this;
    index = this.loop ? mod(index, count) : clamp(index, 0, count - 1);

    if (this.loop) {
      const relative = mod(index - this.position + count / 2, count) - count / 2;
      this.positionTarget = this.position + relative;
    } else {
      this.positionTarget = index;
    }
    this.positionTarget = Math.round(this.positionTarget);
    if (immediate || this.reducedMotion) {
      this.position = this.positionTarget;
      this.velocity = 0;
    }
    return this;
  }

  next(direction = 1) {
    const base = this._activeFromPosition();
    return this.goTo(base + Math.sign(direction || 1));
  }

  previous() {
    return this.next(-1);
  }

  setDetailRect(rect = null) {
    this.detailRect = rect;
    return this;
  }

  setDetailViewport(rect = null) {
    if (!rect) return this.setDetailRect(null);
    return this.setDetailRect({
      left: rect.left ?? rect.x,
      top: rect.top ?? rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom
    });
  }

  async openDetail(id, options = {}) {
    const index = this.projects.findIndex((project) => project.id === id);
    if (index < 0) return this;
    this.modeBeforeDetail = ["about", "ring"].includes(this.mode) ? this.mode : "ribbon";
    this.detailProjectIndex = index;
    this.detailProject = this.projects[index];
    this.detailScroll = this.detailScrollTarget = 0;
    this.detailSwipe = this.detailSwipeTarget = 0;
    this.detailSwipeVelocity = 0;
    if (options.rect) this.setDetailRect(options.rect);
    this.setDetailImages(options.images ?? this.detailProject.images ?? []);
    this.setMode("detail");
    const visibleIndex = this.visibleProjects.findIndex((project) => project.id === this.detailProject.id);
    try {
      this.callbacks.onDetailProjectChange(this.detailProject, visibleIndex >= 0 ? visibleIndex : index);
    } catch (error) { console.error(error); }
    return this._waitForTransition("detail", 1);
  }

  async closeDetail({ returnTo = this.modeBeforeDetail } = {}) {
    this.detailTarget = 0;
    this.mode = returnTo === "about" ? "about" : returnTo === "ring" ? "ring" : "ribbon";
    this.aboutTarget = this.mode === "about" ? 1 : 0;
    this.ringTarget = this.mode === "ring" ? 1 : 0;
    const result = await this._waitForTransition("detail", 0);
    this._clearDetailMedia();
    this.detailProject = null;
    this.detailProjectIndex = -1;
    return result;
  }

  setDetailImages(images = []) {
    this._clearDetailMedia();
    if (!this.detailProject) return this;
    this.detailMediaReveal = this.reducedMotion ? 1 : 0;
    this.detailMediaRevealStart = 0;
    const normalized = images.map((entry) => Array.isArray(entry) ? entry : [entry, ""]);
    // Detail media is born at its final geometry. Its entrance is a shader
    // mask wipe, not a scale-up or an opacity dissolve.
    normalized.forEach((entry, offset) => {
      const material = this._cardMaterial();
      material.depthTest = false;
      material.depthWrite = false;
      const mesh = new THREE.Mesh(this.cardGeometry, material);
      mesh.name = `Detail media ${offset + 1}: ${this.detailProject.id}`;
      mesh.renderOrder = 100 + offset;
      mesh.userData = {
        project: this.detailProject,
        detailIndex: offset,
        isDetailMedia: true,
        alt: entry[1] || projectImageAlt(this.detailProject, offset)
      };
      const layout = this._detailLayout(offset);
      mesh.position.copy(layout.position);
      mesh.quaternion.setFromEuler(layout.rotation);
      mesh.scale.copy(layout.scale);
      material.uniforms.uOpacity.value = this.detailMix > 0.72 ? layout.opacity : 0;
      material.uniforms.uMediaReveal.value = this.detailMediaReveal;
      this._applyTexture(mesh, entry[0]);
      this.detailGroup.add(mesh);
      this.detailMeshes.push(mesh);
    });
    return this;
  }

  _clearDetailMedia() {
    this.detailMeshes.forEach((mesh) => this._disposeCard(mesh));
    this.detailMeshes = [];
    this.detailScroll = this.detailScrollTarget = 0;
    this.detailScrollVelocity = 0;
    this.detailMediaIndex = 0;
  }

  scrollDetail(deltaPixels) {
    const max = Math.max(0, this.detailMeshes.length - 1);
    const impulse = clamp(deltaPixels, -180, 180);
    this.detailScrollTarget = clamp(this.detailScrollTarget + impulse * 0.0018, 0, max);
    this.detailScrollVelocity += impulse * 0.0042;
    return this;
  }

  setDetailScroll(value, velocity = 0) {
    const max = Math.max(0, this.detailMeshes.length - 1);
    this.detailScrollTarget = clamp(value, 0, max);
    this.detailScrollVelocity = velocity;
    return this;
  }

  beginDetailDrag() {
    if (this.mode !== "detail") return this;
    this.detailDragging = true;
    this.detailDragDistance = 0;
    this.detailSwipeTarget = this.detailSwipe;
    return this;
  }

  dragDetail(deltaX, velocityX = 0) {
    if (this.mode !== "detail") return this;
    if (!this.detailDragging) this.beginDetailDrag();
    const rectWidth = Math.max(this.canvas.clientWidth, 1);
    const worldDelta = deltaX / rectWidth * this.viewWidth;
    this.detailSwipe += worldDelta;
    this.detailSwipeTarget = this.detailSwipe;
    this.detailSwipeVelocity = velocityX / rectWidth * this.viewWidth;
    this.detailDragDistance += deltaX;
    return this;
  }

  endDetailDrag(velocityX = this.detailSwipeVelocity) {
    if (this.mode !== "detail") return Promise.resolve(this);
    this.detailDragging = false;
    const panel = this._detailPanelWorld();
    const pixelVelocity = Math.abs(velocityX) > 20
      ? velocityX
      : velocityX / Math.max(this.viewWidth, EPSILON) * Math.max(this.canvas.clientWidth, 1);
    const direction = Math.abs(this.detailDragDistance) > panel.rect.width * 0.12 || Math.abs(pixelVelocity) > 520
      ? (this.detailDragDistance || pixelVelocity) < 0 ? 1 : -1
      : 0;
    if (direction) return this.nextDetailProject(direction);
    this.detailSwipeTarget = 0;
    this.detailSwipeVelocity *= 0.35;
    return this._waitForSwipeCenter();
  }

  _waitForSwipeCenter(timeout = 900) {
    if (this.reducedMotion) {
      this.detailSwipe = this.detailSwipeTarget = 0;
      return Promise.resolve(this);
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const check = () => {
        if (this.destroyed || Math.abs(this.detailSwipe) < 0.02 || performance.now() - start > timeout) {
          resolve(this);
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  }

  async nextDetailProject(direction = 1) {
    const sequence = this.visibleProjects.length ? this.visibleProjects : this.projects;
    if (!this.detailProject || !sequence.length) return this;
    const sign = Math.sign(direction || 1);
    const sequenceIndex = sequence.findIndex((project) => project.id === this.detailProject.id);
    if (sequenceIndex < 0) return this;
    const nextSequenceIndex = this.loop
      ? mod(sequenceIndex + sign, sequence.length)
      : clamp(sequenceIndex + sign, 0, sequence.length - 1);
    const nextProject = sequence[nextSequenceIndex];
    const nextIndex = this.projects.findIndex((project) => project.id === nextProject.id);
    if (nextIndex === this.detailProjectIndex) {
      this.detailSwipeTarget = 0;
      return this._waitForSwipeCenter();
    }

    const panel = this._detailPanelWorld();
    const step = panel.width * 1.015;
    const outward = sign > 0 ? -1 : 1;
    this.detailSwipeTarget = outward * step;
    await this._waitForSwipeTarget(this.detailSwipeTarget);

    // Preserve both cards' world positions while their logical roles rotate.
    // The incoming neighbor is already centered before the index changes.
    this.detailProjectIndex = nextIndex;
    this.detailProject = this.projects[nextIndex];
    this.detailSwipe += sign * step;
    this.detailSwipeTarget = 0;
    this.setDetailImages(this.detailProject.images ?? []);
    this.detailScroll = this.detailScrollTarget = 0;
    this.detailSwipeVelocity *= 0.38;
    try { this.callbacks.onDetailProjectChange(this.detailProject, nextSequenceIndex); } catch (error) { console.error(error); }
    return this._waitForSwipeCenter();
  }

  async switchDetail(id, direction = 1) {
    if (!this.detailProject || !this.projects.length) return this.openDetail(id);
    const nextIndex = this.projects.findIndex((project) => project.id === id);
    if (nextIndex < 0 || nextIndex === this.detailProjectIndex) return this;

    const panel = this._detailPanelWorld();
    const step = panel.width * 1.015;
    const sign = Math.sign(direction || 1);
    const outward = sign > 0 ? -1 : 1;
    this.detailDragging = false;
    this.detailSwipeTarget = outward * step;
    await this._waitForSwipeTarget(this.detailSwipeTarget);

    this.detailProjectIndex = nextIndex;
    this.detailProject = this.projects[nextIndex];
    this.detailSwipe += sign * step;
    this.detailSwipeTarget = 0;
    this.setDetailImages(this.detailProject.images ?? []);
    this.detailScroll = this.detailScrollTarget = 0;
    this.detailSwipeVelocity *= 0.38;
    const nextVisibleIndex = this.visibleProjects.findIndex((project) => project.id === this.detailProject.id);
    try {
      this.callbacks.onDetailProjectChange(this.detailProject, nextVisibleIndex >= 0 ? nextVisibleIndex : nextIndex);
    } catch (error) { console.error(error); }
    return this._waitForSwipeCenter();
  }

  _waitForSwipeTarget(target, timeout = 620) {
    if (this.reducedMotion) {
      this.detailSwipe = target;
      return Promise.resolve(this);
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const check = () => {
        if (this.destroyed || Math.abs(this.detailSwipe - target) < 0.08 || performance.now() - start > timeout) {
          resolve(this);
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  }

  setEnabled(enabled = true) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this._clearHover();
    return this;
  }

  // DOM text/captions sit above the canvas in detail mode. The app can pass
  // their pointer coordinates here so the same WebGL wake continues beneath
  // overlays instead of abruptly stopping at an HTML boundary.
  addRipplePoint(clientX, clientY) {
    if (typeof clientX === "object" && clientX) {
      clientY = clientX.clientY;
      clientX = clientX.clientX;
    }
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return this;
    const rect = this.canvas.getBoundingClientRect();
    if (
      clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom
    ) return this;
    const u = (clientX - rect.left) / Math.max(rect.width, 1);
    const v = 1 - (clientY - rect.top) / Math.max(rect.height, 1);
    this.postMaterial.uniforms.uPointer.value.set(u, v);
    this._recordRipple(u, v);
    return this;
  }

  reset({ animate = true, preferredId = null } = {}) {
    this._clearDetailMedia();
    this.detailProject = null;
    this.detailProjectIndex = -1;
    this.mode = "ribbon";
    this.aboutTarget = 0;
    this.ringTarget = 0;
    this.detailTarget = 0;
    this.ringProject = null;
    this.ringAnchorPosition = this.position;
    this.ringEntryOffsetX = this._ribbonMetrics().offsetX;
    if (!animate || this.reducedMotion) {
      this.aboutMix = 0;
      this.ringMix = 0;
      this.detailMix = 0;
    }
    this.goTo(preferredId || 0, { immediate: !animate });
    return this;
  }

  resize() {
    if (this.destroyed) return this;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || this.canvas.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || this.canvas.clientHeight || window.innerHeight));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.5 : 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderTarget.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));

    this.camera.aspect = width / height;
    this.viewHeight = 2 * this.camera.position.z
      * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    this.viewWidth = this.viewHeight * width / height;
    this.camera.updateProjectionMatrix();
    this.postMaterial.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    return this;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    window.clearTimeout(this.wheelSnapTimer);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("pointercancel", this._onPointerUp);
    this.canvas.removeEventListener("pointerleave", this._onPointerLeave);
    this.canvas.removeEventListener("wheel", this._onWheel);
    this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("visibilitychange", this._onVisibility);

    this.cards.forEach((card) => this._disposeCard(card));
    this._clearDetailMedia();
    this.previewMesh?.material?.dispose?.();
    this.continuumMesh?.geometry?.dispose?.();
    this.continuumMesh?.material?.dispose?.();
    this.ringRibbonMeshes?.forEach((mesh) => {
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });
    this.ribbonAtlasTexture?.dispose?.();
    this.videoElements.forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
    this.textureCache.forEach((pending) => {
      Promise.resolve(pending).then((asset) => {
        if (asset.texture !== this.placeholderTexture) asset.texture?.dispose?.();
      });
    });
    this.cardGeometry.dispose();
    this.cardShellGeometry.dispose();
    this.paperGeometry.dispose();
    this.labelTextures.forEach((texture) => texture.dispose());
    this.labelTextures.clear();
    this.placeholderTexture.dispose();
    this.blackHole.geometry.dispose();
    this.blackHole.material.dispose();
    this.detailPaper.material.dispose();
    this.postQuad.geometry.dispose();
    this.postMaterial.dispose();
    this.renderTarget.dispose();
    this.renderer.dispose();
    this._transitionWaiters.splice(0).forEach((waiter) => waiter.resolve(this));
  }
}

if (typeof window !== "undefined") window.Gallery3D = Gallery3D;

export default Gallery3D;
