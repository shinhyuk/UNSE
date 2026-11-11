# 매일 아침 운세 갱신 절차

영지(榮地)와 신혁(伸爀)의 운세 페이지를 매일 한국 시간 오전 6시 전에 새로 쓴다.

1. `git fetch origin claude/relaxed-cerf-ves498 && git checkout claude/relaxed-cerf-ves498 && git pull origin claude/relaxed-cerf-ves498`
2. `node scripts/saju.mjs` — 한국 시간 기준 오늘 날짜의 `data/facts/YYYY-MM-DD.json` 을 만든다.
3. facts 를 읽고 `data/readings/YYYY-MM-DD.json` 을 쓴다.
   - 먼저 `data/context.md` (두 사람의 상황) 를 읽고 반영한다: 부부, 둘 다 회사원, 아기는 아직 없음.
   - 구조는 가장 최근 readings 파일과 똑같이 맞춘다 (headline, dayNote, people.yeongji / people.shinhyuk 의
     summary·keywords·points·scores·scoreNotes·dos·donts·sections(각 꼭지에 examples)·timeline(8칸)·lucky·caution,
     couple 의 summary·score·scoreNote·dos·donts·sections·tip, 맨 위 headline·weather·dayNote).
   - **쉬운 말로 쓴다.** 본문에 식신·편재·공망·12운성·합·충 같은 사주 용어와 간지 한자(己丑 등)를 쓰지 않는다.
     촛불, 흙, 나무 같은 일상어로 풀고, 오늘 무엇을 하면 좋고 무엇을 조심할지 구체적으로 말한다.
     시간은 '오후 5–7시'처럼 쓴다.
   - **친구가 놀리듯 유쾌하고 장난스럽게, 반말로 쓴다.** '영지야', '신혁아'로 부르고 ㅋㅋ, ㅠㅠ, ㅎㅎ 를 섞는다.
     꼭지마다 "너 원래 ~하잖아? 근데 오늘은 ~해" 꼴로, 타고난 성격(`data/profile.json`)과 오늘 기운을 맞대어 쓴다.
     그날을 한마디 별명으로 부르고('창고 정리의 날', '본업 2배 데이') 비유와 농담을 섞는다.
     놀리되 깎아내리지 않고, 겁주는 말은 쓰지 않는다. ㅋㅋ·ㅠㅠ 는 문단마다 한두 번 정도로.
   - **상세하고 구체적으로 쓴다.** 꼭지마다 본문 두 문단 + examples 2~4개. 예시는 회사원 부부가 오늘 바로
     따라 할 수 있는 행동으로 쓴다 (경비 정산 올리기, 회의에서 할 말, 저녁 메뉴, 메신저 문장 등).
     dos 4~5개, donts 3~4개, 점수마다 scoreNotes 한 줄. 한자는 이름 글자(榮·地·伸·爀)를 풀 때만 쓴다. 문장은 짧게.
   - 근거는 반드시 facts 에 있는 것만 쓴다: 일진의 십성과 12운성, 원국과의 합·충·형·파·해·원진·복음,
     신살(천을귀인·역마·도화·화개), 공망, 월운·세운, 열두 시진.
   - 꼭지는 오늘 하루의 큰 그림 / 회사에서 / 돈 / 부부 사이 / 건강 / 이번 달과 올해 / 이름으로 본 오늘 을 유지한다.
     부부 탭은 오늘 두 사람 사이 / 함께하면 좋은 일 / 조심할 일 / 아기 계획.
     이름 풀이는 `data/profile.json` 의 nameSections (榮 木 · 地 土 · 伸 火 · 爀 火. 爀은 '불 화' 옆에 '붉을 적' 둘, 불이 세 겹) 를 그날의 오행과 엮는다.
   - 두 사람은 일주가 같으므로(丁亥) 년·월·시주와 이름에서 갈리는 차이를 분명히 쓴다.
   - 전날 글을 베끼지 않는다. 점수도 그날 근거에 맞게 새로 매긴다.
4. `node scripts/build.mjs` — `site/unse.html` (아티팩트용) 과 `docs/index.html` (GitHub Pages 용, 질문하기 포함) 을 다시 만든다.
5. Artifact 도구로 `site/unse.html` 을 아래 주소에 다시 게시한다 (`url` 지정, icon 생략).
   - 아티팩트: https://claude.ai/artifact/FGU9uNogwy9KcggftQx4uu
6. `data/`, `site/`, `docs/` 변경을 커밋하고 `git push -u origin claude/relaxed-cerf-ves498`. PR 은 만들지 않는다.

GitHub Pages 는 GitHub Actions(`.github/workflows/pages.yml`)로 게시한다. 푸시하면 워크플로가 페이지를 빌드해 올린다.
