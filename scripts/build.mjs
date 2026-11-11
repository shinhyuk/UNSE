// data/facts + data/readings + data/profile.json → site/unse.html (아티팩트로 게시하는 페이지)
// 사용: node scripts/build.mjs   (최근 7일치를 한 페이지에 담는다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const paras = (s) => String(s ?? '').split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');
const EL_CLASS = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
const EL_KO = { 木: '나무', 火: '불', 土: '흙', 金: '쇠', 水: '물' };
const STEM_EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const BRANCH_EL = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const glyph = (ch) => `<span class="g ${EL_CLASS[STEM_EL[ch] ?? BRANCH_EL[ch]]}">${ch}</span>`;
const SCORE_LABELS = [['total', '총운'], ['love', '부부 사이'], ['money', '돈'], ['work', '회사 일'], ['health', '건강']];
const TONE = { good: '좋음', care: '주의', neutral: '보통' };

const profile = read('data/profile.json');
const people = read('data/people.json');
const dates = fs.readdirSync(path.join(ROOT, 'data/readings')).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => f.slice(0, 10)).filter((d) => fs.existsSync(path.join(ROOT, 'data/facts', `${d}.json`))).sort().slice(-7).reverse();
if (!dates.length) throw new Error('data/readings 에 운세가 없습니다.');

function scoreRow(label, v) {
  return `<div class="score"><span class="score-k">${label}</span><span class="bar" role="img" aria-label="${label} ${v}점"><i style="width:${v}%"></i></span><span class="score-v">${v}</span></div>`;
}

function pillarTable(natal) {
  const cols = [['hour', '시주'], ['day', '일주'], ['month', '월주'], ['year', '년주']];
  const cell = (pos, fn, empty = '·') => (natal.chart[pos] ? fn(natal.chart[pos]) : empty);
  const row = (head, fn, cls = '', empty) => `<tr class="${cls}"><th scope="row">${head}</th>${cols.map(([p]) => `<td>${cell(p, fn, empty)}</td>`).join('')}</tr>`;
  return `<div class="scroll"><table class="pillars">
<thead><tr><th></th>${cols.map(([, l]) => `<th scope="col">${l}</th>`).join('')}</tr></thead>
<tbody>
${row('십성', (c) => esc(c.stemGod), 'small')}
${row('천간', (c) => glyph(c.stem), 'big', '<span class="g unknown">?</span>')}
${row('지지', (c) => glyph(c.branch), 'big', '<span class="g unknown">?</span>')}
${row('십성', (c) => esc(c.branchGod), 'small')}
${row('지장간', (c) => esc([...c.hidden].join(' ')), 'small')}
${row('12운성', (c) => esc(c.stage), 'small')}
</tbody></table></div>`;
}

function elementBars(el) {
  const max = Math.max(...Object.values(el), 1);
  return `<div class="elements">${Object.entries(el).map(([k, v]) =>
    `<div class="el"><span class="el-k ${EL_CLASS[k]}">${EL_KO[k]}</span><span class="bar el-bar ${EL_CLASS[k]}" role="img" aria-label="${EL_KO[k]} ${v}개"><i style="width:${(v / max) * 100}%"></i></span><span class="score-v">${v}</span></div>`).join('')}</div>`;
}

function relationList(rel, stars, voidDay) {
  const items = rel.map((r) => `<li><span class="tag t-${r.type}">${esc(r.type)}</span><span>${esc(r.from)} × ${esc(r.with)} <em>${esc(r.note)}</em></span></li>`);
  for (const s of stars) items.push(`<li><span class="tag t-신살">신살</span><span>오늘 일지에 ${esc(s)}</span></li>`);
  if (voidDay) items.push('<li><span class="tag t-공망">공망</span><span>오늘 일지가 공망에 든다</span></li>');
  return items.length ? `<ul class="rel">${items.join('')}</ul>` : '<p class="muted">오늘 원국과 걸리는 합·충이 없다.</p>';
}

function hoursTable(hours) {
  return `<div class="scroll"><table class="hours"><thead><tr><th>시간</th><th>시주</th><th>천간</th><th>지지</th><th>12운성</th><th>표시</th></tr></thead><tbody>${hours.map((h) => {
    const marks = [...h.stars, ...(h.void ? ['공망'] : []), ...h.relations];
    return `<tr><td>${esc(h.time)}</td><td>${glyph(h.pillar[0])}${glyph(h.pillar[1])}</td><td>${esc(h.stemGod)}</td><td>${esc(h.branchGod)}</td><td>${esc(h.stage)}</td><td class="marks">${esc(marks.join(' · ')) || '–'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

const sections = (list) => list.map((s) => `<section class="block"><h3>${esc(s.title)}</h3>${paras(s.body)}</section>`).join('');

function personPanel(id, facts, reading, hidden) {
  const f = facts.people[id], r = reading.people[id], pf = profile.people[id], p = people[id];
  const t = f.today, b = p.birth;
  const birth = `${b.year}.${String(b.month).padStart(2, '0')}.${String(b.day).padStart(2, '0')} ${b.hour === null ? '시각 미상' : `${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`}`;
  const lucky = [['색', r.lucky.color], ['방향', r.lucky.direction], ['숫자', r.lucky.number], ['시간', r.lucky.time], ['곁에 둘 것', r.lucky.item]];
  return `<div class="panel" data-panel="${id}"${hidden ? ' hidden' : ''}>
<header class="who">
  <div class="who-name"><span class="hanja">${esc(p.hanja)}</span><span><strong>${esc(p.fullName ?? p.name)}</strong><small>${esc(p.hanjaMeaning.join(' · '))}</small></span></div>
  <p class="who-meta">${esc(birth)} 출생 · ${esc(f.natal.animal)}띠 · 촛불의 기운</p>
</header>
<p class="lede">${esc(r.summary)}</p>
<ul class="keywords">${r.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
<div class="grid2">
  <section class="block"><h3>오늘의 점수</h3><div class="scores">${SCORE_LABELS.map(([k, l]) => scoreRow(l, r.scores[k])).join('')}</div></section>
  <section class="block"><h3>오늘 한눈에</h3><ul class="plain points">${(r.points ?? []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
</div>
${sections(r.sections)}
<section class="block"><h3>시간대별 흐름</h3>
  <ul class="timeline">${r.timeline.map((x) => `<li class="tone-${x.tone}"><span class="tl-time">${esc(x.time)}</span><span class="tl-note"><b>${TONE[x.tone]}</b> ${esc(x.note)}</span></li>`).join('')}</ul>
  
</section>
<div class="grid2">
  <section class="block"><h3>오늘 운을 돕는 것</h3><dl class="lucky">${lucky.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
  <section class="block caution"><h3>한 가지만 조심</h3><p>${esc(r.caution)}</p></section>
</div>
<section class="natal"><h2><span class="prompt">❯</span> ${esc(p.name)}는 어떤 사람인가</h2>
  <p class="lede small">${esc(pf.oneLine)}</p>
  <section class="block"><h3>타고난 다섯 기운</h3>${elementBars(f.natal.elements)}</section>
  <details open><summary>타고난 성격 풀이</summary>${sections(pf.natalSections)}</details>
  <details open><summary>이름 풀이 · ${esc(p.hanja)}</summary>${sections(pf.nameSections)}</details>
  <details><summary>전문 용어로 보기 (사주 표, 오늘의 합과 충, 시간표)</summary>
    <section class="block"><h3>사주 원국</h3>${pillarTable(f.natal)}</section>
    <section class="block"><h3>원국 안의 관계</h3><ul class="plain">${f.natal.internalRelations.map((x) => `<li>${esc(x)}</li>`).join('')}<li>공망 ${esc(f.natal.void.join('·'))}</li></ul></section>
    <section class="block"><h3>오늘 일진과 원국</h3>
      <p class="today-god">일진 ${glyph(facts.today.day.stem)}${glyph(facts.today.day.branch)} <span>${esc(t.day.stemGod)} · ${esc(t.day.branchGod)} · 12운성 ${esc(t.day.stage)}</span></p>
      ${relationList(t.relations, t.stars, t.voidDay)}</section>
    <section class="block"><h3>열두 시진</h3>${hoursTable(t.hours)}</section>
  </details>
</section>
</div>`;
}

function couplePanel(facts, reading) {
  const c = reading.couple;
  return `<div class="panel" data-panel="couple" hidden>
<header class="who"><div class="who-name"><span class="hanja">${esc(people.yeongji.hanja)} · ${esc(people.shinhyuk.hanja)}</span><span><strong>부부</strong><small>김영지 · 전신혁</small></span></div></header>
<p class="lede">${esc(c.summary)}</p>
<section class="block"><h3>오늘 부부 점수</h3><div class="scores">${scoreRow('부부 사이', c.score)}</div></section>
${sections(c.sections)}
<section class="block caution"><h3>오늘의 한마디</h3><p>${esc(c.tip)}</p></section>
<section class="natal"><h2><span class="prompt">❯</span> 두 사람은 어떤 부부인가</h2>
  <p class="lede small">${esc(profile.couple.oneLine)}</p>
  ${sections(profile.couple.sections)}
  <details><summary>전문 용어로 보기 (두 사주 사이의 합과 충)</summary><ul class="plain">${facts.couple.natalRelations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
</section>
</div>`;
}

function dayView(date, i) {
  const facts = read(`data/facts/${date}.json`), reading = read(`data/readings/${date}.json`);
  const [y, m, d] = date.split('-');
  const t = facts.today;
  const chip = (p, unit) => `<span class="chip">${p.ko}${unit}<small>${p.stem}${p.branch}</small></span>`;
  return `<article class="day" data-date="${date}"${i ? ' hidden' : ''}>
<div class="dateline">
  <h1>${y}년 ${+m}월 ${+d}일 <span>${facts.weekday}</span></h1>
  <div class="chips">${chip(t.year, '년')}${chip(t.month, '월')}${chip(t.day, '일')}<span class="chip term">${esc(facts.solarTerm)} 무렵</span></div>
</div>
<p class="headline">${esc(reading.headline)}</p>
<p class="daynote">${esc(reading.dayNote)}</p>
<nav class="tabs" role="tablist" aria-label="누구의 운세">
  <button role="tab" data-tab="yeongji" aria-selected="true">영지</button>
  <button role="tab" data-tab="shinhyuk" aria-selected="false">신혁</button>
  <button role="tab" data-tab="couple" aria-selected="false">부부</button>
</nav>
${personPanel('yeongji', facts, reading, false)}
${personPanel('shinhyuk', facts, reading, true)}
${couplePanel(facts, reading)}
</article>`;
}

const template = fs.readFileSync(path.join(ROOT, 'scripts/template.html'), 'utf8');
const dateNav = dates.length > 1
  ? `<nav class="dates" aria-label="지난 운세">${dates.map((d, i) => `<button data-date="${d}" aria-pressed="${i === 0}">${+d.slice(5, 7)}.${d.slice(8)}</button>`).join('')}</nav>` : '';
const fill = (ask, askScript) => template
  .replace('{{LATEST}}', dates[0])
  .replace('{{DATENAV}}', dateNav)
  .replace('{{DAYS}}', () => dates.map(dayView).join('\n'))
  .replace('{{NOTES}}', profile.notes.map((n) => `<li>${esc(n)}</li>`).join(''))
  .replace('{{ASK}}', () => ask)
  .replace('{{ASKSCRIPT}}', () => askScript);

// 1) 아티팩트용 (질문 기능 없음: 아티팩트에서는 외부 API 호출이 막혀 있다)
const artifact = fill('', '');
fs.mkdirSync(path.join(ROOT, 'site'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'site/unse.html'), artifact);

// 2) GitHub Pages 용 (docs/index.html): 질문하기 + Claude 에게 넘길 자료 포함
const latestFacts = read(`data/facts/${dates[0]}.json`);
const context = {
  상황: fs.readFileSync(path.join(ROOT, 'data/context.md'), 'utf8'),
  사람: people,
  타고난_풀이: profile,
  오늘_계산값: latestFacts,
  오늘_운세: read(`data/readings/${dates[0]}.json`),
};
const ctxJson = JSON.stringify(context).replace(/</g, '\\u003c');
const askScript = `<script type="application/json" id="unse-context">${ctxJson}</script>\n<script>\n${fs.readFileSync(path.join(ROOT, 'scripts/ask.js'), 'utf8')}</script>`;
const head = '<!doctype html>\n<html lang="ko">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="robots" content="noindex, nofollow">\n<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n';
const pages = head + fill(fs.readFileSync(path.join(ROOT, 'scripts/ask.html'), 'utf8'), askScript) + '</html>\n';
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/index.html'), pages);
fs.writeFileSync(path.join(ROOT, 'docs/.nojekyll'), '');
console.log(`site/unse.html, docs/index.html ← ${dates.join(', ')} (${(pages.length / 1024).toFixed(0)} KB)`);
