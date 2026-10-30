/* ============================================================
   Paper-doll avatar
   Layers (back to front): back item → body (skin, bottom, top, outer, shoes, neck item)
   → head (back hair, skull, face, fringe) → hat, glasses, earrings.
   Every layer paints with its own placeholder colour keys; the chosen colours are applied
   at the end with one palette map, so each part can take any colour.
   The canvas is 20×36: the head sits 6 rows lower than the old 20×30 sprite to leave room for tall hats.
   ============================================================ */
const AVA_TOP = 6;
let _lkNext = 0xE000;
const LK = (hex) => { const k = String.fromCharCode(_lkNext++); PAL[k] = hex; const n = parseInt(hex.slice(1), 16); PAL_RGBA[k] = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]; return k; };
const K = {};
for (const [n, hex] of [['t1', '#3c5a8c'], ['t2', '#5f86c0'], ['t3', '#93b6e0'], ['ta', '#2e2230'], ['tb', '#fff4e0'], ['b1', '#3a3550'], ['b2', '#575070'], ['b3', '#77708f'],
  ['s1', '#4a3540'], ['s2', '#6e4231'], ['s3', '#9a6249'], ['o1', '#7a3045'], ['o2', '#c4566e'], ['o3', '#ee8fa0'], ['h1', '#7a3045'], ['h2', '#c4566e'], ['h3', '#ee8fa0'], ['ha', '#fff4e0'],
  ['g1', '#2e2230'], ['gl', '#bcd8f2'], ['e1', '#f6c75a'], ['n1', '#7a3045'], ['n2', '#c4566e'], ['n3', '#ee8fa0'], ['k1', '#5e3b2f'], ['k2', '#8b5a3c'], ['k3', '#b5794b'], ['i1', '#3b2a37'], ['i2', '#7a5aa8']]) K[n] = LK(hex);

// ---------- colour tables ----------
const SKINS = {
  porcelain: ['#fde8da', '#efc8b2', '#cc9a83', I18n.s("u_2a85c6c2bf80")], fair: ['#f9dcc6', '#e9b99c', '#c48c72', I18n.s("u_f92e99c8f4b2")], peach: ['#f6cfae', '#e2a789', '#b97a62', I18n.s("u_9d50afb813da")], warm: ['#efc39a', '#d99f77', '#ad7553', I18n.s("u_c4fc833f8b55")],
  tan: ['#e8b48e', '#c68a6a', '#9a6249', I18n.s("u_811462c882d4")], olive: ['#d6a87c', '#b58660', '#8a6244', I18n.s("u_dc3bc25414a7")], caramel: ['#c68a6a', '#a36c4f', '#7d4f38', I18n.s("u_b48a73caec46")], brown: ['#a8714f', '#8a5a3e', '#6a432d', I18n.s("u_3eb2456f3b9b")],
  deep: ['#8a5a3e', '#6e4231', '#4e2e22', I18n.s("u_723c5f3202bf")], ebony: ['#6b4330', '#553324', '#3a2219', I18n.s("u_b6f73c034ad6")], mint: ['#cfe8d6', '#a9cfb6', '#7fa88c', I18n.s("u_f8622c94cce4")], lilac: ['#e0d4f0', '#c3b1e0', '#9a86bc', I18n.s("u_9a67087eae83")],
};
const HAIRC = {
  cocoa: ['#3d2620', '#6b4030', '#96603f', I18n.s("u_bafe359f5ed0")], ink: ['#1a1420', '#2e2a36', '#4b4560', I18n.s("u_59650f41f74b")], espresso: ['#24160f', '#3d2618', '#5e3b2f', I18n.s("u_d243a7e5aa40")], chestnut: ['#4a2a1b', '#7a4428', '#a8633a', I18n.s("u_10cb79937328")],
  auburn: ['#5a1f17', '#8a3424', '#b85338', I18n.s("u_10aa7d61af44")], ginger: ['#8f4230', '#c46a48', '#e59a72', I18n.s("u_b94543f15a21")], copper: ['#8a4a18', '#c0702a', '#e8973d', I18n.s("u_759c83f30dfe")], honey: ['#b86a2a', '#e8973d', '#f6c75a', I18n.s("u_7b026c56a424")],
  blonde: ['#c49a3a', '#e8c565', '#f8e3a0', I18n.s("u_3c1e31a193cd")], platinum: ['#c9bfa6', '#e6dfcc', '#fbf8ef', I18n.s("u_a883d3ec17ef")], snow: ['#9e9aa8', '#cfcbd6', '#f2f0f6', I18n.s("u_5178e158d4dc")], grey: ['#5c5866', '#8a8694', '#b8b4c2', I18n.s("u_bfd9489948d9")],
  rose: ['#7a3045', '#c4566e', '#ee8fa0', I18n.s("u_a6664df1efc8")], pink: ['#c46a8a', '#ee9ab8', '#fbd0e0', I18n.s("u_b31cef7bef41")], lilac: ['#4b3470', '#7a5aa8', '#b496dc', I18n.s("u_68e9b02c08eb")], violet: ['#2d1f52', '#4b3470', '#7a5aa8', I18n.s("u_f48bebbe0585")],
  sky: ['#2c3a63', '#4a6aa8', '#7ea6dc', I18n.s("u_014f0e43dc16")], navy: ['#141d38', '#233259', '#3d5087', I18n.s("u_1a7dfe29ce49")], mint: ['#3f8f6a', '#6fc49a', '#b8e8cc', I18n.s("u_ae506736a67b")], teal: ['#245a5c', '#3f8f8a', '#84cbbd', I18n.s("u_490a4727e4fd")],
  green: ['#2f5a3d', '#4c8a4f', '#7fbf6a', I18n.s("u_757156234235")], red: ['#6a1420', '#a82a38', '#d85a62', I18n.s("u_7fc93a318670")],
};
const CLOTH = {
  snow: ['#c9c4bd', '#ece8e2', '#ffffff', I18n.s("u_3366645622a7")], cream: ['#d8c1a0', '#efdcc0', '#fff4e0', I18n.s("u_ed3cdb192a56")], oat: ['#b49c7c', '#d4bc9c', '#efdcc0', I18n.s("u_521c15e6533b")], khaki: ['#8a7a4e', '#b5a26a', '#d6c78f', I18n.s("u_2f3bbaa117c2")],
  cocoa: ['#5e3b2f', '#8b5a3c', '#b5794b', I18n.s("u_bafe359f5ed0")], choco: ['#3d261d', '#5e3b2f', '#7d5240', I18n.s("u_73b9e5c79733")], coal: ['#1a1420', '#3b3646', '#5c5668', I18n.s("u_59650f41f74b")], grey: ['#6a6676', '#9a96a6', '#c6c2d0', I18n.s("u_bfd9489948d9")],
  navy: ['#1f2b4d', '#2f3f6e', '#4a5f96', I18n.s("u_006706beb4b5")], denim: ['#3c5a8c', '#5f86c0', '#93b6e0', I18n.s("u_eeceda777b89")], sky: ['#5c95cf', '#8bbbe8', '#c3dcf5', I18n.s("u_014f0e43dc16")], teal: ['#245a5c', '#3f8f8a', '#84cbbd', I18n.s("u_483426ff49bb")],
  mint: ['#5fa88d', '#9fd3bf', '#d3ece1', I18n.s("u_ae506736a67b")], sage: ['#6b8a5a', '#93b07f', '#c0d6ac', I18n.s("u_50cbb376ac47")], olive: ['#4a5229', '#6b7638', '#8f9b4f', I18n.s("u_dc3bc25414a7")], forest: ['#2f4a3b', '#3f6a4f', '#5f8f6c', I18n.s("u_3bfbf21e2f00")],
  lemon: ['#d3a33a', '#f3cf6a', '#fbe8a8', I18n.s("u_5e3cd6bef7d2")], mustard: ['#8a6418', '#b8892a', '#dcae45', I18n.s("u_45a4bc35a0a1")], orange: ['#b8552a', '#e8833d', '#f6b37a', I18n.s("u_09ee69958977")], coral: ['#9c3b34', '#d4594d', '#ee8071', I18n.s("u_87af97154b23")],
  red: ['#7a1f2a', '#b8323e', '#e0606a', I18n.s("u_7fc93a318670")], wine: ['#4a1426', '#6e2238', '#94344f', I18n.s("u_b9ddacdd9518")], rose: ['#a8455a', '#d36f86', '#f2a7b7', I18n.s("u_a6664df1efc8")], blush: ['#d88a9a', '#f3b9c4', '#fde2e7', I18n.s("u_0a48ef4193d0")],
  lilac: ['#7a5aa8', '#b496dc', '#ddd0f2', I18n.s("u_68e9b02c08eb")], purple: ['#3d2a66', '#5a3f94', '#8466c4', I18n.s("u_3d0158cb7cfd")], lavender: ['#8c84b8', '#b6aee0', '#e0dbf6', I18n.s("u_850aaaeaa26c")], butter: ['#c9a13a', '#f6c75a', '#fdeaa0', I18n.s("u_6dbd7586795d")],
};
const EYEC = { brown: ['#3b2a37', '#7a4f3a'], dark: ['#1a1420', '#3b2a37'], hazel: ['#5a4020', '#9a7a3a'], green: ['#2f5a3d', '#6faa5a'], blue: ['#2c3a63', '#5c95cf'], grey: ['#4b4560', '#9a96a6'],
  violet: ['#3d2a66', '#8466c4'], red: ['#6a1420', '#c8404c'], gold: ['#8a6418', '#e8b840'], pink: ['#8a3459', '#e08fb2'] };
const EYEC_N = { brown: I18n.s("u_3eb2456f3b9b"), dark: I18n.s("u_59650f41f74b"), hazel: I18n.s("u_086e20a9fb17"), green: I18n.s("u_a45a872a1d38"), blue: I18n.s("u_b7918951a1b9"), grey: I18n.s("u_bfd9489948d9"), violet: I18n.s("u_3d0158cb7cfd"), red: I18n.s("u_7fc93a318670"), gold: I18n.s("u_3c1e31a193cd"), pink: I18n.s("u_d00069a5d3b5") };

// ---------- face parts ----------
// eye patterns are 3×3, drawn for the left eye at (5,8) and mirrored for the right eye at (10,8); side view uses the right eye at (11,8)
const EYES = {
  round: { n: I18n.s("u_71f2658949ef"), p: ['...', 'D0.', '.0.'] }, dot: { n: I18n.s("u_b5b48d4bd809"), p: ['...', '.0.', '.0.'] }, bean: { n: I18n.s("u_0045d3cade66"), p: ['...', '.00', '.00'] },
  shiny: { n: I18n.s("u_d0ec7c83dccb"), p: ['...', '.0Z', '.ii'] }, big: { n: I18n.s("u_9e76ca0f9b77"), p: ['000', '0Zi', '0ii'] }, doe: { n: I18n.s("u_e006c3d94bf8"), p: ['.00', '0Zi', '0ij'] },
  lashes: { n: I18n.s("u_0cacead8135c"), p: ['0..', '.00', '.ii'] }, cat: { n: I18n.s("u_882f3c4e988d"), p: ['..0', '.0i', '.i.'] }, droopy: { n: I18n.s("u_2ce33d0fc4b5"), p: ['...', '00.', '.ii'] },
  sleepy: { n: I18n.s("u_d52732f840e5"), p: ['...', '...', '000'] }, calm: { n: I18n.s("u_fc7ec41d2c0b"), p: ['...', '.00', '...'] }, smiley: { n: I18n.s("u_88386a7ada2c"), p: ['...', '.0.', '0.0'] },
  wink: { n: I18n.s("u_580df4b9aed1"), p: ['...', 'D0.', '.0.'], right: ['...', '.0.', '0.0'] }, star: { n: I18n.s("u_3e1c5aca9d8f"), p: ['.j.', 'jZj', '.j.'] }, heart: { n: I18n.s("u_35fca5b73ad1"), p: ['r.r', 'rrr', '.r.'] },
  tiny: { n: I18n.s("u_73701ab57438"), p: ['...', '.0.', '...'] }, surprised: { n: I18n.s("u_6c4367f512f1"), p: ['.0.', '0Z0', '.0.'] }, cross: { n: I18n.s("u_56743c42be69"), p: ['0..', '.0.', '0..'] },
  teary: { n: I18n.s("u_a0667387ed42"), p: ['...', '.0.', 'p.0'] }, glint: { n: I18n.s("u_ced9591087b7"), p: ['Z0.', '0i.', '...'] }, narrow: { n: I18n.s("u_bd1a190cfdd9"), p: ['...', '000', '...'] },
  spiral: { n: I18n.s("u_08d2138f81b3"), p: ['00.', '0.0', '.00'] }, side: { n: I18n.s("u_1b922fdf2289"), p: ['...', '00.', '...'] }, gem: { n: I18n.s("u_c561bc88632f"), p: ['.i.', 'iZj', '.j.'] },
};
const BROWS = {
  soft: { n: I18n.s("u_37e717d5998d"), p: ['....', '.OO.'] }, none: { n: I18n.s("u_da5930e53d54"), p: [] }, thin: { n: I18n.s("u_05fcd5de3a10"), p: ['....', 'OOO.'] }, thick: { n: I18n.s("u_b20f5e682cdd"), p: ['.OO.', 'OOOO'] },
  arched: { n: I18n.s("u_15df99f58de5"), p: ['.OO.', 'O...'] }, angry: { n: I18n.s("u_eb5d6b09afa8"), p: ['OO..', '..OO'] }, worried: { n: I18n.s("u_7600376d5cd5"), p: ['..OO', 'OO..'] }, dots: { n: I18n.s("u_601b77f24369"), p: ['....', '.O..'] },
  short: { n: I18n.s("u_ca894c225207"), p: ['....', '..OO'] }, low: { n: I18n.s("u_43bcafb63f3b"), p: ['....', 'OOOO'] }, raised: { n: I18n.s("u_c82a18b17f97"), p: ['.OO.', '....'] }, bold: { n: I18n.s("u_669dc08dbb61"), p: ['OOOO', 'OOOO'] },
};
// mouths are 4×2 at (7,12)
const MOUTHS = {
  smile: { n: I18n.s("u_b4678e512cca"), p: ['..E.', '....'] }, grin: { n: I18n.s("u_0f7bb921e06d"), p: ['0000', '.rr.'] }, happy: { n: I18n.s("u_10aef138c661"), p: ['E..E', '.EE.'] }, open: { n: I18n.s("u_5a6ae5565461"), p: ['.00.', '.rr.'] },
  cat: { n: I18n.s("u_d84d33385cd5"), p: ['0..0', '.00.'] }, oo: { n: I18n.s("u_98e2a5348f54"), p: ['.00.', '.00.'] }, tongue: { n: I18n.s("u_f56016646d8f"), p: ['0000', '.rs.'] }, smirk: { n: I18n.s("u_ea12b9a8a8eb"), p: ['...E', '.EE.'] },
  flat: { n: I18n.s("u_8451c297011e"), p: ['.EE.', '....'] }, frown: { n: I18n.s("u_942ee2f035ed"), p: ['.EE.', 'E..E'] }, laugh: { n: I18n.s("u_7a655569d7aa"), p: ['0000', '0rr0'] }, teeth: { n: I18n.s("u_3ec546dced88"), p: ['0ZZ0', '.00.'] },
  pout: { n: I18n.s("u_902a4e4289fa"), p: ['.r..', 'r...'] }, fang: { n: I18n.s("u_069d62715ada"), p: ['0000', '.Z..'] }, kiss: { n: I18n.s("u_02c3c395d266"), p: ['.r..', '.r..'] }, wow: { n: I18n.s("u_4ebe60233060"), p: ['.00.', '0rr0'] },
  lips: { n: I18n.s("u_2dfd315cd4b2"), p: ['.rr.', '.rr.'] }, wobble: { n: I18n.s("u_ad353ac8ff79"), p: ['.0.0', '0.0.'] },
};
const CHEEKS = {
  blush: { n: I18n.s("u_2f9a16ace790"), f: [[4, 11, 's'], [13, 11, 's']] }, none: { n: I18n.s("u_da5930e53d54"), f: [] }, wide: { n: I18n.s("u_7348c19ec9cd"), f: [[3, 11, 's'], [4, 11, 's'], [5, 11, 't'], [12, 11, 't'], [13, 11, 's'], [14, 11, 's']] },
  freckles: { n: I18n.s("u_c5fa4f24494c"), f: [[4, 11, 'D'], [5, 12, 'D'], [3, 12, 'D'], [13, 11, 'D'], [12, 12, 'D'], [14, 12, 'D']] }, mole_l: { n: I18n.s("u_b6b67108b2dc"), f: [[5, 12, '0'], [4, 11, 's'], [13, 11, 's']] },
  mole_r: { n: I18n.s("u_3e60cdeb5ad0"), f: [[12, 12, '0'], [4, 11, 's'], [13, 11, 's']] }, bandaid: { n: I18n.s("u_78bbbfb00984"), f: [[12, 11, 'f'], [13, 11, 'g'], [14, 11, 'f'], [4, 11, 's']] },
  star: { n: I18n.s("u_6502f2984069"), f: [[13, 10, 'w'], [12, 11, 'w'], [13, 11, 'x'], [14, 11, 'w'], [13, 12, 'w']] }, heart: { n: I18n.s("u_5ff0d940d607"), f: [[3, 11, 'r'], [5, 11, 'r'], [4, 12, 'r'], [4, 11, 'r']] },
  sweat: { n: I18n.s("u_c5f140ef1235"), f: [[14, 7, 'p'], [14, 8, 'o'], [4, 11, 's'], [13, 11, 's']] }, whisker: { n: I18n.s("u_5a3762e345f9"), f: [[3, 11, '0'], [4, 12, '0'], [14, 11, '0'], [13, 12, '0']] }, glitter: { n: I18n.s("u_5bd397e2c5df"), f: [[4, 10, 'Z'], [13, 10, 'Z'], [3, 12, 'x'], [14, 12, 'x']] },
};
// ---------- hair ----------
// fringe = bottom row of the bangs for x 4..13 (front view)
const FRINGES = {
  short: { n: I18n.s("u_d9f05bc317f7"), f: [8, 7, 6, 6, 7, 6, 6, 7, 6, 7] }, none: { n: I18n.s("u_f03808028916"), f: [5, 4, 4, 4, 4, 4, 4, 4, 4, 5] }, straight: { n: I18n.s("u_80d81d429665"), f: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7] },
  heavy: { n: I18n.s("u_a0b9dfc6a54c"), f: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8] }, sideL: { n: I18n.s("u_7ce2e7fbb39c"), f: [8, 8, 7, 7, 6, 6, 5, 5, 5, 5] }, sideR: { n: I18n.s("u_aa36d6658971"), f: [5, 5, 5, 5, 6, 6, 7, 7, 8, 8] },
  center: { n: I18n.s("u_8dd8b4c97194"), f: [7, 7, 6, 5, 4, 4, 5, 6, 7, 7] }, curtain: { n: I18n.s("u_5c404197c356"), f: [8, 7, 6, 5, 4, 4, 5, 6, 7, 8] }, spiky: { n: I18n.s("u_5506d79e8612"), f: [7, 5, 7, 5, 7, 5, 7, 5, 7, 5] },
  wavy: { n: I18n.s("u_50ee41e0ab20"), f: [7, 6, 7, 7, 6, 7, 7, 6, 7, 7] }, buzz: { n: I18n.s("u_e1cb82999c88"), f: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], buzz: true }, messy: { n: I18n.s("u_eaa31b97f44c"), f: [7, 6, 8, 6, 7, 5, 8, 6, 7, 6] },
  mshape: { n: I18n.s("u_06ba7e689ad1"), f: [7, 7, 6, 7, 7, 7, 7, 6, 7, 7] }, swoop: { n: I18n.s("u_2dbc7a6d3292"), f: [5, 5, 6, 6, 7, 7, 8, 8, 7, 6] }, ahoge: { n: I18n.s("u_5d0f37cc41bb"), f: [7, 6, 6, 7, 6, 6, 7, 6, 6, 7], ahoge: true },
  pomp: { n: I18n.s("u_e90e247bcaf9"), f: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], pomp: true },
};
// back: side = bottom row of side locks in front view, back = bottom row seen from behind, extras = tails/buns
const BACKS = {
  short: { n: I18n.s("u_a4fafad3771f"), side: 9, back: 12 }, pixie: { n: I18n.s("u_5701b4f8cb36"), side: 8, back: 11 }, bob: { n: I18n.s("u_82e9970779d9"), side: 14, back: 14 }, lob: { n: I18n.s("u_192df8e8a2b5"), side: 16, back: 16 },
  long: { n: I18n.s("u_95e6b8e8eed6"), side: 19, back: 19 }, xlong: { n: I18n.s("u_0f4cf30e628d"), side: 21, back: 21 }, wavy: { n: I18n.s("u_b92108dd1d2d"), side: 19, back: 19, wave: true }, hime: { n: I18n.s("u_d1f92e6953ec"), side: 15, back: 20, hime: true },
  ponyH: { n: I18n.s("u_ea017d6e5436"), side: 9, back: 11, tail: 'high' }, ponyL: { n: I18n.s("u_144aa5f2f1e5"), side: 9, back: 12, tail: 'low' }, twintail: { n: I18n.s("u_55b02653eef9"), side: 9, back: 12, twin: true },
  bun: { n: I18n.s("u_525a83645f66"), side: 9, back: 11, bun: 'top' }, twinbun: { n: I18n.s("u_83b79098083d"), side: 9, back: 11, bun: 'twin' }, lowbun: { n: I18n.s("u_62ecefd03a45"), side: 9, back: 12, bun: 'low' },
  braid: { n: I18n.s("u_aa527c5dc401"), side: 10, back: 12, braid: 1 }, twinbraid: { n: I18n.s("u_e9095c7c6d19"), side: 10, back: 12, braid: 2 }, sidepony: { n: I18n.s("u_e3b6fe4ef5f5"), side: 9, back: 12, sidepony: true },
  curly: { n: I18n.s("u_004f7cac00d9"), side: 13, back: 14, curly: true },
};
// ---------- clothes ----------
const TOPS = {
  tee: { n: I18n.s("u_abdb14eaa774"), sl: 'short' }, longtee: { n: I18n.s("u_f287e1217093"), sl: 'long' }, tank: { n: I18n.s("u_23cc45d3c75d"), sl: 'none', tank: true }, crop: { n: I18n.s("u_dbd89e984c60"), sl: 'short', crop: true },
  polo: { n: I18n.s("u_d9eaa7aa4b51"), sl: 'short', collar: true, buttons: 2 }, shirt: { n: I18n.s("u_34f436182bbe"), sl: 'long', collar: true, buttons: 5 }, hoodie: { n: I18n.s("u_436c9b3cbf79"), sl: 'long', hood: true, pocket: true },
  sweater: { n: I18n.s("u_4db0b8f384e0"), sl: 'long', pat: 'knit' }, cardigan: { n: I18n.s("u_b0e362030954"), sl: 'long', outer: 'open' }, vest: { n: I18n.s("u_471e7769432c"), sl: 'long', vest: true },
  sailor: { n: I18n.s("u_5b03317bc3f1"), sl: 'short', sailor: true }, kimono: { n: I18n.s("u_c525b05bf60b"), sl: 'long', kimono: true }, jersey: { n: I18n.s("u_59724569d2c0"), sl: 'short', pat: 'side' },
  stripe: { n: I18n.s("u_9711e3e9d529"), sl: 'short', pat: 'hstripe' }, breton: { n: I18n.s("u_7d1beb985383"), sl: 'long', pat: 'hstripe2' }, raglan: { n: I18n.s("u_a085bfd33e64"), sl: 'long', raglan: true },
  puff: { n: I18n.s("u_b21848fe4583"), sl: 'puff' }, turtle: { n: I18n.s("u_5c2e45e4719e"), sl: 'long', turtle: true }, offsh: { n: I18n.s("u_271c6355f0e0"), sl: 'short', off: true },
  denimjk: { n: I18n.s("u_ffcdb5ad2869"), sl: 'long', outer: 'jacket', pockets: true }, blazer: { n: I18n.s("u_e61eca22f9f4"), sl: 'long', outer: 'blazer' }, coat: { n: I18n.s("u_97e307c55bde"), sl: 'long', outer: 'coat' },
  apron: { n: I18n.s("u_436c6b55f387"), sl: 'short', apron: true }, school: { n: I18n.s("u_2176ec46b07c"), sl: 'long', outer: 'blazer', tie: true }, varsity: { n: I18n.s("u_5107911be3fc"), sl: 'long', outer: 'jacket', raglan: true },
  raincoat: { n: I18n.s("u_c9c1e6e1309d"), sl: 'long', outer: 'coat', shiny: true }, heart: { n: I18n.s("u_4ee5a699424b"), sl: 'short', print: 'heart' }, startee: { n: I18n.s("u_82ce658bc7db"), sl: 'short', print: 'star' },
  plaid: { n: I18n.s("u_f6feb60e6826"), sl: 'long', collar: true, pat: 'plaid' }, dots: { n: I18n.s("u_f8b8543563a1"), sl: 'short', pat: 'dots' }, band: { n: I18n.s("u_fd760bb28c1f"), sl: 'short', pat: 'band' },
  dress: { n: I18n.s("u_5448c29c35a7"), sl: 'short', dress: 'short' }, gown: { n: I18n.s("u_49760c314d39"), sl: 'puff', dress: 'long' }, overalldress: { n: I18n.s("u_f64485e316fc"), sl: 'short', dress: 'short', apron: true },
};
const BOTTOMS = {
  pants: { n: I18n.s("u_7a3ee2a6a9a5"), legs: 'full' }, jeans: { n: I18n.s("u_3f64a468427d"), legs: 'full', cuff: true }, cargo: { n: I18n.s("u_5e762adadde5"), legs: 'full', pockets: true }, slacks: { n: I18n.s("u_31699d3f2d24"), legs: 'full', crease: true },
  joggers: { n: I18n.s("u_af8cf3ef9ea3"), legs: 'full', band: true }, shorts: { n: I18n.s("u_7d6cc7470ac3"), legs: 'none' }, bermuda: { n: I18n.s("u_64676bedb943"), legs: 'half' }, skirt: { n: I18n.s("u_4d8d600abc56"), legs: 'none', skirt: 1 },
  pleated: { n: I18n.s("u_3de8a6f4f2a6"), legs: 'none', skirt: 1, pleat: true }, tutu: { n: I18n.s("u_34c1a0507d53"), legs: 'none', skirt: 2 }, longskirt: { n: I18n.s("u_579a7fd8f0ca"), legs: 'fill', skirt: 1 },
  overalls: { n: I18n.s("u_6dd50dcc641a"), legs: 'full', bib: true }, leggings: { n: I18n.s("u_5298a88c371f"), legs: 'full', tight: true }, hakama: { n: I18n.s("u_5ec8c3dcf346"), legs: 'fill', skirt: 1, pleat: true },
  skort: { n: I18n.s("u_46b137e270f8"), legs: 'none', skirt: 1, pleat: false },
};
const SHOES = {
  sneakers: { n: I18n.s("u_ce5254793476") }, canvas: { n: I18n.s("u_34cfb485fce6"), toe: true }, boots: { n: I18n.s("u_e1191beaa4d2"), boot: 1 }, tall: { n: I18n.s("u_84ed89a6b320"), boot: 2 }, rain: { n: I18n.s("u_531c2eff66ce"), boot: 2, shiny: true },
  sandals: { n: I18n.s("u_1e4fccfb4373"), sandal: true }, slippers: { n: I18n.s("u_5c7e5a670073"), fluffy: true }, loafers: { n: I18n.s("u_e4a424ebf0de"), dot: true }, mary: { n: I18n.s("u_39ad147052d8"), strap: true },
  socks: { n: I18n.s("u_85b344543571"), sock: 1 }, knee: { n: I18n.s("u_ed22c39b9a3b"), sock: 2 }, flats: { n: I18n.s("u_829d2ddc64dc") }, bare: { n: I18n.s("u_b06364168d34"), bare: true }, heels: { n: I18n.s("u_f1ea3728d427"), heel: true },
};
// ---------- accessories (head coords: 18×22 head grid; negative rows go into the space above) ----------
const HATS = {
  none: { n: I18n.s("u_da5930e53d54") }, beanie: { n: I18n.s("u_811b8fa8b1cf") }, cap: { n: I18n.s("u_638c334ae181") }, backcap: { n: I18n.s("u_35cb6c65dafb") }, beret: { n: I18n.s("u_64faaaecb375") }, bucket: { n: I18n.s("u_a2500a904351") }, straw: { n: I18n.s("u_10e6da00602f") },
  witch: { n: I18n.s("u_d930b2452e7b"), price: 120 }, tophat: { n: I18n.s("u_0e9e0c07901a"), price: 100 }, crown: { n: I18n.s("u_431e24ca50db"), price: 200 }, tiara: { n: I18n.s("u_be27b4fbb359"), price: 160 }, catears: { n: I18n.s("u_14983343adc9") }, bunny: { n: I18n.s("u_96083d5d5975") },
  bearears: { n: I18n.s("u_c1e069c58998") }, flowers: { n: I18n.s("u_45ab5883cf73"), price: 60 }, bow: { n: I18n.s("u_3b7b9bcabc2f") }, clips: { n: I18n.s("u_a2e161756078") }, headband: { n: I18n.s("u_b72963a69bcb") }, santa: { n: I18n.s("u_1e9de133ffa7"), price: 80 }, chef: { n: I18n.s("u_7000395df279"), price: 80 },
  party: { n: I18n.s("u_bbaf588c974f") }, sprout: { n: I18n.s("u_ab2249193a37") }, halo: { n: I18n.s("u_b077f4be00de"), price: 150 }, horns: { n: I18n.s("u_21af6004d4f3"), price: 150 },
};
const GLASSES = { none: { n: I18n.s("u_da5930e53d54") }, round: { n: I18n.s("u_ef94a5f3aa26") }, square: { n: I18n.s("u_ada1f79182e3") }, cateye: { n: I18n.s("u_eb1b89bbff5b") }, sun: { n: I18n.s("u_9bcc2463037a") }, heartsun: { n: I18n.s("u_eb29d72e2199"), price: 60 }, starsun: { n: I18n.s("u_a149c3626015"), price: 60 },
  nerd: { n: I18n.s("u_38b14500b50a") }, half: { n: I18n.s("u_7cf1923f0f7a") }, monocle: { n: I18n.s("u_fbd0d28ad7c9"), price: 80 }, goggles: { n: I18n.s("u_5742b02ec449"), price: 60 }, patch: { n: I18n.s("u_fd31042476d8") } };
const EARS = { none: { n: I18n.s("u_da5930e53d54") }, stud: { n: I18n.s("u_ff28edf7b3a6") }, hoop: { n: I18n.s("u_885e7c3ce439") }, drop: { n: I18n.s("u_660ec7a4b695") }, star: { n: I18n.s("u_b2c7e72c7974") }, heart: { n: I18n.s("u_fa70f5921440") }, pearl: { n: I18n.s("u_1561f87e44dc"), price: 50 }, cuff: { n: I18n.s("u_b6922b0eed42") } };
const NECKS = { none: { n: I18n.s("u_da5930e53d54") }, scarf: { n: I18n.s("u_5ccbc26a917a") }, tie: { n: I18n.s("u_9f48c6350ee6") }, bowtie: { n: I18n.s("u_789f0cb339d2") }, ribbon: { n: I18n.s("u_92d56b71ae60") }, pearls: { n: I18n.s("u_4c905c4578b7"), price: 80 }, pendant: { n: I18n.s("u_15e9f50340bf") },
  choker: { n: I18n.s("u_0eb032fd444a") }, bandana: { n: I18n.s("u_6aea16184e6b") }, bell: { n: I18n.s("u_ef6b3876691c") }, lanyard: { n: I18n.s("u_b99df5748f9f") } };
const BACKS_ACC = { none: { n: I18n.s("u_da5930e53d54") }, backpack: { n: I18n.s("u_f6d3c94e1ed4") }, angel: { n: I18n.s("u_2960f02aec2d"), price: 220 }, bat: { n: I18n.s("u_f501651372bc"), price: 220 }, butterfly: { n: I18n.s("u_adc461df1331"), price: 240 },
  cape: { n: I18n.s("u_c34277cc0f54"), price: 120 }, cattail: { n: I18n.s("u_5726edd190f4"), price: 80 }, foxtail: { n: I18n.s("u_d7f52dbd2f0b"), price: 100 }, guitar: { n: I18n.s("u_e1e799335b69"), price: 120 } };
const AVA_PARTS = {
  skin: SKINS, eyes: EYES, eyeColor: EYEC, brows: BROWS, mouth: MOUTHS, cheeks: CHEEKS, hairFront: FRINGES, hairBack: BACKS, hairColor: HAIRC,
  top: TOPS, topColor: CLOTH, top2: CLOTH, bottom: BOTTOMS, bottomColor: CLOTH, shoes: SHOES, shoesColor: CLOTH,
  hat: HATS, hatColor: CLOTH, glasses: GLASSES, glassesColor: CLOTH, ear: EARS, earColor: CLOTH, neck: NECKS, neckColor: CLOTH, back: BACKS_ACC, backColor: CLOTH,
};
function defaultAvatar() {
  return { name: '', skin: 'peach', eyes: 'round', eyeColor: 'brown', brows: 'soft', mouth: 'smile', cheeks: 'blush', hairFront: 'short', hairBack: 'short', hairColor: 'cocoa',
    top: 'tee', topColor: 'denim', top2: 'cream', bottom: 'pants', bottomColor: 'navy', shoes: 'sneakers', shoesColor: 'coal',
    hat: 'none', hatColor: 'red', glasses: 'none', glassesColor: 'coal', ear: 'none', earColor: 'butter', neck: 'none', neckColor: 'red', back: 'none', backColor: 'cocoa' };
}
// old saves had hair / shirt / pants only
function migrateAvatar(a) {
  const d = defaultAvatar();
  if (a && a.hair && !a.hairBack) {
    const m = { short: ['short', 'short'], bob: ['straight', 'bob'], bun: ['short', 'bun'], long: ['straight', 'long'] }[a.hair] || ['short', 'short'];
    a.hairFront = m[0]; a.hairBack = m[1]; if (a.shirt) a.topColor = CLOTH[a.shirt] ? a.shirt : ({ butter: 'butter', oat: 'oat' }[a.shirt] || 'denim'); if (a.pants) a.bottomColor = CLOTH[a.pants] ? a.pants : 'navy';
    delete a.hair; delete a.shirt; delete a.pants;
  }
  const out = Object.assign(d, a || {});
  for (const k in AVA_PARTS) if (!(out[k] in AVA_PARTS[k])) out[k] = defaultAvatar()[k];
  return out;
}
function sanitizeAvatar(a) {
  const d = defaultAvatar(), o = {}; a = a || {};
  for (const k in AVA_PARTS) o[k] = typeof a[k] === 'string' && a[k] in AVA_PARTS[k] ? a[k] : d[k];
  return o;
}
// ---------- shop rules ----------
// Each slot has a few free starter options; everything else is bought with coins and unlocked by level.
// Real skin tones are always free. Clothing colours are bought once as a dye and work in every clothing slot.
const AVA_FREE = {
  skin: ['porcelain', 'fair', 'peach', 'warm', 'tan', 'olive', 'caramel', 'brown', 'deep', 'ebony'],
  eyes: ['round', 'dot', 'bean', 'shiny', 'big'], eyeColor: ['brown', 'dark', 'hazel', 'blue'], brows: ['soft', 'none', 'thin', 'thick'],
  mouth: ['smile', 'grin', 'happy', 'open'], cheeks: ['blush', 'none', 'wide'],
  hairFront: ['short', 'none', 'straight', 'sideL', 'center'], hairBack: ['short', 'bob', 'long', 'ponyH', 'bun'], hairColor: ['cocoa', 'ink', 'espresso', 'chestnut', 'blonde'],
  top: ['tee', 'longtee', 'hoodie', 'shirt', 'sweater'], topColor: ['denim', 'rose', 'cream', 'mint', 'coal'], top2: ['cream', 'snow', 'coal', 'navy'],
  bottom: ['pants', 'jeans', 'shorts', 'skirt'], bottomColor: ['navy', 'denim', 'coal', 'khaki', 'cocoa'],
  shoes: ['sneakers', 'canvas', 'boots', 'slippers'], shoesColor: ['coal', 'snow', 'cocoa', 'red'],
  hat: ['none', 'beanie', 'cap'], hatColor: ['red', 'navy', 'cream', 'coal'], glasses: ['none', 'round', 'square'], glassesColor: ['coal', 'cocoa', 'butter'],
  ear: ['none', 'stud', 'hoop'], earColor: ['butter', 'snow', 'grey'], neck: ['none', 'scarf', 'tie'], neckColor: ['red', 'navy', 'cream'],
  back: ['none', 'backpack'], backColor: ['cocoa', 'navy', 'red'],
};
// [min level, max level, min price, max price] across each table, in table order
const AVA_TIER = {
  skin: [15, 15, 300, 300], eyes: [2, 18, 40, 160], eyeColor: [3, 15, 50, 150], brows: [2, 12, 30, 100], mouth: [2, 16, 30, 120], cheeks: [2, 14, 30, 120],
  hairFront: [2, 22, 80, 320], hairBack: [3, 25, 100, 400], hairColor: [3, 24, 60, 300],
  top: [2, 26, 80, 420], bottom: [2, 20, 70, 320], shoes: [2, 20, 60, 280],
  hat: [3, 28, 60, 500], glasses: [3, 20, 60, 300], ear: [3, 16, 50, 220], neck: [3, 20, 50, 260], back: [6, 30, 150, 800],
  dye: [2, 14, 40, 160],
};
const AVA_DYE = { topColor: 1, top2: 1, bottomColor: 1, shoesColor: 1, hatColor: 1, glassesColor: 1, earColor: 1, neckColor: 1, backColor: 1 };
const AVA_SHOP = (() => {
  const out = {}, r5 = (v) => Math.round(v / 5) * 5;
  const tier = (tab, ids, T, free) => { const paid = ids.filter(id => !free.includes(id)), m = paid.length, o = {};
    paid.forEach((id, i) => { const t = m > 1 ? i / (m - 1) : 0, P = tab[id], prem = (P && !Array.isArray(P) && P.price) || 0;
      let lvl = Math.round(T[0] + t * (T[1] - T[0])), price = r5(T[2] + t * (T[3] - T[2]));
      if (prem) { price = Math.max(price, r5(prem * 2.5)); lvl = Math.max(lvl, Math.min(30, 6 + Math.round(prem / 20))); }
      o[id] = { price, lvl }; });
    return o; };
  out.dye = tier(CLOTH, Object.keys(CLOTH), AVA_TIER.dye, []);
  for (const cat in AVA_PARTS) { if (AVA_DYE[cat]) continue; out[cat] = tier(AVA_PARTS[cat], Object.keys(AVA_PARTS[cat]), AVA_TIER[cat], AVA_FREE[cat] || []); }
  return out;
})();
function partFree(cat, id) { return (AVA_FREE[cat] || []).includes(id); }
function closetKey(cat, id) { return AVA_DYE[cat] ? 'dye:' + id : cat + ':' + id; }
function partInfo(cat, id) { if (partFree(cat, id)) return null; return (AVA_DYE[cat] ? AVA_SHOP.dye : AVA_SHOP[cat] || {})[id] || null; }
function partPrice(cat, id) { const i = partInfo(cat, id); return i ? i.price : 0; }
function partLvl(cat, id) { const i = partInfo(cat, id); return i ? i.lvl : 1; }
function partOwned(closet, cat, id) { return partFree(cat, id) || !!(closet || {})[closetKey(cat, id)]; }
// everything a player was already wearing before the shop existed stays theirs
function grandfatherCloset(S) {
  S.closet = S.closet || {};
  if (S.closetV >= 2) return 0;
  let n = 0; const own = (a) => { if (!a) return; for (const cat in AVA_PARTS) { const id = a[cat]; if (id && id in AVA_PARTS[cat] && !partFree(cat, id)) { const k = closetKey(cat, id); if (!S.closet[k]) { S.closet[k] = 1; n++; } } } };
  // old closet keys for dyes were 'topColor:mint' etc.
  for (const k of Object.keys(S.closet)) { const [c, id] = k.split(':'); if (AVA_DYE[c]) { S.closet['dye:' + id] = 1; delete S.closet[k]; } }
  own(S.avatar); for (const o of S.outfits || []) own(o.a);
  S.closetV = 2; return n;
}

// ---------- body template ----------
// labels: t torso, u upper arm, f forearm, h hand, n neck skin, p hips, g shin, k foot; shade 1 dark 2 mid 3 light
function mannequin(view, frame) {throw Error("Body geometry is baked into PNG atlases");}
const MANNEQUINS = {};
function mannequinCached(v, f) { const k = v + f; return MANNEQUINS[k] || (MANNEQUINS[k] = mannequin(v, f)); }

function composeBody(view, frame, cfg) {return PNGArt.body(view,frame,cfg);}
// neck & back items on the body grid
function drawNeck(g, view, cfg) {PNGArt.paste(g,PNGArt.grid(`neck/${view}/${cfg.neck||"none"}`));}
function drawBackItem(g, view, cfg, behind) {PNGArt.paste(g,PNGArt.grid(`back/${view}/${cfg.back||"none"}/${behind}`));}

// ---------- head ----------
function composeHead(view, eyes, cfg) {return PNGArt.head(view,eyes,cfg);}
function stampPat(g, x0, y0, rows, mirror, map) {
  rows.forEach((r, j) => { const s = mirror ? [...r].reverse().join('') : r; [...s].forEach((ch, i) => { if (ch === '.') return; const c = map[ch] || ch; g.px(x0 + i, y0 + j, c); }); });
}
function drawFace(g, view, eyes, cfg) {throw Error("Face layers are PNG resources");}
// hats, glasses and earrings are drawn on the avatar grid in head coordinates (ox, oy = where the head grid sits)
function drawHeadAcc(g, view, cfg, ox, oy) {PNGArt.headAcc(g,view,cfg,ox,oy);}

// ---------- composition ----------
const AVATAR_FRAMES = {
  front0: ['front', 'front', 0], front1: ['front', 'front', 1], front2: ['front', 'front', 2],
  back0: ['back', 'back', 0], back1: ['back', 'back', 1], back2: ['back', 'back', 2],
  side0: ['side', 'side', 0], side1: ['side', 'side', 1], side2: ['side', 'side', 2], side3: ['side', 'side', 3],
  type0: ['back', 'sitback', 0], type1: ['back', 'sitback', 1], sit0: ['front', 'sitfront', 0], stretch: ['back', 'sitback', 2],
  hand0: ['side', 'side', 4], hand1: ['side', 'side', 5], cheer0: ['front', 'front', 6], cheer1: ['front', 'front', 7],
};
function colorMap(cfg) {
  const m = {};
  const sk = SKINS[cfg.skin] || SKINS.peach; m.C = palAdd(sk[0]); m.D = palAdd(sk[1]); m.E = palAdd(sk[2]);
  const hc = HAIRC[cfg.hairColor] || HAIRC.cocoa; m.O = palAdd(hc[0]); m.P = palAdd(hc[1]); m.Q = palAdd(hc[2]);
  const set = (keys, col) => { const c = CLOTH[col] || CLOTH.denim; keys.forEach((k, i) => { if (k) m[k] = palAdd(c[Math.min(i, 2)]); }); };
  set([K.t1, K.t2, K.t3], cfg.topColor); const c2 = CLOTH[cfg.top2] || CLOTH.cream; m[K.ta] = palAdd(c2[0]); m[K.tb] = palAdd(c2[2]);
  set([K.o1, K.o2, K.o3], cfg.topColor); m[K.o1] = palAdd((CLOTH[cfg.topColor] || CLOTH.denim)[0]);
  set([K.b1, K.b2, K.b3], cfg.bottomColor); set([K.s1, K.s2, K.s3], cfg.shoesColor); set([K.h1, K.h2, K.h3], cfg.hatColor); m[K.ha] = palAdd(c2[2]);
  set([K.n1, K.n2, K.n3], cfg.neckColor); set([K.k1, K.k2, K.k3], cfg.backColor);
  const gc = CLOTH[cfg.glassesColor] || CLOTH.coal; m[K.g1] = palAdd(gc[0]); m[K.gl] = palAdd('#bcd8f2'); m[K.e1] = palAdd((CLOTH[cfg.earColor] || CLOTH.butter)[1]);
  const ec = EYEC[cfg.eyeColor] || EYEC.brown; m[K.i1] = palAdd(ec[0]); m[K.i2] = palAdd(ec[1]);
  // open jackets reuse the accent colour for the shirt underneath
  if ((TOPS[cfg.top] || {}).outer) { const oc = CLOTH[cfg.topColor] || CLOTH.denim; m[K.o1] = palAdd(oc[0]); m[K.o2] = palAdd(oc[1]); m[K.o3] = palAdd(oc[2]); }
  return m;
}
function avatarGrid(frame, cfg, eyes, bob) {
  const [hv, bv, bf] = AVATAR_FRAMES[frame] || AVATAR_FRAMES.front0;
  // the stretch frame is 4 px wider (arms reach out past the hair); it is drawn 2 px further left
  const cheer = frame === 'cheer0' || frame === 'cheer1', st = frame === 'stretch' || cheer, X = st ? 3 : 1;
  const g = new Grid(st ? 24 : 20, 30 + AVA_TOP);
  const body = composeBody(bv, bf, cfg); drawNeck(body, bv, cfg);
  const behind = new Grid(18, 13); drawBackItem(behind, bv, cfg, true);
  g.paste(behind, X, 15 + AVA_TOP);
  g.paste(body, X, 15 + AVA_TOP);
  const over = new Grid(18, 13); drawBackItem(over, bv, cfg, false); g.paste(over, X, 15 + AVA_TOP);
  const head = composeHead(hv, hv === 'back' ? 'open' : eyes, cfg);
  const oy = 1 + AVA_TOP + (bob || 0); g.paste(head, X, oy);
  drawHeadAcc(g, hv, cfg, X, oy);
  if(st) PNGArt.paste(g,PNGArt.grid(`arms/${cfg.top}/${frame}`));
  return g.outline();
}
const AVA_CACHE = {}; let AVA_CACHE_N = 0;
function avaKey(cfg) { let s = ''; for (const k in AVA_PARTS) s += (cfg[k] || '') + ','; return s; }
function avatarCanvas(frame, cfg, eyes, bob, flip) {
  const key = frame + '|' + avaKey(cfg) + (eyes || 'o') + (bob || 0) + (flip ? 1 : 0);
  let c = AVA_CACHE[key];
  if (!c) {
    if (++AVA_CACHE_N > 1500) { for (const k in AVA_CACHE) delete AVA_CACHE[k]; AVA_CACHE_N = 0; }
    let g = avatarGrid(frame, cfg, eyes, bob).recolor(colorMap(cfg)); if (flip) g = g.flip();
    c = AVA_CACHE[key] = g.toCanvas();
  }
  return c;
}
function sleepHeadCanvas(cfg) {
  const key = 'sleep|' + avaKey(cfg);
  let c = AVA_CACHE[key];
  if (!c) {
    const c2 = Object.assign({}, cfg, { hairBack: ['long', 'xlong', 'wavy', 'hime'].includes(cfg.hairBack) ? 'bob' : cfg.hairBack, hat: ['witch', 'tophat', 'chef', 'party'].includes(cfg.hat) ? 'none' : cfg.hat });
    const g = new Grid(20, 18 + AVA_TOP); g.paste(composeHead('front', 'closed', c2), 1, 1 + AVA_TOP); drawHeadAcc(g, 'front', c2, 1, 1 + AVA_TOP);
    c = AVA_CACHE[key] = g.outline().recolor(colorMap(c2)).toCanvas();
  }
  return c;
}
