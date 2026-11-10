# 매일 아침 운세 갱신 절차

영지(榮地)와 신혁(伸赫)의 운세 페이지를 매일 한국 시간 오전 6시 전에 새로 쓴다.

1. `git fetch origin claude/relaxed-cerf-ves498 && git checkout claude/relaxed-cerf-ves498 && git pull origin claude/relaxed-cerf-ves498`
2. `node scripts/saju.mjs` — 한국 시간 기준 오늘 날짜의 `data/facts/YYYY-MM-DD.json` 을 만든다.
3. facts 를 읽고 `data/readings/YYYY-MM-DD.json` 을 쓴다.
   - 구조는 가장 최근 readings 파일과 똑같이 맞춘다 (headline, dayNote, people.yeongji / people.shinhyuk 의
     summary·keywords·scores·sections·timeline·lucky·caution, couple 의 summary·score·sections·tip).
   - 근거는 반드시 facts 에 있는 것만 쓴다: 일진의 십성과 12운성, 원국과의 합·충·형·파·해·원진·복음,
     신살(천을귀인·역마·도화·화개), 공망, 월운·세운, 열두 시진.
   - 꼭지는 일진 / 합과 충 / 달과 해의 흐름 / 재물 / 일과 사람 / 애정 / 건강 / 이름으로 본 오늘 을 유지한다.
     이름 풀이는 `data/profile.json` 의 nameSections (榮 木 · 地 土 · 伸 火 · 赫 火) 를 그날의 오행과 엮는다.
   - 두 사람은 일주가 같으므로(丁亥) 년·월·시주와 이름에서 갈리는 차이를 분명히 쓴다.
   - 전날 글을 베끼지 않는다. 점수도 그날 근거에 맞게 새로 매긴다.
4. `node scripts/build.mjs` — `site/unse.html` 을 다시 만든다 (최근 7일치 포함).
5. Artifact 도구로 `site/unse.html` 을 아래 주소에 다시 게시한다 (`url` 지정, icon 생략).
   - 아티팩트: https://claude.ai/artifact/FGU9uNogwy9KcggftQx4uu
6. `data/`, `site/` 변경을 커밋하고 `git push -u origin claude/relaxed-cerf-ves498`. PR 은 만들지 않는다.
