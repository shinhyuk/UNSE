// 사주 만세력 엔진 — 원국·일진·십성·12운성·합충형파해·신살을 계산해 facts JSON으로 낸다.
// 사용: node scripts/saju.mjs [YYYY-MM-DD]   (생략하면 한국 시간 기준 오늘)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const STEM_KO = '갑을병정무기경신임계';
const BRANCH_KO = '자축인묘진사오미신유술해';
const ELEMENTS = ['木', '火', '土', '金', '水'];
const ELEMENT_KO = ['목', '화', '토', '금', '수'];
const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 지장간 (여기·중기·본기 순, 마지막이 본기)
const HIDDEN = ['壬癸', '癸辛己', '戊丙甲', '甲乙', '乙癸戊', '戊庚丙', '丙己丁', '丁乙己', '戊壬庚', '庚辛', '辛丁戊', '戊甲壬'];
const TEN_GODS = [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']];
const STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const STAGE_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 천간별 장생지
const TERMS = ['입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서',
  '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한'];
const WEEKDAYS = '일월화수목금토';

const mod = (n, m) => ((n % m) + m) % m;
const rad = (d) => (d * Math.PI) / 180;

function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
// 태양 황경 (Meeus 저정밀식, 오차 약 0.01°). 시각은 한국 표준시.
function sunLongitude(y, m, d, hourKst) {
  const jd = jdn(y, m, d) + (hourKst - 9 - 12) / 24;
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = rad(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * T)), 360);
}

function pillar(stem, branch) {
  return {
    stem: STEMS[stem], branch: BRANCHES[branch], ko: STEM_KO[stem] + BRANCH_KO[branch],
    stemIdx: stem, branchIdx: branch,
    stemElement: ELEMENTS[stem >> 1], branchElement: ELEMENTS[BRANCH_ELEMENT[branch]],
    stemYin: stem % 2 === 1, hidden: HIDDEN[branch],
  };
}

// 연·월·일(·시) 기둥. hour가 null이면 시주 없이 정오 기준으로 절기를 판정한다.
export function pillars(y, m, d, hour = null) {
  const lon = sunLongitude(y, m, d, hour ?? 12);
  const monthNo = Math.floor(mod(lon - 315, 360) / 30); // 0 = 寅월
  const sajuYear = m <= 2 && lon >= 270 && lon < 315 ? y - 1 : y;
  const yStem = mod(sajuYear - 4, 10), yBranch = mod(sajuYear - 4, 12);
  const mStem = mod((yStem % 5) * 2 + 2 + monthNo, 10), mBranch = mod(monthNo + 2, 12);
  const dayIdx = mod(jdn(y, m, d) + 49, 60);
  const out = { year: pillar(yStem, yBranch), month: pillar(mStem, mBranch), day: pillar(dayIdx % 10, dayIdx % 12) };
  if (hour !== null) {
    const hBranch = Math.floor((hour + 1) / 2) % 12;
    out.hour = pillar(mod((out.day.stemIdx % 5) * 2 + hBranch, 10), hBranch);
  }
  const termIdx = Math.floor(mod(lon - 315, 360) / 15);
  return { pillars: out, dayIdx, solarTerm: TERMS[termIdx], sunLongitude: +lon.toFixed(2) };
}

export function tenGod(dm, stemIdx) {
  const diff = mod((stemIdx >> 1) - (dm >> 1), 5);
  return TEN_GODS[diff][dm % 2 === stemIdx % 2 ? 0 : 1];
}
const mainStem = (branchIdx) => STEMS.indexOf(HIDDEN[branchIdx].at(-1));
export const branchGod = (dm, branchIdx) => tenGod(dm, mainStem(branchIdx));
export function stage(stemIdx, branchIdx) {
  const off = stemIdx % 2 === 0 ? branchIdx - STAGE_START[stemIdx] : STAGE_START[stemIdx] - branchIdx;
  return STAGES[mod(off, 12)];
}

const STEM_COMBINE = { '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火' };
const SIX_COMBINE = { '子丑': '土', '寅亥': '木', '卯戌': '火', '辰酉': '金', '巳申': '水', '午未': '火·土' };
const TRIADS = [['申子辰', '水'], ['亥卯未', '木'], ['寅午戌', '火'], ['巳酉丑', '金']];
const PUNISH = ['寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未', '子卯'];
const BREAK = ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'];
const HARM = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
const RESENT = ['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'];
const has = (list, a, b) => list.includes(a + b) || list.includes(b + a);
const key = (obj, a, b) => obj[a + b] ?? obj[b + a];

function stemRelations(a, b) {
  const r = [];
  const c = key(STEM_COMBINE, a, b);
  if (c) r.push({ type: '천간합', note: `${a}${b}합 → ${c}` });
  const ia = STEMS.indexOf(a), ib = STEMS.indexOf(b);
  if (Math.abs(ia - ib) === 6) r.push({ type: '천간충', note: `${a}${b}충` });
  return r;
}
function branchRelations(a, b) {
  const r = [];
  const ia = BRANCHES.indexOf(a), ib = BRANCHES.indexOf(b);
  const c = key(SIX_COMBINE, a, b);
  if (c) r.push({ type: '육합', note: `${a}${b}합 → ${c}` });
  if (mod(ia - ib, 12) === 6) r.push({ type: '충', note: `${a}${b}충` });
  if (a !== b) for (const [t, el] of TRIADS) if (t.includes(a) && t.includes(b)) r.push({ type: '반합', note: `${a}${b} (${t} ${el}국)` });
  if (has(PUNISH, a, b)) r.push({ type: '형', note: `${a}${b}형` });
  if (a === b && '辰午酉亥'.includes(a)) r.push({ type: '자형', note: `${a}${a}자형` });
  if (has(BREAK, a, b)) r.push({ type: '파', note: `${a}${b}파` });
  if (has(HARM, a, b)) r.push({ type: '해', note: `${a}${b}해` });
  if (has(RESENT, a, b)) r.push({ type: '원진', note: `${a}${b}원진` });
  return r;
}
const POS_KO = { year: '년', month: '월', day: '일', hour: '시' };
// 한 기둥(예: 오늘 일진)과 원국 전체의 관계
function relate(p, natal, label) {
  const out = [];
  for (const [pos, n] of Object.entries(natal)) {
    if (p.stem === n.stem && p.branch === n.branch) out.push({ type: '복음', note: `${p.stem}${p.branch} 같은 기둥`, with: `${POS_KO[pos]}주 ${n.stem}${n.branch}`, from: `${label} ${p.stem}${p.branch}` });
    for (const r of stemRelations(p.stem, n.stem)) out.push({ ...r, with: `${POS_KO[pos]}간 ${n.stem}`, from: `${label} ${p.stem}` });
    for (const r of branchRelations(p.branch, n.branch)) out.push({ ...r, with: `${POS_KO[pos]}지 ${n.branch}`, from: `${label} ${p.branch}` });
  }
  return out;
}

function voidBranches(dayIdx) {
  const s = dayIdx - (dayIdx % 10);
  return [BRANCHES[(s + 10) % 12], BRANCHES[(s + 11) % 12]];
}
const NOBLE = ['丑未', '子申', '亥酉', '亥酉', '丑未', '子申', '丑未', '寅午', '卯巳', '卯巳']; // 천을귀인
function triadOf(branch) { return TRIADS.findIndex(([t]) => t.includes(branch)); }
const TRAVEL = '寅巳申亥', PEACH = '酉子卯午', CANOPY = '辰未戌丑'; // 삼합 순서(水木火金)별 역마·도화·화개
function stars(natal, branch) {
  const s = [];
  if (NOBLE[natal.day.stemIdx].includes(branch)) s.push('천을귀인');
  for (const [pos, label] of [['day', '일지'], ['year', '년지']]) {
    const t = triadOf(natal[pos].branch);
    if (TRAVEL[t] === branch) s.push(`역마(${label} 기준)`);
    if (PEACH[t] === branch) s.push(`도화(${label} 기준)`);
    if (CANOPY[t] === branch) s.push(`화개(${label} 기준)`);
  }
  return s;
}

function elementCount(natal) {
  const c = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of Object.values(natal)) { c[p.stemElement]++; c[p.branchElement]++; }
  return c;
}

function describe(p, dm) {
  return {
    stem: p.stem, branch: p.branch, ko: p.ko, stemElement: p.stemElement, branchElement: p.branchElement,
    hidden: p.hidden, stemGod: tenGod(dm, p.stemIdx), branchGod: branchGod(dm, p.branchIdx),
    hiddenGods: [...p.hidden].map((h) => `${h} ${tenGod(dm, STEMS.indexOf(h))}`), stage: stage(dm, p.branchIdx),
  };
}

export function natalChart(person) {
  const b = person.birth;
  const { pillars: n, dayIdx, solarTerm } = pillars(b.year, b.month, b.day, b.hour);
  const dm = n.day.stemIdx;
  const chart = {};
  for (const [pos, p] of Object.entries(n)) chart[pos] = describe(p, dm);
  chart.day.stemGod = '일간(나)';
  const internal = [];
  const keys = Object.keys(n);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = n[keys[i]], c = n[keys[j]];
    for (const r of stemRelations(a.stem, c.stem)) internal.push(`${POS_KO[keys[i]]}간·${POS_KO[keys[j]]}간 ${r.note} (${r.type})`);
    for (const r of branchRelations(a.branch, c.branch)) internal.push(`${POS_KO[keys[i]]}지·${POS_KO[keys[j]]}지 ${r.note} (${r.type})`);
  }
  return {
    raw: n, dayIdx,
    chart, dayMaster: `${n.day.stem}${n.day.stemElement}`, animal: ANIMALS[n.year.branchIdx], bornInTerm: solarTerm,
    elements: elementCount(n), void: voidBranches(dayIdx), internalRelations: internal,
    hourKnown: b.hour !== null,
  };
}

export function dailyFacts(dateStr, people) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const today = pillars(y, m, d, 12);
  const tp = today.pillars;
  const facts = {
    date: dateStr, weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + '요일',
    solarTerm: today.solarTerm,
    today: Object.fromEntries(Object.entries(tp).map(([k, p]) => [k, { stem: p.stem, branch: p.branch, ko: p.ko, stemElement: p.stemElement, branchElement: p.branchElement, hidden: p.hidden }])),
    people: {},
  };
  const natals = {};
  for (const [id, person] of Object.entries(people)) {
    const nat = natalChart(person); natals[id] = nat;
    const dm = nat.raw.day.stemIdx;
    const voidHit = nat.void.includes(tp.day.branch);
    const hours = [];
    for (let hb = 0; hb < 12; hb++) {
      const hs = mod((tp.day.stemIdx % 5) * 2 + hb, 10);
      const start = mod(hb * 2 - 1, 24);
      hours.push({
        time: `${String(start).padStart(2, '0')}–${String((start + 2) % 24).padStart(2, '0')}시`, pillar: STEMS[hs] + BRANCHES[hb],
        stemGod: tenGod(dm, hs), branchGod: branchGod(dm, hb), stage: stage(dm, hb),
        relations: Object.entries(nat.raw).flatMap(([pos, n]) => branchRelations(BRANCHES[hb], n.branch).map((r) => `${POS_KO[pos]}지와 ${r.note}`)),
        stars: stars(nat.raw, BRANCHES[hb]), void: nat.void.includes(BRANCHES[hb]),
      });
    }
    facts.people[id] = {
      name: person.name, hanja: person.hanja,
      natal: { chart: nat.chart, dayMaster: nat.dayMaster, animal: nat.animal, bornInTerm: nat.bornInTerm, elements: nat.elements, void: nat.void, internalRelations: nat.internalRelations, hourKnown: nat.hourKnown },
      today: {
        day: { stemGod: tenGod(dm, tp.day.stemIdx), branchGod: branchGod(dm, tp.day.branchIdx), stage: stage(dm, tp.day.branchIdx), hiddenGods: [...tp.day.hidden].map((h) => `${h} ${tenGod(dm, STEMS.indexOf(h))}`) },
        month: { stemGod: tenGod(dm, tp.month.stemIdx), branchGod: branchGod(dm, tp.month.branchIdx), stage: stage(dm, tp.month.branchIdx) },
        year: { stemGod: tenGod(dm, tp.year.stemIdx), branchGod: branchGod(dm, tp.year.branchIdx), stage: stage(dm, tp.year.branchIdx) },
        relations: [...relate(tp.day, nat.raw, '일진'), ...relate(tp.month, nat.raw, '월운'), ...relate(tp.year, nat.raw, '세운')],
        stars: stars(nat.raw, tp.day.branch), voidDay: voidHit, hours,
      },
    };
  }
  const ids = Object.keys(people);
  if (ids.length === 2) {
    const [a, b] = ids.map((i) => natals[i]);
    const rel = [];
    for (const [pa, na] of Object.entries(a.raw)) for (const [pb, nb] of Object.entries(b.raw)) {
      for (const r of stemRelations(na.stem, nb.stem)) rel.push(`${people[ids[0]].name} ${POS_KO[pa]}간 ${na.stem} × ${people[ids[1]].name} ${POS_KO[pb]}간 ${nb.stem}: ${r.note} (${r.type})`);
      for (const r of branchRelations(na.branch, nb.branch)) rel.push(`${people[ids[0]].name} ${POS_KO[pa]}지 ${na.branch} × ${people[ids[1]].name} ${POS_KO[pb]}지 ${nb.branch}: ${r.note} (${r.type})`);
    }
    facts.couple = { natalRelations: rel };
  }
  return facts;
}

export function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const date = process.argv[2] ?? todayKst();
  const people = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/people.json'), 'utf8'));
  const facts = dailyFacts(date, people);
  const out = path.join(ROOT, 'data/facts', `${date}.json`);
  fs.writeFileSync(out, JSON.stringify(facts, null, 2) + '\n');
  console.log(`facts → ${path.relative(ROOT, out)}`);
}
