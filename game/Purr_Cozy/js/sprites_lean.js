/* ============================================================
   Pet "Michael" lean: ready-made sprite images
   assets/sprites/cat_lean1.png ... cat_lean6.png, dog_lean1.png ... dog_lean6.png
   A pet standing on its hind legs with its top hat on, leaning forward 7.5, 15, 22.5, 30,
   37.5 and 45 degrees. Made once from the standing pose with RotSprite (3x Scale2x up, rotate
   around the feet, sample back down, fresh outline), so nothing is rotated while the game runs.
   The images use the pet palette: they are turned back into palette letters when loaded, so
   every coat colour is applied the same way as all other pet sprites. You can repaint them;
   keep the size and the feet where they are (LEAN_ANCHOR: the feet pivot inside each image).
   If the images cannot be read (opening index.html straight from disk), the show falls back to
   turning the standing sprite.
   ============================================================ */
const LEAN_ANCHOR = {cat: [[7,  28],  [6,  27],  [5,  26],  [4,  24],  [3,  22],  [3,  20]],  dog: [[7,  28],  [5,  27],  [4,  26],  [3,  24],  [3,  22],  [3,  20]]};
const LEAN_HAT = ['#3b3346', '#fff4e0', '#5a5070'];
const LEAN_GRID = { cat: [], dog: [] }, LEAN_CACHE = {};
(function load() {
  for (const c of LEAN_HAT) palAdd(c);   // the hat colours map back to palette letters too
  for (const kind of ['cat', 'dog']) for (let n = 1; n <= 6; n++) {
    const img = new Image();
    img.onload = () => { try { LEAN_GRID[kind][n] = Grid.fromImage(img); for (const k in LEAN_CACHE) delete LEAN_CACHE[k]; } catch (e) { /* file:// cannot read pixels */ } };
    img.src = 'assets/sprites/' + kind + '_lean' + n + '.png';
  }
})();
// frame n (1..6) for a pet, as a canvas plus where its feet pivot is; null while the image is not there
function petLeanCanvas(kind, color, flip, n) {
  const g = LEAN_GRID[kind] && LEAN_GRID[kind][n]; if (!g) return null;
  const key = kind + '|' + color + '|' + (flip ? 1 : 0) + '|' + n; if (LEAN_CACHE[key]) return LEAN_CACHE[key];
  const [ax, ay] = LEAN_ANCHOR[kind][n - 1];
  let out = g; const map = PET_COLORS[kind][color]; if (map) out = out.recolor(map); if (flip) out = out.flip();
  return LEAN_CACHE[key] = { cv: out.toCanvas(), ax: flip ? g.w - ax : ax, ay };
}
