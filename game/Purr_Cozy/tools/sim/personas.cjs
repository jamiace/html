#!/usr/bin/env node
/* Builds tools/sim/personas.json: 30 simulated Taiwanese senior-high students.
   Sources for the parameters are listed in tools/sim/README.md. Run once:  node tools/sim/personas.cjs  */
const fs = require('fs'), path = require('path');
let seed = 20261106; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const pick = (list) => { let r = rnd() * list.reduce((s, x) => s + x[1], 0); for (const [v, w] of list) { if ((r -= w) <= 0) return v; } return list[list.length - 1][0]; };
const between = (a, b) => a + (b - a) * rnd();

// 115 學測英文五標: 頂13 前11 均8 後5 底3 -> percentile -> 級分 (piecewise linear)
const PCT = [[0, 1], [.12, 3], [.25, 5], [.5, 8], [.75, 11], [.88, 13], [.97, 15], [1, 15]];
function score(u) { for (let i = 1; i < PCT.length; i++) if (u <= PCT[i][0]) { const [a, x] = PCT[i - 1], [b, y] = PCT[i]; return Math.round(x + (y - x) * (u - a) / (b - a)); } return 15; }

// How they use a learning app (see README: evening/bedtime peak, cram school until 21-22, edu apps ~15 min/day, high churn)
const TYPES = {
  bedtime:  { label: '睡前固定型', w: 5, slot: { morning: .03, noon: .05, evening: .15, night: .75 }, decay: .97, minutes: [8, 22], quit: .05 },
  cram:     { label: '補習晚歸型', w: 7, slot: { morning: .05, noon: .12, evening: .05, night: .55 }, decay: .92, minutes: [4, 12], quit: .12 },
  burst:    { label: '三分鐘熱度型', w: 6, slot: { morning: .05, noon: .15, evening: .45, night: .55 }, decay: .55, minutes: [15, 45], quit: .10 },
  casual:   { label: '隨性型', w: 5, slot: { morning: .08, noon: .15, evening: .2, night: .25 }, decay: .9, minutes: [3, 15], quit: .15 },
  weekend:  { label: '週末型', w: 3, slot: { morning: .05, noon: .1, evening: .15, night: .2 }, weekend: 2.8, decay: .95, minutes: [10, 35], quit: .08 },
  oneshot:  { label: '試玩就走型', w: 4, slot: { morning: .05, noon: .2, evening: .5, night: .5 }, decay: .05, minutes: [3, 10], quit: .25 },
};
const NICK = ['小安', '阿哲', '芊芊', '柏宇', '小米', '品妍', '冠廷', '語彤', '子軒', '心怡', '宥辰', '詩涵', '承恩', '欣妤', '家豪', '佳穎', '彥廷', '思妤', '宇翔', '亭妤', '俊宏', '筱涵', '睿哲', '雨晴', '昱安', '宜蓁', '博凱', '若晴', '紹宇', '采潔'];

const list = [];
for (let i = 0; i < 30; i++) {
  const lvl = score(rnd()), theta = (lvl - 8) / 3;
  // better students are a little more persistent, but not by much
  let type = pick(Object.entries(TYPES).map(([k, t]) => [k, t.w * (k === 'bedtime' ? 1 + Math.max(0, theta) * .4 : k === 'oneshot' ? 1 + Math.max(0, -theta) * .4 : 1)]));
  const grade = pick([['高一', 4], ['高二', 4], ['高三', 3]]);
  list.push({
    id: 'sim' + String(i + 1).padStart(2, '0'), nick: NICK[i], grade, type, typeLabel: TYPES[type].label,
    gsat: lvl, theta: +theta.toFixed(2),
    cram: rnd() < .62,                                  // >60% attend cram school after school
    phone: rnd() < .72,                                 // most play on a phone
    startDay: pick([[0, 6], [1, 3], [2, 2], [3, 1]]),   // not everyone installs on day 1
    speed: +between(.75, 1.35).toFixed(2),              // reading / tapping speed multiplier (lower = faster)
    typing: +Math.min(.98, Math.max(.6, .82 + theta * .05 + between(-.08, .08))).toFixed(2), // chance a known word is typed without slips
    honesty: +between(.75, .98).toFixed(2),             // how honestly they mark review cards "known"
    distract: +between(.02, .08).toFixed(3),            // chance of a long pause (phone notification, chatting)
    likes: { daily: +between(.4, 1).toFixed(2), practice: +between(.1, .7).toFixed(2), typo: +between(.1, .8).toFixed(2) },
    levels: lvl >= 11 ? [3, 4, 5, 6] : lvl >= 8 ? [2, 3, 4] : lvl >= 5 ? [1, 2, 3] : [1, 2],
  });
}
const out = { created: new Date().toISOString(), types: TYPES, students: list };
fs.writeFileSync(path.join(__dirname, 'personas.json'), JSON.stringify(out, null, 1));
const count = {}; for (const s of list) count[s.typeLabel] = (count[s.typeLabel] || 0) + 1;
console.log('personas.json:', list.length, 'students', count, 'GSAT', list.map(s => s.gsat).sort((a, b) => a - b).join(','));
