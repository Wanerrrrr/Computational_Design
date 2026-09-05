(() => {
  class WebGLFocusTransition {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas && (canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        powerPreference: 'high-performance'
      }) || canvas.getContext('experimental-webgl'));
      this.supported = !!this.gl;
      this.raf = 0;
      this.texture = null;
      if (!this.supported) return;
      try {
        this._initProgram();
        this._initMesh(56, 56);
        this._initTexture();
      } catch (error) {
        console.warn('WebGL focus transition disabled:', error);
        this.supported = false;
      }
    }

    _compile(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message || 'Shader compilation failed');
      }
      return shader;
    }

    _initProgram() {
      const gl = this.gl;
      const vertex = this._compile(gl.VERTEX_SHADER, `
        precision highp float;
        attribute vec2 a_uv;
        uniform vec2 u_view;
        uniform vec4 u_rect;
        uniform vec4 u_crop;
        uniform float u_progress;
        uniform float u_strength;
        varying vec2 v_localUv;
        varying vec2 v_texUv;

        float bell(float x, float center, float width) {
          float q = (x - center) / width;
          return exp(-q * q);
        }

        void main() {
          float t = clamp(u_progress, 0.0, 1.0);
          vec2 uv = a_uv;
          vec2 p = uv * 2.0 - 1.0;

          // Broad, deterministic elastic phases measured from the reference:
          // lower edge release -> side compression -> upper crest -> damping.
          float release = bell(t, 0.28, 0.15) * u_strength;
          float pinch   = bell(t, 0.47, 0.18) * u_strength;
          float crest   = bell(t, 0.65, 0.19) * u_strength;
          float returnP = bell(t, 0.80, 0.13) * u_strength;

          float centerY = 1.0 - pow(abs(p.y), 1.65);
          float centerX = 1.0 - min(1.0, p.x * p.x);
          float topW = pow(1.0 - uv.y, 2.75);
          float bottomW = pow(uv.y, 2.75);

          // Both vertical sides bow inward around the middle. A tiny asymmetry
          // keeps it from feeling mathematically mirrored, like the source film.
          float sideAsymmetry = mix(0.92, 1.08, uv.x);
          float dx = -sign(p.x) * 0.050 * pinch * centerY * sideAsymmetry;
          dx += 0.012 * release * (uv.y - 0.5);
          dx += sign(p.x) * 0.013 * returnP * centerY;

          // The bottom is pulled first; the top follows later with one wide crest.
          float dy = 0.054 * release * bottomW * (0.64 + 0.36 * centerX);
          float topProfile = 0.70 + 0.30 * sin((uv.x + 0.08) * 3.14159265);
          dy -= 0.050 * crest * topW * topProfile;

          // One travelling soft impulse passes upward through the sheet. This is
          // deliberately Gaussian rather than sinusoidal so there is only one wave.
          float travelCenter = mix(1.18, -0.18, smoothstep(0.16, 0.78, t));
          float travel = exp(-pow((uv.y - travelCenter) / 0.24, 2.0));
          dy -= 0.017 * travel * pinch * (0.42 + 0.58 * centerX);

          // Very small diagonal inertia in the middle phase, then full damping.
          dy += 0.009 * pinch * p.x * (1.0 - abs(p.y));
          dy += 0.010 * returnP * topW;

          vec2 warpedUv = uv + vec2(dx, dy);
          vec2 px = u_rect.xy + warpedUv * u_rect.zw;
          vec2 clip = vec2(px.x / u_view.x * 2.0 - 1.0,
                           1.0 - px.y / u_view.y * 2.0);
          gl_Position = vec4(clip, 0.0, 1.0);

          // Start with the exact object-fit:cover crop seen in the project card,
          // then reveal the full image as it reaches the focus state.
          float uvReveal = smoothstep(0.10, 0.76, t);
          vec2 cropped = u_crop.xy + uv * u_crop.zw;
          v_texUv = mix(cropped, uv, uvReveal);
          v_localUv = uv;
        }
      `);

      const fragment = this._compile(gl.FRAGMENT_SHADER, `
        precision highp float;
        uniform sampler2D u_texture;
        uniform vec2 u_size;
        uniform float u_radius;
        varying vec2 v_localUv;
        varying vec2 v_texUv;

        float roundedRectSdf(vec2 p, vec2 halfSize, float radius) {
          vec2 q = abs(p) - (halfSize - vec2(radius));
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        }

        void main() {
          vec4 color = texture2D(u_texture, clamp(v_texUv, 0.001, 0.999));
          vec2 localPx = (v_localUv - 0.5) * u_size;
          float d = roundedRectSdf(localPx, u_size * 0.5, u_radius);
          float edge = 1.0 - smoothstep(-1.25, 1.25, d);
          gl_FragColor = vec4(color.rgb, color.a * edge);
        }
      `);

      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
      }
      gl.useProgram(program);
      this.program = program;
      this.locations = {
        uv: gl.getAttribLocation(program, 'a_uv'),
        view: gl.getUniformLocation(program, 'u_view'),
        rect: gl.getUniformLocation(program, 'u_rect'),
        crop: gl.getUniformLocation(program, 'u_crop'),
        progress: gl.getUniformLocation(program, 'u_progress'),
        strength: gl.getUniformLocation(program, 'u_strength'),
        size: gl.getUniformLocation(program, 'u_size'),
        radius: gl.getUniformLocation(program, 'u_radius'),
        texture: gl.getUniformLocation(program, 'u_texture')
      };
    }

    _initMesh(cols, rows) {
      const gl = this.gl;
      const uv = [];
      const indices = [];
      for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
          uv.push(x / cols, y / rows);
        }
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const a = y * (cols + 1) + x;
          const b = a + 1;
          const c = a + cols + 1;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
      this.indexCount = indices.length;
      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.locations.uv);
      gl.vertexAttribPointer(this.locations.uv, 2, gl.FLOAT, false, 0, 0);

      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      this.uvBuffer = uvBuffer;
      this.indexBuffer = indexBuffer;
    }

    _initTexture() {
      const gl = this.gl;
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1i(this.locations.texture, 0);
    }

    _resize() {
      const gl = this.gl;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      this.canvas.style.width = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
      this.cssWidth = cssW;
      this.cssHeight = cssH;
    }

    _upload(image) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    _coverCrop(image, rect) {
      const iw = image.naturalWidth || image.videoWidth || rect.width;
      const ih = image.naturalHeight || image.videoHeight || rect.height;
      const imageAspect = iw / Math.max(1, ih);
      const boxAspect = rect.width / Math.max(1, rect.height);
      if (imageAspect > boxAspect) {
        const visible = boxAspect / imageAspect;
        return [(1 - visible) * 0.5, 0, visible, 1];
      }
      const visible = imageAspect / boxAspect;
      return [0, (1 - visible) * 0.5, 1, visible];
    }

    _draw(rect, crop, progress, strength = 1, radius = 14) {
      const gl = this.gl;
      this._resize();
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.enableVertexAttribArray(this.locations.uv);
      gl.vertexAttribPointer(this.locations.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(this.locations.view, this.cssWidth, this.cssHeight);
      gl.uniform4f(this.locations.rect, rect.left, rect.top, rect.width, rect.height);
      gl.uniform4f(this.locations.crop, crop[0], crop[1], crop[2], crop[3]);
      gl.uniform1f(this.locations.progress, progress);
      gl.uniform1f(this.locations.strength, strength);
      gl.uniform2f(this.locations.size, rect.width, rect.height);
      gl.uniform1f(this.locations.radius, radius);
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    _sample(samples, t, key) {
      if (t <= samples[0].o) return samples[0][key];
      const last = samples[samples.length - 1];
      if (t >= last.o) return last[key];
      let i = 0;
      while (i < samples.length - 2 && t > samples[i + 1].o) i++;
      const a = samples[Math.max(0, i - 1)];
      const b = samples[i];
      const c = samples[i + 1];
      const d = samples[Math.min(samples.length - 1, i + 2)];
      const u = (t - b.o) / Math.max(0.0001, c.o - b.o);
      const p0 = a[key], p1 = b[key], p2 = c[key], p3 = d[key];
      // Catmull-Rom gives continuous velocity through the measured keyframes.
      return 0.5 * ((2 * p1) + (-p0 + p2) * u +
        (2*p0 - 5*p1 + 4*p2 - p3) * u*u +
        (-p0 + 3*p1 - 3*p2 + p3) * u*u*u);
    }

    _rectAt(source, target, t) {
      const samples = WebGLFocusTransition.referenceSamples;
      const sx = this._sample(samples, t, 'x');
      const sy = this._sample(samples, t, 'y');
      const sw = this._sample(samples, t, 'w');
      const sh = this._sample(samples, t, 'h');
      return {
        left: source.left + (target.left - source.left) * sx,
        top: source.top + (target.top - source.top) * sy,
        width: source.width + (target.width - source.width) * sw,
        height: source.height + (target.height - source.height) * sh
      };
    }

    async play({ image, sourceRect, targetRect, duration = 930, strength = 1, crop = null, onStart = null }) {
      if (!this.supported || !image) return false;
      this.stop();
      try {
        if (!image.complete && image.decode) await image.decode();
      } catch (_) {}
      if (!(image.naturalWidth || image.videoWidth)) return false;
      this._upload(image);
      const sourceCrop = crop || this._coverCrop(image, sourceRect);
      this.canvas.classList.add('is-active');
      this.canvas.style.opacity = '1';
      this._draw(sourceRect, sourceCrop, 0, strength, 16);
      if (onStart) onStart();

      const start = performance.now();
      return await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const rect = this._rectAt(sourceRect, targetRect, t);
          const radius = 16 + (14 - 16) * Math.min(1, t * 1.35);
          this._draw(rect, sourceCrop, t, strength, radius);
          if (t < 1) this.raf = requestAnimationFrame(tick);
          else { this.raf = 0; resolve(true); }
        };
        this.raf = requestAnimationFrame(tick);
      });
    }

    async pulse({ image, rect, duration = 720, strength = 0.78, onStart = null }) {
      if (!this.supported || !image) return false;
      this.stop();
      try { if (!image.complete && image.decode) await image.decode(); } catch (_) {}
      if (!image.naturalWidth) return false;
      this._upload(image);
      const crop = [0, 0, 1, 1];
      this.canvas.classList.add('is-active');
      this.canvas.style.opacity = '1';
      this._draw(rect, crop, 0, strength, 14);
      if (onStart) onStart();
      const start = performance.now();
      return await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // Keep geometry stationary in focus mode; only the elastic field runs.
          this._draw(rect, crop, t, strength, 14);
          if (t < 1) this.raf = requestAnimationFrame(tick);
          else { this.raf = 0; resolve(true); }
        };
        this.raf = requestAnimationFrame(tick);
      });
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    hide() {
      this.stop();
      if (!this.canvas) return;
      this.canvas.style.opacity = '0';
      this.canvas.classList.remove('is-active');
      if (this.supported) {
        this.gl.clearColor(0,0,0,0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      }
    }
  }

  // Global movement coefficients sampled from the original 60fps recording.
  // The mesh deformation is layered on top of these non-synchronous width,
  // height and positional overshoots.
  WebGLFocusTransition.referenceSamples = [
    {o:0.000, x:0.000, y:0.000, w:0.000, h:0.000},
    {o:0.111, x:0.031, y:0.038, w:0.041, h:0.045},
    {o:0.222, x:0.143, y:0.145, w:0.153, h:0.171},
    {o:0.333, x:0.408, y:0.374, w:0.413, h:0.465},
    {o:0.444, x:0.806, y:0.618, w:0.862, h:0.743},
    {o:0.556, x:0.878, y:0.947, w:1.082, h:0.927},
    {o:0.667, x:0.888, y:1.168, w:0.990, h:1.041},
    {o:0.778, x:0.949, y:1.206, w:0.949, h:1.090},
    {o:0.889, x:0.980, y:1.076, w:0.980, h:1.033},
    {o:1.000, x:1.000, y:1.000, w:1.000, h:1.000}
  ];

  window.WebGLFocusTransition = WebGLFocusTransition;
})();
