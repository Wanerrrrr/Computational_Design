(() => {
  const projects = window.PROJECTS || [];
  const $ = (id) => document.getElementById(id);

  const indexView = $('indexView');
  const indexTrack = $('indexTrack');
  const projectView = $('projectView');
  const projectScroll = $('projectScroll');
  const projectInfoColumn = $('projectInfoColumn');
  const projectGallery = $('projectGallery');
  const aboutView = $('aboutView');
  const focusView = $('focusView');

  const indexButton = $('indexButton');
  const aboutButton = $('aboutButton');
  const homeButton = $('homeButton');
  const backButton = $('backButton');
  const aboutClose = $('aboutClose');
  const focusClose = $('focusClose');

  const projectNumber = $('projectNumber');
  const projectTitle = $('projectTitle');
  const projectKicker = $('projectKicker');
  const focusProject = $('focusProject');
  const focusIndex = $('focusIndex');
  const focusMedium = $('focusMedium');
  const focusSide = $('focusSide');
  const focusCaption = $('focusCaption');
  const focusImage = $('focusImage');
  const focusImageShell = $('focusImageShell');
  const focusMorph = $('focusMorph');
  const focusWebGL = $('focusWebGL');
  const zoomFlash = $('zoomFlash');
  const webglFocus = (focusWebGL && window.WebGLFocusTransition)
    ? new window.WebGLFocusTransition(focusWebGL)
    : null;

  let activeProject = null;
  let activeImageIndex = 0;
  let transitionBusy = false;
  let autoScrollFrame = null;
  let autoScrollToken = 0;

  // ---------------------------------------------------------------------------
  // HOME: horizontal inertial index + center snapping + fixed-position hover growth
  // ---------------------------------------------------------------------------
  let targetX = 0;
  let currentX = 0;
  let minIndexX = 0;
  let maxIndexX = 0;
  let indexReady = false;
  let indexSnapTimer = null;
  let dragging = false;
  let dragMoved = false;
  let dragStart = 0;
  let dragOrigin = 0;
  let indexMotionEnergy = 0;
  let previousIndexX = 0;

  // Pointer-edge autopan. The pointer can gently "pull" the active view
  // without replacing wheel/drag input. Releasing the edge lets snapping resume.
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let pointerInside = false;
  let edgeIndexActive = false;
  let edgeArchiveActive = false;

  function renderIndex() {
    indexTrack.innerHTML = '';
    projects.forEach((project) => {
      const item = document.createElement('button');
      item.className = 'index-item';
      item.type = 'button';
      item.dataset.project = project.id;
      item.setAttribute('aria-label', `Open ${project.title}`);
      const left = project.images?.[0]?.[0] || '';
      const right = project.images?.[1]?.[0] || left;
      item.innerHTML = `
        <img class="index-preview left" src="${left}" alt="" aria-hidden="true">
        <span class="index-item-number">${project.number}</span>
        <span class="index-item-title">${project.title}</span>
        <span class="index-item-year">${project.year}</span>
        <img class="index-preview right" src="${right}" alt="" aria-hidden="true">
        <span class="index-item-action">view project ↗</span>
      `;

      item.addEventListener('pointerenter', () => {
        if (dragging || window.innerWidth <= 850) return;
        setIndexHover(item);
      });
      item.addEventListener('pointerleave', () => {
        if (item.classList.contains('is-hovered')) clearIndexHover();
      });
      item.addEventListener('focus', () => setIndexHover(item));
      item.addEventListener('blur', clearIndexHover);
      item.addEventListener('click', (e) => {
        if (dragMoved || transitionBusy) { e.preventDefault(); return; }
        openProject(project.id);
      });
      indexTrack.appendChild(item);
    });
    requestAnimationFrame(() => {
      measureIndex();
      const first = indexTrack.querySelector('.index-item');
      if (first && !indexReady) {
        centerIndexItem(first, true);
        indexReady = true;
      } else {
        scheduleIndexSnap(40);
      }
    });
  }

  function setIndexHover(item) {
    clearIndexHover();
    const items = [...indexTrack.querySelectorAll('.index-item')];
    const activeIndex = items.indexOf(item);
    indexTrack.classList.add('has-hover');
    item.classList.add('is-hovered');
    items.forEach((el, i) => {
      if (i < activeIndex) el.classList.add('is-left-of-hover');
      if (i > activeIndex) el.classList.add('is-right-of-hover');
    });
  }

  function clearIndexHover() {
    indexTrack.querySelectorAll('.index-item').forEach((el) => {
      el.classList.remove('is-hovered','is-left-of-hover','is-right-of-hover');
    });
    indexTrack.classList.remove('has-hover');
  }

  function measureIndex() {
    if (window.innerWidth <= 850) return;
    const items = [...indexTrack.querySelectorAll('.index-item')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const firstCenter = first.offsetLeft + first.offsetWidth / 2;
    const lastCenter = last.offsetLeft + last.offsetWidth / 2;
    maxIndexX = window.innerWidth / 2 - firstCenter;
    minIndexX = window.innerWidth / 2 - lastCenter;
    targetX = clamp(targetX, minIndexX, maxIndexX);
    currentX = clamp(currentX, minIndexX, maxIndexX);
  }

  function centerIndexItem(item, immediate = false) {
    if (!item || window.innerWidth <= 850) return;
    const center = item.offsetLeft + item.offsetWidth / 2;
    const desired = clamp(window.innerWidth / 2 - center, minIndexX, maxIndexX);
    targetX = desired;
    if (immediate) currentX = desired;
  }

  function snapIndexToNearest() {
    if (window.innerWidth <= 850 || dragging || edgeIndexActive || transitionBusy || indexView.classList.contains('is-hidden')) return;
    const items = [...indexTrack.querySelectorAll('.index-item')];
    if (!items.length) return;
    const screenCenter = window.innerWidth / 2;
    let nearest = items[0];
    let best = Infinity;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs((rect.left + rect.width / 2) - screenCenter);
      if (distance < best) { best = distance; nearest = item; }
    });
    centerIndexItem(nearest);
  }

  function scheduleIndexSnap(delay = 180) {
    clearTimeout(indexSnapTimer);
    indexSnapTimer = setTimeout(snapIndexToNearest, delay);
  }

  function animateIndex() {
    previousIndexX = currentX;
    currentX += (targetX - currentX) * .105;
    if (Math.abs(targetX - currentX) < .02) currentX = targetX;

    const dx = currentX - previousIndexX;
    if (Math.abs(dx) > .02) indexMotionEnergy = Math.min(1, indexMotionEnergy + Math.abs(dx) / 18);
    indexMotionEnergy *= .91;

    if (window.innerWidth > 850) {
      indexTrack.style.transform = `translate3d(${currentX}px,0,0)`;
      updateIndexScale(indexMotionEnergy);
    }
    requestAnimationFrame(animateIndex);
  }

  function updateIndexScale(motionEnergy = 0) {
    const items = [...indexTrack.querySelectorAll('.index-item')];
    const center = window.innerWidth * .5;
    const influence = Math.max(430, window.innerWidth * .46);
    const movingBoost = motionEnergy * .065;
    items.forEach((item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth * .5 + currentX;
      const closeness = 1 - clamp(Math.abs(itemCenter - center) / influence, 0, 1);
      // Every item grows while the rail is moving; the centered item gets a
      // second, smaller proximity emphasis. The individual `scale` property
      // does not disturb the horizontal layout or hover push transforms.
      const scale = .965 + closeness * .045 + movingBoost;
      item.style.scale = scale.toFixed(4);
      const title = item.querySelector('.index-item-title');
      if (title) title.style.transform = `scale(${item.classList.contains('is-hovered') ? 1.24 : 1})`;
    });
  }

  function onWheel(e) {
    if (window.innerWidth <= 850) return;
    if (!indexView.classList.contains('is-hidden') && !aboutView.classList.contains('is-visible') && !transitionBusy) {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      targetX = clamp(targetX - delta * 1.06, minIndexX, maxIndexX);
      indexMotionEnergy = Math.min(1, indexMotionEnergy + Math.abs(delta) / 220);
      clearIndexHover();
      scheduleIndexSnap(190);
    }
  }

  indexTrack.addEventListener('pointerdown', (e) => {
    if (window.innerWidth <= 850) return;
    dragging = true;
    dragMoved = false;
    dragStart = e.clientX;
    dragOrigin = targetX;
    clearTimeout(indexSnapTimer);
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || window.innerWidth <= 850) return;
    const dx = e.clientX - dragStart;
    if (Math.abs(dx) < 6) return;
    dragMoved = true;
    clearIndexHover();
    targetX = clamp(dragOrigin + dx, minIndexX, maxIndexX);
    indexMotionEnergy = Math.min(1, indexMotionEnergy + Math.abs(dx) / 180);
  });
  window.addEventListener('pointerup', finishDrag);
  window.addEventListener('pointercancel', finishDrag);
  function finishDrag() {
    if (!dragging) return;
    dragging = false;
    scheduleIndexSnap(110);
    setTimeout(() => { dragMoved = false; }, 0);
  }

  // ---------------------------------------------------------------------------
  // PROJECT: fixed title + counter-moving rounded archive columns + center snapping
  // ---------------------------------------------------------------------------
  let archiveMetrics = { maxScroll: 0, infoRange: 0, imageRange: 0 };
  let archiveMotionFrame = null;
  let archiveSnapTimer = null;
  let archiveProgrammatic = false;
  let archiveScrollAnimToken = 0;
  let archiveMotionEnergy = 0;
  let previousArchiveScroll = 0;

  function populateProject(project) {
    activeProject = project;
    projectNumber.textContent = project.number;
    projectTitle.textContent = project.title;
    projectKicker.textContent = project.kicker;

    const cards = [
      ['Context', project.statement, 'statement', null],
      ...project.meta.map(([label, value, link]) => [
        label,
        value,
        '',
        link || null
      ]),
    ];

    projectInfoColumn.innerHTML = cards.map(([label, value, kind, link]) => `
    ${
      link
        ? `<a
            class="info-card ${kind} info-data-link"
            href="${escapeHTML(link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="info-label">${escapeHTML(label)}</span>
  
            <div class="info-value">
              ${escapeHTML(value)}
              <span class="inline-arrow">↗</span>
            </div>
          </a>`
  
        : `<article class="info-card ${kind}">
            <span class="info-label">${escapeHTML(label)}</span>
            <div class="info-value">${escapeHTML(value)}</div>
          </article>`
    }
  `).join('') + `
    <a
      class="info-card info-link"
      href="${project.originalUrl}"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div>
        <span class="info-label">Original Project</span>
        <div class="info-value">
          Open the original interactive exercise.
        </div>
      </div>
  
      <span class="arrow">↗</span>
    </a>
  `;

    projectGallery.innerHTML = '';
    project.images.forEach(([src, caption], index) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery-card';
      figure.innerHTML = `
        <img src="${src}" alt="${escapeHTML(project.title)}: ${escapeHTML(caption)}" loading="eager">
        <figcaption class="gallery-caption"><span>${escapeHTML(caption)}</span><span>${String(index + 1).padStart(2,'0')}</span></figcaption>
      `;
      const image = figure.querySelector('img');
      figure.addEventListener('click', () => openFocus(index, image));
      projectGallery.appendChild(figure);
    });

    setupArchiveCardHover();
    projectInfoColumn.style.transform = '';
    projectGallery.style.transform = '';
    projectScroll.scrollTop = 0;
    prepareArchiveCards();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      measureArchive();
      updateArchiveMotion();
    }));
  }

  function setupArchiveCardHover() {
    [...projectInfoColumn.children, ...projectGallery.children].forEach((el) => {
      el.dataset.hoverProgress = '0';

      el.addEventListener('pointerenter', () => {
        requestArchiveMotion();
      });

      el.addEventListener('pointerleave', () => {
        requestArchiveMotion();
      });
    });
  }

  function prepareArchiveCards() {
    [...projectInfoColumn.children, ...projectGallery.children].forEach((el) => el.classList.remove('is-in'));
  }

  function revealArchiveCards(baseDelay = 150) {
    const elements = [...projectInfoColumn.children, ...projectGallery.children];
    elements.forEach((el) => el.classList.remove('is-in'));
    elements.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), baseDelay + i * 56));
  }

  function measureArchive() {
    const viewport = projectScroll.clientHeight || window.innerHeight;
    const maxScroll = Math.max(0, projectScroll.scrollHeight - viewport);
    archiveMetrics.maxScroll = maxScroll;
    archiveMetrics.infoRange = Math.max(0, projectInfoColumn.scrollHeight - viewport * .72);
    archiveMetrics.imageRange = Math.max(0, projectGallery.scrollHeight - viewport * .72);
    updateArchiveMotion();
  }

  function requestArchiveMotion() {
    if (archiveMotionFrame) return;
    archiveMotionFrame = requestAnimationFrame(() => {
      archiveMotionFrame = null;
      updateArchiveMotion();
    });
  }

  function updateArchiveMotion() {
    if (!projectView.classList.contains('is-visible') && !activeProject) return;
    const { maxScroll, infoRange, imageRange } = archiveMetrics;
    const s = projectScroll.scrollTop;
    const p = maxScroll > 0 ? clamp(s / maxScroll, 0, 1) : 0;

    // The text column travels upward; the image column travels downward.
    // Native scrolling contributes -scrollTop, so these transforms compensate
    // to create two independent, opposing visual tracks.
    const infoTransform = s - p * infoRange;
    const imageTransform = -imageRange + p * imageRange + s;
    projectInfoColumn.style.transform = `translate3d(0,${infoTransform}px,0)`;
    projectGallery.style.transform = `translate3d(0,${imageTransform}px,0)`;

    const scrollRect = projectScroll.getBoundingClientRect();
    const visualCenter = scrollRect.top + projectScroll.clientHeight * .5;
    const influence = Math.max(260, projectScroll.clientHeight * .62);
    archiveMotionEnergy *= .90;
    const motionBoost = archiveMotionEnergy * .075;

    // Smooth hover interpolation:
    // The old version jumped instantly from 0 to .055 on hover.
    // Here every card stores its own hoverProgress (0 → 1) and eases toward
    // the target over multiple animation frames, so both enlarge and shrink
    // feel slow and fluid.
    let hoverStillAnimating = false;

    [...projectInfoColumn.children, ...projectGallery.children].forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      const closeness = 1 - clamp(Math.abs(cardCenter - visualCenter) / influence, 0, 1);

      const hoverTarget = card.matches(':hover') ? 1 : 0;
      const hoverCurrent = Number(card.dataset.hoverProgress || 0);

      // Smaller = slower.
      // .022 gives a noticeably slow, soft hover without feeling unresponsive.
      const hoverSpeed = .022;
      let hoverProgress = hoverCurrent + (hoverTarget - hoverCurrent) * hoverSpeed;

      // Snap only when extremely close so the RAF loop can stop cleanly.
      if (Math.abs(hoverTarget - hoverProgress) < .001) {
        hoverProgress = hoverTarget;
      } else {
        hoverStillAnimating = true;
      }

      card.dataset.hoverProgress = hoverProgress.toFixed(4);

      // This controls HOW MUCH the card grows, not how fast.
      const hoverBoost = hoverProgress * .055;

      // In the reference the archive breathes larger while it is physically
      // moving, then settles back to a center-weighted scale when motion stops.
      const scale = .925 + closeness * .115 + motionBoost + hoverBoost;
      card.style.scale = scale.toFixed(4);
      card.style.zIndex = String(
        2 + Math.round(closeness * 8) + Math.round(hoverProgress * 8)
      );
    });

    // Keep animating while either scrolling inertia or hover easing is active.
    if (archiveMotionEnergy > .006 || hoverStillAnimating) requestArchiveMotion();
  }

  function scheduleArchiveSnap(delay = 170) {
    if (archiveProgrammatic || autoScrollFrame || edgeArchiveActive || transitionBusy) return;
    clearTimeout(archiveSnapTimer);
    archiveSnapTimer = setTimeout(snapArchiveToNearest, delay);
  }

  function snapArchiveToNearest() {
    if (!projectView.classList.contains('is-visible') || archiveProgrammatic || edgeArchiveActive || transitionBusy) return;
    measureArchive();
    const { maxScroll, infoRange, imageRange } = archiveMetrics;
    if (maxScroll < 10) return;

    const scrollRect = projectScroll.getBoundingClientRect();
    const visualCenter = scrollRect.top + projectScroll.clientHeight * .5;
    const candidates = [...projectInfoColumn.children, ...projectGallery.children];
    let nearest = null;
    let nearestDistance = Infinity;
    candidates.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - visualCenter);
      if (distance < nearestDistance) { nearestDistance = distance; nearest = card; }
    });
    if (!nearest) return;

    const rect = nearest.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const deltaY = visualCenter - center;
    const isInfo = nearest.parentElement === projectInfoColumn;
    const derivative = isInfo ? -(infoRange / maxScroll) : (imageRange / maxScroll);
    if (Math.abs(derivative) < .035) return;
    const target = clamp(projectScroll.scrollTop + deltaY / derivative, 0, maxScroll);
    if (Math.abs(target - projectScroll.scrollTop) < 5) return;
    smoothProjectScrollTo(target, 680);
  }

  function smoothProjectScrollTo(target, duration = 680) {
    const token = ++archiveScrollAnimToken;
    const start = projectScroll.scrollTop;
    const distance = target - start;
    if (Math.abs(distance) < 1) return;
    archiveProgrammatic = true;
    const startTime = performance.now();
    function tick(now) {
      if (token !== archiveScrollAnimToken) return;
      const t = clamp((now - startTime) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      projectScroll.scrollTop = start + distance * eased;
      requestArchiveMotion();
      if (t < 1) requestAnimationFrame(tick);
      else {
        archiveProgrammatic = false;
        projectScroll.scrollTop = target;
        requestArchiveMotion();
      }
    }
    requestAnimationFrame(tick);
  }

  function projectFixedEntranceElements() {
    return [
      backButton,
      projectNumber,
      projectTitle,
      projectView.querySelector('.project-year'),
      projectKicker,
      projectView.querySelector('.project-fixed-footer span')
    ].filter(Boolean);
  }

  function prepareProjectFixedEntrance() {
    projectFixedEntranceElements().forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      // Preserve the designed resting opacity (e.g. 0.45 for the back link) so
      // the element does not flash to 100% opacity at the end of the entrance.
      el.dataset.enterOpacity = getComputedStyle(el).opacity || '1';
      el.style.opacity = '0';
      el.style.translate = '118px 0';
    });
  }

  function playProjectFixedEntrance() {
    projectFixedEntranceElements().forEach((el, i) => {
      const targetOpacity = Number(el.dataset.enterOpacity || 1);
      const animation = el.animate([
        {opacity:0, translate:'118px 0'},
        {opacity:targetOpacity, translate:'0px 0'}
      ], {
        duration: 920,
        delay: 70 + i * 72,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'forwards'
      });
      animation.finished.then(() => {
        animation.cancel();
        el.style.opacity = '';
        el.style.translate = '';
        delete el.dataset.enterOpacity;
      }).catch(() => {});
    });
  }

  function openProject(id, pushHistory = true) {
    const project = projects.find((p) => p.id === id);
    if (!project || transitionBusy) return;
    cancelAutoScroll();
    clearIndexHover();
    populateProject(project);
    prepareProjectFixedEntrance();
    zoomBetween(indexView, projectView, () => {
      indexView.classList.add('is-hidden');
      projectView.classList.add('is-visible');
      projectView.setAttribute('aria-hidden','false');
      setNav('');
      requestAnimationFrame(() => {
        playProjectFixedEntrance();
        revealArchiveCards(150);
      });
    }, () => {
      measureArchive();
      startArchivePreviewScroll();
    });
    if (pushHistory) safePushState({project:id}, `#${id}`);
  }

  function showIndex(pushHistory = true) {
    if (transitionBusy || focusView.classList.contains('is-visible')) return;
    cancelAutoScroll();
    ++archiveScrollAnimToken;
    if (!projectView.classList.contains('is-visible')) {
      aboutView.classList.remove('is-visible');
      indexView.classList.remove('is-hidden');
      setNav('index');
      scheduleIndexSnap(60);
      return;
    }
    zoomBetween(projectView, indexView, () => {
      indexView.classList.remove('is-hidden');
      projectView.classList.remove('is-visible');
      projectView.setAttribute('aria-hidden','true');
      setNav('index');
    }, () => scheduleIndexSnap(70));
    activeProject = null;
    if (pushHistory) safePushState({}, location.protocol === 'file:' ? location.href.split('#')[0] : window.location.pathname);
  }

  // A short self-running preview of the counter-moving archive. It then snaps
  // to the nearest centered card and gives control back to the viewer.
  function startArchivePreviewScroll() {
    cancelAutoScroll();
    measureArchive();
    const token = ++autoScrollToken;
    const max = archiveMetrics.maxScroll;
    if (max < 100) return;
    const peak = Math.min(max * .34, 620);
    const settle = Math.min(max * .19, 320);
    const t0 = performance.now() + 180;
    const durationA = 1750;
    const durationB = 1050;
    archiveProgrammatic = true;

    function tick(now) {
      if (token !== autoScrollToken) return;
      if (now < t0) { autoScrollFrame = requestAnimationFrame(tick); return; }
      const elapsed = now - t0;
      if (elapsed <= durationA) {
        const p = easeInOutCubic(elapsed / durationA);
        projectScroll.scrollTop = peak * p;
      } else if (elapsed <= durationA + durationB) {
        const p = easeOutCubic((elapsed - durationA) / durationB);
        projectScroll.scrollTop = peak + (settle - peak) * p;
      } else {
        projectScroll.scrollTop = settle;
        autoScrollFrame = null;
        archiveProgrammatic = false;
        requestArchiveMotion();
        setTimeout(snapArchiveToNearest, 100);
        return;
      }
      requestArchiveMotion();
      autoScrollFrame = requestAnimationFrame(tick);
    }
    autoScrollFrame = requestAnimationFrame(tick);
  }

  function cancelAutoScroll() {
    autoScrollToken++;
    if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = null;
    archiveProgrammatic = false;
  }

  function stopArchiveAutomationForUser() {
    cancelAutoScroll();
    ++archiveScrollAnimToken;
    archiveProgrammatic = false;
  }

  projectScroll.addEventListener('scroll', () => {
    const delta = Math.abs(projectScroll.scrollTop - previousArchiveScroll);
    previousArchiveScroll = projectScroll.scrollTop;
    archiveMotionEnergy = Math.min(1, archiveMotionEnergy + delta / 72);
    requestArchiveMotion();
    if (!archiveProgrammatic && !autoScrollFrame) scheduleArchiveSnap(180);
  }, {passive:true});
  ['wheel','pointerdown','touchstart'].forEach((type) => projectScroll.addEventListener(type, stopArchiveAutomationForUser, {passive:true}));

  // ---------------------------------------------------------------------------
  // FOCUS: central dark curtain + FLIP image zoom + liquid distortion + text slide
  // ---------------------------------------------------------------------------
  async function openFocus(index, sourceImage) {
    if (!activeProject || transitionBusy) return;
    cancelAutoScroll();
    transitionBusy = true;
    activeImageIndex = index;
    const [src] = activeProject.images[index];

    setFocusContent(index);
    focusImage.src = src;
    try { if (focusImage.decode) await focusImage.decode(); } catch (_) {}
    focusImage.style.opacity = '0';
    focusView.classList.remove('is-closing','is-opening','copy-in');
    focusView.classList.add('is-visible');
    document.body.classList.add('focus-active');
    focusView.setAttribute('aria-hidden','false');
    focusView.style.opacity = '0';
    focusView.style.visibility = 'visible';

    const sourceRect = sourceImage.getBoundingClientRect();
    await nextFrame();
    const shellRect = focusImageShell.getBoundingClientRect();
    const ratio = sourceImage.naturalWidth && sourceImage.naturalHeight
      ? sourceImage.naturalWidth / sourceImage.naturalHeight
      : sourceRect.width / sourceRect.height;
    const targetRect = containRect(shellRect, ratio);

    // Dark background, outgoing page, and elastic mesh all begin together.
    // There is no intermediate curtain/opening phase, so the transition remains
    // continuous even on slower machines.
    const bgAnim = focusView.animate([
      {opacity:0},
      {opacity:1}
    ], {duration:560,easing:'cubic-bezier(.22,.72,.2,1)',fill:'forwards'});

    const pageAnim = projectView.animate([
      {transform:'scale(1)',opacity:1},
      {transform:'scale(.994)',opacity:.025}
    ], {duration:650,easing:'cubic-bezier(.22,.72,.2,1)',fill:'forwards'});

    let sourceOpacity = sourceImage.style.opacity;
    const meshPromise = (webglFocus && webglFocus.supported)
      ? webglFocus.play({
          image: sourceImage,
          sourceRect,
          targetRect,
          duration: 930,
          strength: 1,
          onStart: () => { sourceImage.style.opacity = '0'; }
        })
      : Promise.resolve(false);

    // If WebGL is unavailable, use one restrained DOM FLIP as a fallback rather
    // than reintroducing the old random/noisy deformation.
    let fallbackAnim = null;
    if (!(webglFocus && webglFocus.supported)) {
      focusMorph.src = sourceImage.currentSrc || sourceImage.src;
      Object.assign(focusMorph.style, {
        left: `${sourceRect.left}px`, top: `${sourceRect.top}px`,
        width: `${sourceRect.width}px`, height: `${sourceRect.height}px`,
        opacity: '1', borderRadius: '16px', filter: 'none', clipPath: 'none'
      });
      focusMorph.classList.add('is-active');
      sourceImage.style.opacity = '0';
      fallbackAnim = focusMorph.animate([
        {left:`${sourceRect.left}px`,top:`${sourceRect.top}px`,width:`${sourceRect.width}px`,height:`${sourceRect.height}px`},
        {left:`${targetRect.left}px`,top:`${targetRect.top}px`,width:`${targetRect.width}px`,height:`${targetRect.height}px`}
      ], {duration:930,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
    }

    // In the reference, typography commits after the image has clearly entered
    // the dark state; each label glides from right to left with a soft stagger.
    setTimeout(restartFocusText, 470);

    const waits = [bgAnim.finished, pageAnim.finished, meshPromise];
    if (fallbackAnim) waits.push(fallbackAnim.finished);
    try { await Promise.all(waits); } catch (_) {}

    // Cross from the final WebGL frame to the regular focus image with no jump.
    focusImage.style.opacity = '1';
    await nextFrame();
    if (webglFocus) webglFocus.hide();
    if (fallbackAnim) {
      fallbackAnim.cancel();
      focusMorph.classList.remove('is-active');
    }
    sourceImage.style.opacity = sourceOpacity;
    bgAnim.cancel();
    pageAnim.cancel();
    projectView.style.opacity = '';
    projectView.style.transform = '';
    focusView.style.opacity = '';
    focusView.style.visibility = '';
    transitionBusy = false;
  }


  function setFocusContent(index) {
    const [,caption] = activeProject.images[index];
    focusProject.textContent = activeProject.title;
    focusIndex.textContent = `${String(index+1).padStart(2,'0')} / ${String(activeProject.images.length).padStart(2,'0')}`;
    focusMedium.textContent = activeProject.kicker;
    focusSide.textContent = caption;
    focusCaption.textContent = `${activeProject.number} — ${activeProject.title} / ${caption}`;
  }

  function restartFocusText() {
    focusView.classList.remove('copy-in');
    focusView.querySelectorAll('.focus-copy-item').forEach((el) => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
    void focusView.offsetWidth;
    focusView.classList.add('copy-in');
  }

  async function stepFocus(direction) {
    if (!activeProject || !focusView.classList.contains('is-visible') || transitionBusy) return;
    transitionBusy = true;
    const count = activeProject.images.length;
    activeImageIndex = (activeImageIndex + direction + count) % count;
    const [src] = activeProject.images[activeImageIndex];
    setFocusContent(activeImageIndex);

    focusImage.src = src;
    try { if (focusImage.decode) await focusImage.decode(); } catch (_) {}
    const ratio = focusImage.naturalWidth && focusImage.naturalHeight
      ? focusImage.naturalWidth / focusImage.naturalHeight
      : 1;
    const shellRect = focusImageShell.getBoundingClientRect();
    const targetRect = containRect(shellRect, ratio);

    if (webglFocus && webglFocus.supported) {
      focusImage.style.opacity = '0';
      await webglFocus.pulse({
        image: focusImage,
        rect: targetRect,
        duration: 720,
        strength: .78
      });
      focusImage.style.opacity = '1';
      await nextFrame();
      webglFocus.hide();
    } else {
      focusImage.animate([
        {transform:'scale(.985,1.015)',opacity:.3},
        {transform:'scale(1.015,.99)',opacity:1},
        {transform:'scale(1)',opacity:1}
      ], {duration:620,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    restartFocusText();
    transitionBusy = false;
  }

  async function closeFocus() {
    if (!focusView.classList.contains('is-visible') || transitionBusy) return;
    transitionBusy = true;
    if (webglFocus) webglFocus.hide();
    focusView.classList.remove('is-opening','is-closing','copy-in');

    // Keep both pages alive during the entire dissolve; this prevents a blank
    // or black "hold" frame between states.
    projectView.style.visibility = 'visible';
    projectView.style.opacity = '.08';
    projectView.style.transform = 'scale(1.018)';

    const out = focusView.animate([
      {opacity:1},
      {opacity:0}
    ], {duration:650,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
    const incoming = projectView.animate([
      {transform:'scale(1.012)',opacity:.08},
      {transform:'scale(1)',opacity:1}
    ], {duration:700,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});

    try { await Promise.all([out.finished, incoming.finished]); } catch (_) {}
    focusView.classList.remove('is-visible');
    document.body.classList.remove('focus-active');
    focusView.setAttribute('aria-hidden','true');
    focusImageShell.classList.remove('is-liquid','is-swap');
    projectView.style.visibility = '';
    projectView.style.opacity = '';
    projectView.style.transform = '';
    transitionBusy = false;
  }


  // ---------------------------------------------------------------------------
  // Soft cross-fade / micro-zoom page transitions
  // ---------------------------------------------------------------------------
  async function zoomBetween(fromView, toView, switchState, complete) {
    if (transitionBusy) return;
    transitionBusy = true;
    clearTimeout(indexSnapTimer);
    clearTimeout(archiveSnapTimer);

    // Cross-fade both states at the same time. switchState may toggle classes
    // that normally hide the old view, so inline visibility keeps it rendered
    // just long enough for a continuous dissolve.
    toView.style.opacity = '0';
    toView.style.transform = 'scale(.986)';
    switchState();
    fromView.style.visibility = 'visible';
    fromView.style.pointerEvents = 'none';
    toView.style.visibility = 'visible';
    toView.style.pointerEvents = 'none';
    await nextFrame();

    const outAnim = fromView.animate([
      {transform:'scale(1)',opacity:1},
      {transform:'scale(1.012)',opacity:0}
    ], {duration:720,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});

    const inAnim = toView.animate([
      {transform:'scale(.992)',opacity:0},
      {transform:'scale(1)',opacity:1}
    ], {duration:760,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});

    try { await Promise.all([outAnim.finished, inAnim.finished]); } catch (_) {}
    outAnim.cancel();
    inAnim.cancel();
    [fromView,toView].forEach((view) => {
      view.style.transform = '';
      view.style.opacity = '';
      view.style.visibility = '';
      view.style.pointerEvents = '';
    });
    transitionBusy = false;
    if (complete) complete();
  }

  // ---------------------------------------------------------------------------
  // About + navigation
  // ---------------------------------------------------------------------------
  function openAbout() {
    if (transitionBusy || focusView.classList.contains('is-visible')) return;
    const from = projectView.classList.contains('is-visible') ? projectView : indexView;
    cancelAutoScroll();
    zoomBetween(from, aboutView, () => {
      aboutView.classList.add('is-visible');
      aboutView.setAttribute('aria-hidden','false');
      if (from === indexView) indexView.classList.add('is-hidden');
      else projectView.classList.remove('is-visible');
      setNav('about');
    });
  }
  function closeAbout() {
    if (!aboutView.classList.contains('is-visible') || transitionBusy) return;
    zoomBetween(aboutView,indexView,() => {
      aboutView.classList.remove('is-visible');
      aboutView.setAttribute('aria-hidden','true');
      indexView.classList.remove('is-hidden');
      setNav('index');
    });
    activeProject = null;
  }
  function setNav(active) {
    indexButton.classList.toggle('is-active',active==='index');
    aboutButton.classList.toggle('is-active',active==='about');
  }

  // focus wheel / keyboard
  let focusWheelLock = false;
  focusView.addEventListener('wheel',(e) => {
    e.preventDefault();
    if (focusWheelLock || transitionBusy) return;
    focusWheelLock = true;
    stepFocus(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => {focusWheelLock=false;},650);
  },{passive:false});

  window.addEventListener('keydown',(e) => {
    if (focusView.classList.contains('is-visible')) {
      if (e.key === 'Escape') closeFocus();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') stepFocus(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') stepFocus(-1);
      return;
    }
    if (e.key === 'Escape' && aboutView.classList.contains('is-visible')) closeAbout();
  });

  indexButton.addEventListener('click',() => {
    if (aboutView.classList.contains('is-visible')) closeAbout();
    else showIndex();
  });
  homeButton.addEventListener('click',() => {
    if (focusView.classList.contains('is-visible')) closeFocus();
    else if (aboutView.classList.contains('is-visible')) closeAbout();
    else showIndex();
  });
  backButton.addEventListener('click',() => showIndex());
  aboutButton.addEventListener('click',openAbout);
  aboutClose.addEventListener('click',closeAbout);
  focusClose.addEventListener('click',closeFocus);

  window.addEventListener('wheel',onWheel,{passive:false});
  window.addEventListener('resize',() => { measureIndex(); measureArchive(); scheduleIndexSnap(80); });
  window.addEventListener('popstate',() => {
    const id = location.hash.replace('#','');
    if (id && projects.some((p)=>p.id===id)) {
      const project = projects.find((p)=>p.id===id);
      populateProject(project);
      indexView.classList.add('is-hidden');
      projectView.classList.add('is-visible');
      setNav('');
      prepareProjectFixedEntrance();
      requestAnimationFrame(() => { revealArchiveCards(80); playProjectFixedEntrance(); measureArchive(); setTimeout(startArchivePreviewScroll,200); });
    } else {
      projectView.classList.remove('is-visible');
      indexView.classList.remove('is-hidden');
      setNav('index');
    }
  });


  // ---------------------------------------------------------------------------
  // Pointer-edge autopan
  // ---------------------------------------------------------------------------
  window.addEventListener('pointermove', (e) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    pointerInside = true;
  }, {passive:true});
  document.documentElement.addEventListener('mouseleave', () => {
    pointerInside = false;
    if (edgeIndexActive) scheduleIndexSnap(120);
    if (edgeArchiveActive) scheduleArchiveSnap(140);
    edgeIndexActive = false;
    edgeArchiveActive = false;
  });

  function edgeStrength(position, size, zoneRatio = .16) {
    const zone = size * zoneRatio;
    if (position < zone) return -Math.pow(clamp((zone - position) / zone, 0, 1), 1.7);
    if (position > size - zone) return Math.pow(clamp((position - (size - zone)) / zone, 0, 1), 1.7);
    return 0;
  }

  function runEdgeAutopan() {
    const desktop = window.innerWidth > 850;
    let homeActiveNow = false;
    let archiveActiveNow = false;

    if (desktop && pointerInside && !transitionBusy && !focusView.classList.contains('is-visible')) {
      if (!indexView.classList.contains('is-hidden') && !aboutView.classList.contains('is-visible')) {
        const forceX = edgeStrength(pointerX, window.innerWidth, .15);
        if (Math.abs(forceX) > .015) {
          homeActiveNow = true;
          clearTimeout(indexSnapTimer);
          clearIndexHover();
          // left edge -> earlier projects; right edge -> later projects
          targetX = clamp(targetX - forceX * 2.15, minIndexX, maxIndexX);
          indexMotionEnergy = Math.min(1, indexMotionEnergy + Math.abs(forceX) * .035);
        }
      } else if (projectView.classList.contains('is-visible')) {
        const forceY = edgeStrength(pointerY, window.innerHeight, .17);
        if (Math.abs(forceY) > .015) {
          archiveActiveNow = true;
          if (autoScrollFrame) cancelAutoScroll();
          clearTimeout(archiveSnapTimer);
          ++archiveScrollAnimToken;
          archiveProgrammatic = false;
          const next = clamp(projectScroll.scrollTop + forceY * 2.1, 0, archiveMetrics.maxScroll);
          if (Math.abs(next - projectScroll.scrollTop) > .01) {
            projectScroll.scrollTop = next;
            requestArchiveMotion();
          }
        }
      }
    }

    if (edgeIndexActive && !homeActiveNow) scheduleIndexSnap(130);
    if (edgeArchiveActive && !archiveActiveNow) scheduleArchiveSnap(150);
    edgeIndexActive = homeActiveNow;
    edgeArchiveActive = archiveActiveNow;
    requestAnimationFrame(runEdgeAutopan);
  }
  requestAnimationFrame(runEdgeAutopan);

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function safePushState(state, url) {
    try { history.pushState(state, '', url); } catch (_) { if (String(url).startsWith('#')) location.hash = String(url).slice(1); }
  }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function easeInOutCubic(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  function nextFrame(){ return new Promise((resolve)=>requestAnimationFrame(resolve)); }
  function escapeHTML(value='') {
    return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }
  function containRect(box, ratio) {
    let width = box.width;
    let height = width / ratio;
    if (height > box.height) { height = box.height; width = height * ratio; }
    return { left:box.left+(box.width-width)/2, top:box.top+(box.height-height)/2, width, height };
  }

  renderIndex();
  animateIndex();

  const initialId = location.hash.replace('#','');
  if (initialId && projects.some((p)=>p.id===initialId)) {
    const project = projects.find((p)=>p.id===initialId);
    populateProject(project);
    indexView.classList.add('is-hidden');
    projectView.classList.add('is-visible');
    projectView.setAttribute('aria-hidden','false');
    setNav('');
    prepareProjectFixedEntrance();
    requestAnimationFrame(() => { revealArchiveCards(80); playProjectFixedEntrance(); measureArchive(); setTimeout(startArchivePreviewScroll,500); });
  }
})();
