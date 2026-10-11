let Gallery3D = null;
let galleryModuleError = null;

const galleryModulePromise = import("./scene.js?v=95")
  .then((module) => { Gallery3D = module.default; })
  .catch((error) => {
    galleryModuleError = error;
    document.documentElement.dataset.galleryError = error?.message || "Three.js module failed to load";
  });

const $ = (id) => document.getElementById(id);
const pad = (value) => String(value).padStart(2, "0");
const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
const waitForTransition = async (result, minimum, maximum = 1800) => {
  if (!result || typeof result.then !== "function") {
    await wait(minimum);
    return;
  }
  await Promise.all([
    wait(minimum),
    Promise.race([result.catch(() => undefined), wait(maximum)])
  ]);
};

const sourceProjects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
const allProjects = sourceProjects.filter((project) => project.id !== "places-i-enjoy");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const elements = {
  canvas: $("webglCanvas"),
  fallback: $("webglFallback"),
  loading: $("loadingScreen"),
  loadingCount: $("loadingCount"),
  home: $("homeButton"),
  work: $("workButton"),
  info: $("infoButton"),
  index: $("indexButton"),
  workUI: $("workUI"),
  infoUI: $("infoUI"),
  ringUI: $("ringUI"),
  ringCenter: document.querySelector(".ring-preview-center"),
  ringOverline: $("ringOverline"),
  ringTitle: $("ringTitle"),
  ringSummary: $("ringSummary"),
  ringMeta: $("ringMeta"),
  ringViewProject: $("ringViewProjectButton"),
  detailUI: $("detailUI"),
  activeCopy: $("activeCopy"),
  activeCourse: $("activeCourse"),
  activeTitle: $("activeTitle"),
  activeSummary: $("activeSummary"),
  viewProject: $("viewProjectButton"),
  filters: $("courseFilters"),
  activeNumber: $("activeNumber"),
  projectTotal: $("projectTotal"),
  accessibleProjects: $("accessibleProjects"),
  infoWork: $("infoWorkButton"),
  infoIndex: $("infoIndexButton"),
  detailCopy: $("detailCopy"),
  detailOverline: $("detailOverline"),
  detailTitle: $("detailTitle"),
  detailSummary: $("detailSummary"),
  detailNotes: $("detailNotes"),
  detailLinks: $("detailLinks"),
  detailMediaHit: $("detailMediaHit"),
  detailMediaLinks: $("detailMediaLinks"),
  detailCaption: $("detailCaption"),
  detailImageCount: $("detailImageCount"),
  detailScrollThumb: $("detailScrollThumb"),
  detailClose: $("detailClose"),
  previous: $("previousProject"),
  next: $("nextProject"),
  indexOverlay: $("indexOverlay"),
  indexClose: $("indexClose"),
  indexList: $("indexList")
};

const filterDefinitions = [
  ["all", "All"],
  ["cdw", "CDW"],
  ["mapping", "Mapping"],
  ["research", "Research"]
];

let gallery = null;
let activeFilter = "all";
let visibleProjects = [...allProjects];
let currentProject = visibleProjects[0] || null;
let currentIndex = 0;
let transitionToken = 0;
let loadingFrame = 0;
let loadingStart = performance.now();
let routeFromHistory = false;
let detailPointer = null;
let detailSwitchInFlight = false;
let detailMotionFrame = 0;

function setView(view) {
  document.body.dataset.view = view;
  const workVisible = view === "work";
  const ringVisible = view === "ring";
  const detailVisible = view === "detail" || view === "detail-exit";

  elements.workUI.setAttribute("aria-hidden", String(!workVisible));
  elements.infoUI.setAttribute("aria-hidden", String(view !== "info"));
  elements.ringUI.setAttribute("aria-hidden", String(!ringVisible));
  elements.detailUI.setAttribute("aria-hidden", String(!detailVisible));
  elements.indexOverlay.setAttribute("aria-hidden", String(view !== "index"));

  elements.work.classList.toggle("is-active", view === "work");
  elements.info.classList.toggle("is-active", view === "info");
  elements.index.classList.toggle("is-active", view === "index");
}

function setRoute(route, { replace = false } = {}) {
  if (routeFromHistory) return;
  const next = route ? `#${route}` : `${location.pathname}${location.search}`;
  if ((route && location.hash === next) || (!route && !location.hash)) return;
  history[replace ? "replaceState" : "pushState"]({}, "", next);
}

function renderFilters() {
  elements.filters.replaceChildren();
  filterDefinitions.forEach(([value, label]) => {
    const count = value === "all"
      ? allProjects.length
      : allProjects.filter((project) => project.course === value).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button depth-button";
    button.classList.toggle("is-active", value === activeFilter);
    button.dataset.filter = value;
    button.setAttribute("aria-pressed", String(value === activeFilter));
    button.innerHTML = `${label}<span>${pad(count)}</span>`;
    button.addEventListener("click", () => applyFilter(value));
    elements.filters.appendChild(button);
    attachDepthEffect(button);
  });
}

function renderAccessibleProjects() {
  elements.accessibleProjects.replaceChildren();
  visibleProjects.forEach((project) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = project.title;
    button.addEventListener("click", () => openRing(project.id));
    elements.accessibleProjects.appendChild(button);
  });
}

function applyFilter(filter, preferredId = null) {
  activeFilter = filterDefinitions.some(([value]) => value === filter) ? filter : "all";
  visibleProjects = activeFilter === "all"
    ? [...allProjects]
    : allProjects.filter((project) => project.course === activeFilter);

  if (!visibleProjects.length) visibleProjects = [...allProjects];
  const preferred = visibleProjects.find((project) => project.id === preferredId) || visibleProjects[0];
  currentProject = preferred;
  currentIndex = Math.max(0, visibleProjects.indexOf(preferred));

  renderFilters();
  renderAccessibleProjects();
  updateActiveCopy(preferred, currentIndex, visibleProjects.length, true);
  gallery?.setProjects(visibleProjects, preferred?.id);
}

function updateActiveCopy(project, index = 0, total = visibleProjects.length, immediate = false) {
  if (!project) return;
  const changed = currentProject?.id !== project.id;
  currentProject = project;
  currentIndex = Number.isFinite(index)
    ? Math.max(0, Math.min(visibleProjects.length - 1, index))
    : Math.max(0, visibleProjects.findIndex((item) => item.id === project.id));

  const render = () => {
    elements.activeCourse.textContent = `${project.number} · ${project.courseName}`;
    elements.activeTitle.textContent = project.title;
    elements.activeSummary.textContent = project.summary;
    elements.activeNumber.textContent = pad(currentIndex + 1);
    elements.projectTotal.textContent = pad(total || visibleProjects.length);
    elements.viewProject.setAttribute("aria-label", `Preview ${project.title}`);
  };

  render();
  if (!immediate && changed && !reducedMotion) {
    elements.activeCopy.getAnimations().forEach((animation) => animation.cancel());
    elements.activeCopy.animate([
      { clipPath: "inset(100% 0 0 0)", transform: "translateY(18px)" },
      { clipPath: "inset(0 0 0 0)", transform: "translateY(0)" }
    ], { duration: 560, easing: "cubic-bezier(.16,1,.3,1)" });
  }
}

function renderRing(project) {
  if (!project) return;
  elements.ringOverline.textContent = `${project.number} / ${pad(visibleProjects.length)} · ${project.courseName}`;
  elements.ringTitle.textContent = project.fullTitle || project.title;
  elements.ringTitle.dataset.projectId = project.id;
  elements.ringSummary.textContent = project.summary;
  elements.ringMeta.textContent = `${project.kicker} · ${project.year}`;
  elements.ringViewProject.setAttribute("aria-label", `View ${project.fullTitle || project.title}`);
  requestAnimationFrame(syncRingCopyBounds);
}

function syncRingCopyBounds() {
  if (!elements.ringCenter) return;
  const canvasHeight = Math.max(elements.canvas?.clientHeight || window.innerHeight, 1);
  const viewHeight = Math.max(gallery?.viewHeight || 9, 1);
  const pixelsPerWorldUnit = canvasHeight / viewHeight;
  // The ring shader's inner ellipse is 2.24 × 2.08 world units in radius.
  // Keep copy inside a smaller inscribed area so no line touches the rim.
  const holeWidth = 4.48 * pixelsPerWorldUnit;
  const holeHeight = 4.16 * pixelsPerWorldUnit;
  const safeWidth = Math.max(72, Math.min(holeWidth * 0.78, window.innerWidth * 0.82, 460));
  const safeHeight = Math.max(72, holeHeight * 0.72);

  elements.ringCenter.style.setProperty("--ring-copy-width", `${safeWidth.toFixed(1)}px`);
  elements.ringCenter.style.setProperty("--ring-copy-scale", "1");
  requestAnimationFrame(() => {
    const contentHeight = Math.max(elements.ringCenter.scrollHeight, 1);
    const scale = Math.min(1, safeHeight / contentHeight);
    elements.ringCenter.style.setProperty("--ring-copy-scale", scale.toFixed(4));
  });
}

function normalizeActiveChange(projectOrIndex, maybeIndex, maybeTotal) {
  let project = projectOrIndex;
  let index = maybeIndex;
  let total = maybeTotal;

  if (typeof projectOrIndex === "number") {
    index = projectOrIndex;
    project = visibleProjects[index];
  } else if (typeof projectOrIndex === "string") {
    project = visibleProjects.find((item) => item.id === projectOrIndex);
  } else if (projectOrIndex?.project) {
    project = projectOrIndex.project;
    index = projectOrIndex.index;
    total = projectOrIndex.total;
  }

  if (!project) return;
  // The ribbon's dormant position can still report an active card while a
  // detail transition is running. It must never overwrite the project owned
  // by the centred detail card, otherwise Previous/Next starts from the wrong
  // item even though the visible copy is correct.
  if (["detail", "detail-transition", "detail-exit"].includes(document.body.dataset.view)) return;
  if (!Number.isFinite(index)) index = visibleProjects.findIndex((item) => item.id === project.id);
  updateActiveCopy(project, index, total || visibleProjects.length);
  if (document.body.dataset.view === "ring") renderRing(project);
}

function handleRingChange(project, index, total = visibleProjects.length) {
  if (!project) return;
  const wasRing = document.body.dataset.view === "ring";
  updateActiveCopy(project, index, total, !wasRing);
  setView("ring");
  renderRing(project);
  setRoute(`preview/${project.id}`, { replace: wasRing });
}

function handleEngineRingClose() {
  setView("work");
  setRoute("", { replace: true });
}

function renderIndex() {
  elements.indexList.replaceChildren();
  const groups = [
    ["Computational Design Workflows", allProjects.filter((project) => project.course === "cdw")],
    ["Mapping Systems", allProjects.filter((project) => project.course === "mapping")],
    ["Design Research", allProjects.filter((project) => project.course === "research")]
  ];

  groups.forEach(([label, projects]) => {
    const section = document.createElement("section");
    section.className = "index-group";
    const heading = document.createElement("p");
    heading.className = "index-group__heading";
    heading.innerHTML = `<span>${label}</span><span>${pad(projects.length)}</span>`;
    section.appendChild(heading);

    projects.forEach((project) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "index-row depth-button";
      row.innerHTML = `
        <span class="index-row__number">${project.number}</span>
        <span class="index-row__title">${project.fullTitle || project.title}</span>
        <span class="index-row__meta">${project.kicker}</span>
        <span class="index-row__arrow">↗</span>
      `;
      row.addEventListener("click", () => {
        if (!visibleProjects.some((item) => item.id === project.id)) applyFilter("all", project.id);
        openRing(project.id);
      });
      section.appendChild(row);
      attachDepthEffect(row);
    });

    elements.indexList.appendChild(section);
  });
}

function setMaskedDetailText(element, text, innerClass) {
  element.replaceChildren();
  const inner = document.createElement("span");
  inner.className = innerClass;
  inner.textContent = text;
  inner.style.transform = reducedMotion ? "translateY(0)" : "translateY(115%)";
  element.appendChild(inner);
  return inner;
}

function splitDetailSummaryIntoLines(text, { prime = true } = {}) {
  const summary = elements.detailSummary;
  const normalized = String(text || "").trim();
  summary.replaceChildren();
  summary.dataset.text = normalized;
  summary.setAttribute("aria-label", normalized);
  if (!normalized) return [];

  const words = normalized.split(/\s+/);
  const probes = words.map((word, index) => {
    const probe = document.createElement("span");
    probe.className = "detail-line-probe";
    probe.textContent = `${word}${index < words.length - 1 ? " " : ""}`;
    summary.appendChild(probe);
    return probe;
  });

  const lines = [];
  probes.forEach((probe, index) => {
    const top = Math.round(probe.getBoundingClientRect().top);
    const previous = lines.at(-1);
    if (!previous || Math.abs(previous.top - top) > 2) lines.push({ top, words: [] });
    lines.at(-1).words.push(words[index]);
  });

  summary.replaceChildren();
  return lines.map((line) => {
    const mask = document.createElement("span");
    mask.className = "detail-line-mask";
    mask.setAttribute("aria-hidden", "true");
    const inner = document.createElement("span");
    inner.className = "detail-line-text";
    inner.textContent = line.words.join(" ");
    inner.style.transform = prime && !reducedMotion ? "translateY(115%)" : "translateY(0)";
    mask.appendChild(inner);
    summary.appendChild(mask);
    return inner;
  });
}

function animateDetailContent() {
  if (elements.detailUI.dataset.layout === "full-media") return;
  const title = elements.detailTitle.querySelector(".detail-title__inner");
  const lines = [...elements.detailSummary.querySelectorAll(".detail-line-text")];
  const metadata = [
    elements.detailOverline.querySelector(".detail-overline__inner"),
    ...elements.detailNotes.querySelectorAll(".detail-note__inner"),
    ...elements.detailLinks.querySelectorAll(".detail-link")
  ].filter(Boolean);
  const captionLines = [elements.detailCaption, elements.detailImageCount];
  const animated = [title, ...lines, ...metadata, ...captionLines].filter(Boolean);
  animated.forEach((element) => element.getAnimations().forEach((animation) => animation.cancel()));

  if (reducedMotion) {
    animated.forEach((element) => { element.style.transform = "translateY(0)"; });
    return;
  }

  const rise = (element, delay, duration, easing) => {
    if (!element) return;
    const animation = element.animate([
      { transform: "translateY(115%)" },
      { transform: "translateY(0)" }
    ], { delay, duration, easing, fill: "both" });
    animation.finished.then(() => {
      element.style.transform = "translateY(0)";
      animation.cancel();
    }).catch(() => undefined);
  };

  // The image wipe is driven by the WebGL shader. Text follows on separate
  // masked tracks so no content block fades or floats in as one unit.
  rise(title, 55, 470, "cubic-bezier(.12,.82,.16,1)");
  lines.forEach((line, index) => {
    rise(line, 145 + index * 52, 410, "cubic-bezier(.16,1,.3,1)");
  });
  const metadataStart = 260 + lines.length * 42;
  metadata.forEach((item, index) => {
    rise(item, metadataStart + index * 34, 360, "cubic-bezier(.16,1,.3,1)");
  });
  captionLines.forEach((item, index) => {
    rise(item, metadataStart + 70 + index * 38, 330, "cubic-bezier(.16,1,.3,1)");
  });
}

function renderDetail(project) {
  if (!project) return;
  elements.detailMediaLinks.replaceChildren();
  (project.imageLinks || []).forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "detail-media-link";
    anchor.href = link.href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.setAttribute("aria-label", link.label);
    anchor.title = link.label;
    anchor.hidden = true;
    anchor.linkRegion = link;
    elements.detailMediaLinks.appendChild(anchor);
  });
  const fullMedia = project.detailLayout === "full-media";
  elements.detailUI.dataset.layout = fullMedia ? "full-media" : "split";
  elements.detailUI.setAttribute("aria-label", project.fullTitle || project.title);
  elements.detailCopy.setAttribute("aria-hidden", String(fullMedia));
  elements.detailMediaHit.setAttribute("aria-label", `Scroll ${project.title} images`);
  if (fullMedia) {
    // The portfolio pages contain their own typography and explanations.
    // Do not duplicate them in a sidebar or overlay additional captions.
    elements.detailOverline.replaceChildren();
    elements.detailTitle.replaceChildren();
    elements.detailSummary.replaceChildren();
    elements.detailSummary.dataset.text = "";
    elements.detailNotes.replaceChildren();
    elements.detailLinks.replaceChildren();
    syncDetailViewport(true);
    return;
  }
  setMaskedDetailText(
    elements.detailOverline,
    `${project.number} / ${pad(allProjects.length)} · ${project.courseName} · ${project.year}`,
    "detail-overline__inner"
  );
  setMaskedDetailText(elements.detailTitle, project.fullTitle || project.title, "detail-title__inner");
  splitDetailSummaryIntoLines(project.statement || project.summary);
  elements.detailNotes.replaceChildren();
  elements.detailLinks.replaceChildren();

  (project.meta || []).forEach(([label, value]) => {
    const note = document.createElement("dl");
    note.className = "detail-note";
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    const inner = document.createElement("div");
    inner.className = "detail-note__inner";
    inner.style.transform = reducedMotion ? "translateY(0)" : "translateY(115%)";
    term.textContent = label;
    description.textContent = value;
    inner.append(term, description);
    note.appendChild(inner);
    elements.detailNotes.appendChild(note);
  });

  (project.links || []).forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "detail-link depth-button";
    anchor.href = link.url;
    anchor.innerHTML = `<span>${link.label}</span><span aria-hidden="true">↗</span>`;
    anchor.style.transform = reducedMotion ? "translateY(0)" : "translateY(115%)";
    if (/^https?:/i.test(link.url)) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    elements.detailLinks.appendChild(anchor);
    attachDepthEffect(anchor);
  });

  const firstImage = project.images?.[0];
  elements.detailCaption.textContent = firstImage?.[1] || project.title;
  elements.detailImageCount.textContent = `${project.kicker || project.courseName} · 01 / ${pad(project.images?.length || 1)}`;
  [elements.detailCaption, elements.detailImageCount].forEach((element) => {
    element.style.transform = reducedMotion ? "translateY(0)" : "translateY(115%)";
  });
  elements.detailScrollThumb.style.transform = "translateY(0)";
  syncDetailViewport(true);
}

function syncDetailViewport(force = false) {
  if (!gallery || (!force && document.body.dataset.view !== "detail")) return;
  const rect = elements.detailMediaHit.getBoundingClientRect();
  gallery.setDetailViewport?.({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom
  });
}

function syncDetailMediaLinks() {
  for (const anchor of elements.detailMediaLinks.children) {
    const region = anchor.linkRegion;
    const image = gallery?.getDetailMediaBounds?.(region.imageIndex);
    if (!image || document.body.dataset.view !== "detail") {
      anchor.hidden = true;
      continue;
    }
    const [x, y, w, h] = region.bounds;
    const width = image.width * w;
    const height = Math.max(32, image.height * h);
    const left = image.left + image.width * x;
    const top = image.top + image.height * y - (height - image.height * h) * 0.5;
    anchor.hidden = top + height <= 0 || top >= elements.detailMediaHit.clientHeight;
    anchor.style.left = `${left}px`;
    anchor.style.top = `${top}px`;
    anchor.style.width = `${width}px`;
    anchor.style.height = `${height}px`;
  }
}

function syncDetailCardMotion() {
  if (gallery && elements.detailUI) {
    const view = document.body.dataset.view;
    const isDetailView = view === "detail" || view === "detail-exit";
    const canvasWidth = Math.max(elements.canvas.clientWidth, 1);
    const pixelsPerWorldUnit = canvasWidth / Math.max(gallery.viewWidth || 1, 1);
    const swipePixels = isDetailView
      ? (gallery.detailSwipe || 0) * pixelsPerWorldUnit
      : 0;
    elements.detailUI.style.setProperty("--detail-swipe-x", `${swipePixels.toFixed(2)}px`);

    // Keep project copy and imagery fixed while the card itself is dragged.
    // The moving card bounds become the reveal mask; content is replaced only
    // after release, when Gallery3D commits the neighboring project.
    const panelRect = gallery._detailActivePanelWorld?.().rect
      || gallery._detailPanelWorld?.().rect;
    if (panelRect && isDetailView) {
      const movingLeft = panelRect.left;
      const movingRight = movingLeft + panelRect.width;
      const applyMovingClip = (element, prefix) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const left = Math.min(rect.width, Math.max(0, movingLeft - rect.left));
        const right = Math.min(rect.width, Math.max(0, rect.right - movingRight));
        elements.detailUI.style.setProperty(`--${prefix}-clip-left`, `${left.toFixed(2)}px`);
        elements.detailUI.style.setProperty(`--${prefix}-clip-right`, `${right.toFixed(2)}px`);
      };
      applyMovingClip(elements.detailCopy, "detail-copy");
      applyMovingClip(elements.detailMediaHit, "detail-media");
      const mediaState = gallery.getDetailMediaState?.();
      if (mediaState) {
        const caption = elements.detailCaption.parentElement;
        const viewportHeight = elements.detailMediaHit.clientHeight;
        const inset = 18;
        const top = Math.max(inset, Math.min(viewportHeight, mediaState.bottomPixels)
          - caption.offsetHeight - inset);
        elements.detailMediaHit.style.setProperty("--detail-caption-top", `${top.toFixed(2)}px`);
      }
    } else {
      elements.detailUI.style.setProperty("--detail-copy-clip-left", "0px");
      elements.detailUI.style.setProperty("--detail-copy-clip-right", "0px");
      elements.detailUI.style.setProperty("--detail-media-clip-left", "0px");
      elements.detailUI.style.setProperty("--detail-media-clip-right", "0px");
    }
  }
  syncDetailMediaLinks();
  detailMotionFrame = requestAnimationFrame(syncDetailCardMotion);
}

function updateDetailMedia(payload, maybeTotal, maybeCaption, maybeProgress) {
  let index = 0;
  let total = currentProject?.images?.length || 1;
  let caption = currentProject?.images?.[0]?.[1] || currentProject?.title || "";
  let progress = 0;

  if (typeof payload === "object" && payload) {
    index = payload.index ?? payload.activeIndex ?? 0;
    total = payload.total ?? total;
    caption = payload.caption ?? payload.alt ?? caption;
    progress = payload.progress ?? (total > 1 ? index / (total - 1) : 0);
  } else {
    index = Number(payload) || 0;
    total = Number(maybeTotal) || total;
    caption = maybeCaption || caption;
    progress = Number.isFinite(maybeProgress) ? maybeProgress : (total > 1 ? index / (total - 1) : 0);
  }

  const oneBased = Math.max(1, Math.min(total, index + 1));
  elements.detailCaption.textContent = caption;
  elements.detailImageCount.textContent = `${currentProject?.kicker || currentProject?.courseName || "Project"} · ${pad(oneBased)} / ${pad(total)}`;
  const travel = Math.max(0, elements.detailMediaHit.clientHeight - 88);
  elements.detailScrollThumb.style.transform = `translateY(${Math.max(0, Math.min(1, progress)) * travel * .82}px)`;
}

function handleDetailProjectChange(project, index) {
  if (!project || currentProject?.id === project.id) return;
  currentProject = project;
  currentIndex = Number.isFinite(index)
    ? index
    : visibleProjects.findIndex((item) => item.id === project.id);
  renderDetail(project);
  setRoute(project.id, { replace: true });
  requestAnimationFrame(animateDetailContent);
}

async function openProject(id, { replaceRoute = false } = {}) {
  const project = allProjects.find((item) => item.id === id);
  if (!project) return;
  if (!gallery) {
    const fallbackLink = project.links?.[0]?.url;
    if (fallbackLink) location.href = fallbackLink;
    return;
  }

  if (!visibleProjects.some((item) => item.id === id)) applyFilter("all", id);
  currentProject = project;
  currentIndex = visibleProjects.findIndex((item) => item.id === id);
  renderDetail(project);

  const token = ++transitionToken;
  setView("detail-transition");
  gallery.setEnabled?.(true);
  const engineTransition = gallery.openDetail(id);
  setRoute(id, { replace: replaceRoute });

  await waitForTransition(engineTransition, reducedMotion ? 20 : 690);
  if (token !== transitionToken) return;
  setView("detail");
  requestAnimationFrame(() => {
    syncDetailViewport();
    animateDetailContent();
  });
  elements.detailClose.focus({ preventScroll: true });
}

async function openRing(id, { replaceRoute = false } = {}) {
  const project = allProjects.find((item) => item.id === id);
  if (!project) return;
  if (!visibleProjects.some((item) => item.id === id)) applyFilter("all", id);

  currentProject = project;
  currentIndex = visibleProjects.findIndex((item) => item.id === id);
  updateActiveCopy(project, currentIndex, visibleProjects.length, true);
  renderRing(project);

  const token = ++transitionToken;
  document.body.classList.remove("is-ring-closing");
  document.body.classList.add("is-ring-opening");
  gallery?.setEnabled?.(true);
  const transition = gallery?.openRing?.(id) ?? gallery?.showAbout?.(true);
  setView("ring");
  setRoute(`preview/${id}`, { replace: replaceRoute });
  await waitForTransition(transition, reducedMotion ? 20 : 180, 1700);
  document.body.classList.remove("is-ring-opening");
  if (token !== transitionToken || document.body.dataset.view !== "ring") return;
  elements.ringViewProject.focus({ preventScroll: true });
}

async function closeRing({ replaceRoute = true } = {}) {
  const token = ++transitionToken;
  document.body.classList.remove("is-ring-opening");
  document.body.classList.add("is-ring-closing");
  const transition = gallery?.closeRing?.();
  setRoute("", { replace: replaceRoute });
  if (!transition) gallery?.setMode?.("work");
  await waitForTransition(transition, reducedMotion ? 20 : 160, 1500);
  if (token !== transitionToken) {
    document.body.classList.remove("is-ring-closing");
    return;
  }
  setView("work");
  document.body.classList.remove("is-ring-closing");
  elements.viewProject.focus({ preventScroll: true });
}

async function closeProject({ replaceRoute = true } = {}) {
  const token = ++transitionToken;
  setView("detail-exit");
  const engineTransition = gallery?.closeDetail({ returnTo: "ring" });
  setRoute(currentProject ? `preview/${currentProject.id}` : "", { replace: replaceRoute });
  if (!reducedMotion) {
    elements.detailCopy.getAnimations().forEach((animation) => animation.cancel());
    elements.detailCopy.animate([
      { transform: "translateY(0)", clipPath: "inset(0 0 0 0)" },
      { transform: "translateY(34px)", clipPath: "inset(100% 0 0 0)" }
    ], { duration: 320, easing: "cubic-bezier(.55,0,.8,.45)" });
    await wait(350);
    if (token !== transitionToken) return;
    setView("detail-transition");
  }
  await waitForTransition(engineTransition, reducedMotion ? 20 : 270);
  if (token !== transitionToken) return;
  gallery?.setMode("ring");
  renderRing(currentProject);
  setView("ring");
  elements.ringViewProject.focus({ preventScroll: true });
}

async function switchProject(direction) {
  if (!currentProject || document.body.dataset.view !== "detail" || detailSwitchInFlight) return;
  const sourceIndex = visibleProjects.findIndex((project) => project.id === currentProject.id);
  const nextIndex = (sourceIndex + direction + visibleProjects.length) % visibleProjects.length;
  const nextProject = visibleProjects[nextIndex];
  if (!nextProject) return;

  detailSwitchInFlight = true;
  setRoute(nextProject.id, { replace: true });

  if (!gallery?.switchDetail) {
    currentProject = nextProject;
    currentIndex = nextIndex;
    renderDetail(nextProject);
    requestAnimationFrame(animateDetailContent);
    detailSwitchInFlight = false;
    return;
  }

  try {
    await gallery.switchDetail(nextProject.id, direction);
    // The WebGL carousel normally commits through handleDetailProjectChange.
    // Keep a fallback for interrupted or reduced-motion transitions.
    if (currentProject?.id !== nextProject.id) {
      currentProject = nextProject;
      currentIndex = nextIndex;
      renderDetail(nextProject);
    }
  } finally {
    detailSwitchInFlight = false;
  }
}

function openWork({ replaceRoute = false } = {}) {
  ++transitionToken;
  gallery?.setEnabled?.(true);
  if (document.body.dataset.view === "ring") gallery?.closeRing?.();
  else gallery?.setMode("work");
  setView("work");
  setRoute("", { replace: replaceRoute });
}

function openInfo({ replaceRoute = false } = {}) {
  // INFO is an entry point into the current project's immersive context.
  // It deliberately uses the same continuous ribbon-to-ring transition as a
  // card click, rather than switching to the former static info panel.
  if (currentProject) return openRing(currentProject.id, { replaceRoute });
  return openWork({ replaceRoute });
}

function openIndex({ replaceRoute = false } = {}) {
  ++transitionToken;
  gallery?.setEnabled?.(false);
  setView("index");
  setRoute("index", { replace: replaceRoute });
  elements.indexClose.focus({ preventScroll: true });
}

function route() {
  routeFromHistory = true;
  const value = decodeURIComponent(location.hash.slice(1));
  if (value === "info") openInfo({ replaceRoute: true });
  else if (value === "index") openIndex({ replaceRoute: true });
  else if (value.startsWith("preview/") && allProjects.some((project) => project.id === value.slice(8))) {
    openRing(value.slice(8), { replaceRoute: true });
  }
  else if (allProjects.some((project) => project.id === value)) openProject(value, { replaceRoute: true });
  else openWork({ replaceRoute: true });
  routeFromHistory = false;
}

function attachDepthEffect(element) {
  if (!element || element.dataset.depthReady) return;
  element.dataset.depthReady = "true";

  element.addEventListener("pointermove", (event) => {
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
    element.style.setProperty("--px", `${(x * 100).toFixed(1)}%`);
    element.style.setProperty("--py", `${(y * 100).toFixed(1)}%`);
    element.style.setProperty("--shadow-x", `${((x - .5) * -7).toFixed(2)}px`);
    element.style.setProperty("--shadow-y", `${((y - .5) * -7).toFixed(2)}px`);
    element.style.setProperty("--shadow-x-inverse", `${((x - .5) * 7).toFixed(2)}px`);
    element.style.setProperty("--shadow-y-inverse", `${((y - .5) * 7).toFixed(2)}px`);
    element.style.setProperty("--text-x", `${((x - .5) * 1.8).toFixed(2)}px`);
    element.style.setProperty("--text-y", `${((y - .5) * 1.8).toFixed(2)}px`);
  });

  element.addEventListener("pointerenter", () => element.classList.add("is-depth-hover"));
  element.addEventListener("pointerleave", () => {
    element.classList.remove("is-depth-hover", "is-pressed");
    element.style.removeProperty("--text-x");
    element.style.removeProperty("--text-y");
  });
  element.addEventListener("pointerdown", () => element.classList.add("is-pressed"));
  element.addEventListener("pointerup", () => element.classList.remove("is-pressed"));
}

function bindDetailInput() {
  elements.detailMediaHit.addEventListener("wheel", (event) => {
    if (document.body.dataset.view !== "detail") return;
    event.preventDefault();
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    gallery?.scrollDetail(delta);
  }, { passive: false });

  elements.detailMediaHit.addEventListener("pointerdown", (event) => {
    if (document.body.dataset.view !== "detail" || event.button !== 0) return;
    detailPointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      axis: null,
      velocityX: 0
    };
    // A stationary press on a page link must retain native anchor behavior.
    // Capture it only if the user starts dragging, so swipes never open it.
    if (!event.target.closest(".detail-media-link")) {
      elements.detailMediaHit.setPointerCapture(event.pointerId);
    }
  });

  elements.detailMediaHit.addEventListener("pointermove", (event) => {
    gallery?.addRipplePoint?.(event.clientX, event.clientY);
    if (!detailPointer || detailPointer.id !== event.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - detailPointer.lastX;
    const dy = event.clientY - detailPointer.lastY;
    const totalX = event.clientX - detailPointer.startX;
    const totalY = event.clientY - detailPointer.startY;
    if (!detailPointer.axis && Math.hypot(totalX, totalY) > 7) {
      detailPointer.axis = Math.abs(totalX) > Math.abs(totalY) ? "x" : "y";
      if (!elements.detailMediaHit.hasPointerCapture(event.pointerId)) {
        elements.detailMediaHit.setPointerCapture(event.pointerId);
      }
      if (detailPointer.axis === "x") gallery?.beginDetailDrag?.();
    }
    if (detailPointer.axis === "x") {
      detailPointer.velocityX = dx / Math.max(8, now - detailPointer.lastTime) * 1000;
      gallery?.dragDetail(dx, detailPointer.velocityX);
    } else if (detailPointer.axis === "y") {
      gallery?.scrollDetail(-dy * 1.3);
    }
    detailPointer.lastX = event.clientX;
    detailPointer.lastY = event.clientY;
    detailPointer.lastTime = now;
  });

  const finish = (event) => {
    if (!detailPointer || detailPointer.id !== event.pointerId) return;
    if (detailPointer.axis === "x") {
      if (gallery?.endDetailDrag) gallery.endDetailDrag(detailPointer.velocityX);
      else gallery?.dragDetail(0, detailPointer.velocityX);
    }
    if (elements.detailMediaHit.hasPointerCapture(event.pointerId)) {
      elements.detailMediaHit.releasePointerCapture(event.pointerId);
    }
    detailPointer = null;
  };
  elements.detailMediaHit.addEventListener("pointerup", finish);
  elements.detailMediaHit.addEventListener("pointercancel", finish);
}

function bindInterface() {
  elements.home.addEventListener("click", () => openWork());
  elements.work.addEventListener("click", () => openWork());
  elements.info.addEventListener("click", () => openInfo());
  elements.index.addEventListener("click", () => openIndex());
  elements.infoWork.addEventListener("click", () => openWork());
  elements.infoIndex.addEventListener("click", () => openIndex());
  elements.indexClose.addEventListener("click", () => openWork());
  elements.detailClose.addEventListener("click", () => closeProject());
  elements.viewProject.addEventListener("click", () => currentProject && openRing(currentProject.id));
  elements.ringViewProject.addEventListener("click", () => currentProject && openProject(currentProject.id));
  elements.previous.addEventListener("click", () => switchProject(-1));
  elements.next.addEventListener("click", () => switchProject(1));

  document.querySelectorAll(".depth-button").forEach(attachDepthEffect);
  bindDetailInput();

  window.addEventListener("resize", () => {
    gallery?.resize();
    requestAnimationFrame(syncDetailViewport);
    requestAnimationFrame(syncRingCopyBounds);
  }, { passive: true });
  window.addEventListener("popstate", route);

  document.addEventListener("keydown", (event) => {
    const view = document.body.dataset.view;
    if (event.key === "Escape") {
      if (view === "detail" || view === "detail-transition") closeProject();
      else if (view === "ring") closeRing();
      else if (view === "info" || view === "index") openWork();
      return;
    }
    if (view === "detail") {
      if (event.key === "ArrowLeft") switchProject(-1);
      else if (event.key === "ArrowRight") switchProject(1);
      else if (event.key === "ArrowUp") gallery?.scrollDetail(-160);
      else if (event.key === "ArrowDown") gallery?.scrollDetail(160);
      return;
    }
    if (view === "work") {
      if (event.key === "ArrowLeft") gallery?.previous?.();
      else if (event.key === "ArrowRight") gallery?.next?.();
      else if (event.key === "Enter" && currentProject) openRing(currentProject.id);
    } else if (view === "ring") {
      if (event.key === "ArrowLeft") gallery?.previous?.();
      else if (event.key === "ArrowRight") gallery?.next?.();
      else if (event.key === "Enter" && currentProject) openProject(currentProject.id);
    }
  });
}

function tickLoading(now) {
  const elapsed = now - loadingStart;
  const progress = Math.min(96, Math.round((1 - Math.exp(-elapsed / 760)) * 100));
  elements.loadingCount.textContent = String(progress).padStart(3, "0");
  if (document.body.classList.contains("is-loading")) loadingFrame = requestAnimationFrame(tickLoading);
}

function finishLoading() {
  cancelAnimationFrame(loadingFrame);
  elements.loadingCount.textContent = "100";
  window.setTimeout(() => document.body.classList.remove("is-loading"), reducedMotion ? 0 : 180);
}

function showFallback(error) {
  console.error(error);
  elements.fallback.hidden = false;
  elements.canvas.hidden = true;
  finishLoading();
  openIndex({ replaceRoute: true });
}

async function boot() {
  await galleryModulePromise;
  if (!Gallery3D) {
    showFallback(galleryModuleError || new Error("The Three.js gallery could not be loaded."));
    return;
  }
  if (!allProjects.length) {
    showFallback(new Error("No projects were found."));
    return;
  }

  requestAnimationFrame(tickLoading);
  renderFilters();
  renderAccessibleProjects();
  renderIndex();
  updateActiveCopy(currentProject, 0, visibleProjects.length, true);
  bindInterface();

  try {
    let ready = false;
    gallery = new Gallery3D({
      canvas: elements.canvas,
      projects: visibleProjects,
      onActiveChange: normalizeActiveChange,
      onSelect: (projectOrId) => openRing(typeof projectOrId === "string" ? projectOrId : projectOrId?.id),
      onRingChange: handleRingChange,
      onRingClose: handleEngineRingClose,
      onDetailProjectChange: handleDetailProjectChange,
      onDetailMediaChange: updateDetailMedia,
      onReady: () => {
        ready = true;
        finishLoading();
      },
      onError: showFallback
    });
    cancelAnimationFrame(detailMotionFrame);
    detailMotionFrame = requestAnimationFrame(syncDetailCardMotion);
    document.fonts?.ready?.then(() => requestAnimationFrame(syncRingCopyBounds));
    if (new URLSearchParams(location.search).has("qa")) {
      const publishQAState = () => {
        const rect = elements.canvas.getBoundingClientRect();
        elements.canvas.dataset.qaState = JSON.stringify({
          mode: gallery.mode,
          ringMix: gallery.ringMix,
          ringTarget: gallery.ringTarget,
          ringEntryOffsetX: gallery.ringEntryOffsetX,
          transitionOffsetX: gallery.continuumMesh?.material.uniforms.uTransitionOffsetX.value,
          viewWidth: gallery.viewWidth,
          viewHeight: gallery.viewHeight,
          canvas: [elements.canvas.clientWidth, elements.canvas.clientHeight],
          tests: {
            top: gallery._isRingBand({ x: rect.width * 0.5, y: 105 }),
            left: gallery._isRingBand({ x: 320, y: rect.height * 0.5 }),
            hole: gallery._isRingBand({ x: rect.width * 0.5, y: rect.height * 0.5 }),
            bottom: gallery._isRingBand({ x: rect.width * 0.5, y: rect.height - 70 })
          }
        });
      };
      publishQAState();
      window.setInterval(publishQAState, 180);
      elements.canvas.addEventListener("pointerup", (event) => {
        const rect = elements.canvas.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        elements.canvas.dataset.qaPointer = JSON.stringify({
          client: [event.clientX, event.clientY],
          point,
          ringBand: gallery._isRingBand(point),
          mode: gallery.mode
        });
      }, true);
    }
    route();
    await wait(4200);
    if (!ready && document.body.classList.contains("is-loading")) finishLoading();
  } catch (error) {
    showFallback(error);
  }
}

boot();
