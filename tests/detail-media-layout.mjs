import assert from 'node:assert/strict';
import Gallery3D from '../js/scene.js';

// Exercise the layout without a browser/GPU. Rendering is separately checked
// against original PNG pixels in the browser.
function makeGallery(width, height, aspects) {
  const gallery = Object.create(Gallery3D.prototype);
  gallery.detailScroll = 0;
  gallery.detailScrollTarget = 0;
  gallery.detailScrollVelocity = 0;
  gallery.detailSwipeVelocity = 0;
  gallery.detailMeshes = aspects.map(imageAspect => ({ userData: { imageAspect } }));
  gallery._detailViewportWorld = () => ({
    width, height, centerX: 0, centerY: 0,
    rect: { width: width * 100, height: height * 100 }
  });
  return gallery;
}

for (const [width, height] of [[7.12, 7.62], [3.62, 3.66], [10, 4]]) {
  const aspects = [1, 2045 / 2200, 1.616, 3.2, 0.45];
  const gallery = makeGallery(width, height, aspects);
  const metrics = gallery._detailMediaMetrics();
  for (let i = 0; i < aspects.length; i++) {
    const layout = gallery._detailLayout(i);
    assert.equal(layout.scale.x, width, 'All images must have the same width');
    assert(Math.abs(layout.scale.x / layout.scale.y - aspects[i]) < 1e-10,
      'Image planes must retain the full original aspect ratio');
    assert.equal(layout.position.z, 0, 'Perspective must not change individual image widths');
    assert.equal(layout.opacity, 1, 'Scrolling must not fade or darken documentary images');
    if (i) {
      assert(Math.abs(metrics.items[i].top - metrics.items[i - 1].top
        - metrics.items[i - 1].height - metrics.gap) < 1e-10,
      'Natural-height images must retain consistent spacing');
    }
  }
  gallery.setDetailScroll(Number.MAX_VALUE);
  assert.equal(gallery.detailScrollTarget, metrics.maxScroll);
  gallery.detailScroll = gallery.detailScrollTarget;
  const last = gallery._detailLayout(aspects.length - 1);
  assert(Math.abs(last.position.y - last.scale.y / 2 + height / 2) < 1e-10,
    'The final image bottom must be reachable');
  assert.equal(gallery.getDetailMediaState().progress, 1);
}

const portrait = makeGallery(6, 4, [0.5]);
assert(portrait._detailMediaMetrics().maxScroll > 0,
  'A single tall image must scroll even when there is no second image');
const landscape = makeGallery(6, 4, [3]);
assert.equal(landscape._detailMediaMetrics().maxScroll, 0);
assert.equal(landscape.getDetailMediaState().index, 0);
const empty = makeGallery(6, 4, []);
assert.equal(empty._detailMediaMetrics().maxScroll, 0);
assert.equal(empty.getDetailMediaState().total, 0);
console.log('Detail media layout: full aspect ratios, equal widths, spacing and scroll bounds passed.');
