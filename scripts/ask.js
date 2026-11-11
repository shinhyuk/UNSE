// 질문하기: 브라우저에서 Claude API(Messages)를 직접 부른다. 키는 localStorage 에만 둔다.
(function () {
  var MODEL = 'claude-opus-5-5';
  var KEY_NAME = 'unse-api-key';
  var $ = function (id) { return document.getElementById(id) };
  var ctx = JSON.parse($('unse-context').textContent);
  var log = $('ask-log'), form = $('ask-form'), input = $('ask-input'), send = $('ask-send'), status = $('ask-status');
  var keyInput = $('ask-key'), settings = $('ask-settings');
  var messages = [], busy = false;

  var store = {
    get: function () { try { return localStorage.getItem(KEY_NAME) || '' } catch (e) { return '' } },
    set: function (v) { try { v ? localStorage.setItem(KEY_NAME, v) : localStorage.removeItem(KEY_NAME) } catch (e) {} },
  };
  var apiKey = store.get();
  if (apiKey) keyInput.value = apiKey;

  var SYSTEM = [
    '당신은 부부인 김영지와 전신혁의 운세를 봐 주는 사주 상담가입니다.',
    '아래 자료(두 사람의 상황, 사주 원국과 풀이, 이름 풀이, 오늘의 만세력 계산값, 오늘의 운세 글)만을 근거로 답하세요. 자료에 없는 사주 계산은 지어내지 말고, 모르면 모른다고 하세요.',
    '말투: 쉬운 한국어로, 사주 용어와 간지 한자를 쓰지 말고 일상어로 풀어 주세요. 짧은 문장으로, 무엇을 하면 좋고 무엇을 조심할지 구체적으로 말하세요. 보통 서너 문단이면 충분합니다.',
    '형식: 마크다운 기호(#, *, - 목록 등) 없이 줄글로만 쓰세요.',
    '운세는 재미로 보는 것입니다. 건강, 돈, 법률처럼 중요한 결정은 운세를 근거로 단정하지 말고, 필요하면 전문가와 상의하라고 한 줄 덧붙이세요.',
    '',
    '<자료>',
    JSON.stringify(ctx),
    '</자료>',
  ].join('\n');

  function bubble(role, text) {
    var el = document.createElement('div');
    el.className = 'ask-msg ask-' + role;
    var who = document.createElement('span'); who.className = 'ask-who'; who.textContent = role === 'user' ? '❯ 질문' : '✻ 답';
    var body = document.createElement('p'); body.textContent = text;
    el.appendChild(who); el.appendChild(body); log.appendChild(el);
    return body;
  }
  function explain(statusCode, message) {
    if (statusCode === 401) return 'API 키가 맞지 않습니다. 아래 "API 키 설정"에서 다시 넣어 주세요.';
    if (statusCode === 403) return '이 키로는 요청할 권한이 없습니다. 키의 권한을 확인해 주세요.';
    if (statusCode === 429) return '요청이 너무 많거나 한도를 넘었습니다. 잠시 뒤에 다시 물어봐 주세요.';
    if (statusCode === 529 || statusCode >= 500) return 'Claude 쪽이 잠시 바쁩니다. 조금 뒤에 다시 물어봐 주세요.';
    return '요청이 거절됐습니다: ' + (message || statusCode);
  }

  async function ask(question) {
    if (busy) return;
    if (!apiKey) { settings.open = true; keyInput.focus(); status.textContent = '먼저 API 키를 넣고 저장해 주세요.'; return }
    busy = true; send.disabled = true; status.textContent = '답을 쓰는 중…';
    bubble('user', question);
    messages.push({ role: 'user', content: question });
    var out = bubble('assistant', '');
    var text = '', stopReason = null, failed = null;
    try {
      var res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'server-side-fallback-2026-07-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          stream: true,
          output_config: { effort: 'medium' },
          fallbacks: 'default',
          cache_control: { type: 'ephemeral' },
          system: SYSTEM,
          messages: messages,
        }),
      });
      if (!res.ok) {
        var err = null; try { err = await res.json() } catch (e) {}
        failed = explain(res.status, err && err.error && err.error.message);
      } else {
        var reader = res.body.getReader(), decoder = new TextDecoder(), buffer = '';
        for (;;) {
          var chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split('\n'); buffer = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf('data:') !== 0) continue;
            var ev; try { ev = JSON.parse(line.slice(5)) } catch (e) { continue }
            if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { text += ev.delta.text; out.textContent = text }
            else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
            else if (ev.type === 'error') failed = explain(ev.error && ev.error.type === 'overloaded_error' ? 529 : 0, ev.error && ev.error.message);
          }
        }
      }
    } catch (e) {
      failed = '연결하지 못했습니다. 인터넷 연결을 확인하고 다시 물어봐 주세요.';
    }
    if (!failed && stopReason === 'refusal') failed = '이 질문에는 답하지 못했습니다. 다르게 물어봐 주세요.';
    if (!failed && !text) failed = '답이 비어 있습니다. 다시 물어봐 주세요.';
    if (failed) {
      messages.pop();
      if (text) { out.textContent = text + '\n\n(' + failed + ')' } else { out.parentNode.classList.add('ask-error'); out.textContent = failed }
      status.textContent = '';
    } else {
      messages.push({ role: 'assistant', content: text });
      status.textContent = stopReason === 'max_tokens' ? '답이 길어서 중간에 끊겼습니다.' : '';
    }
    busy = false; send.disabled = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || busy) return;
    if (apiKey) input.value = '';
    ask(q);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit() }
  });
  document.querySelectorAll('.ask-chips button').forEach(function (b) {
    b.addEventListener('click', function () { input.value = b.dataset.q; form.requestSubmit() });
  });
  $('ask-key-save').addEventListener('click', function () {
    apiKey = keyInput.value.trim(); store.set(apiKey);
    status.textContent = apiKey ? '키를 저장했습니다.' : '키를 넣어 주세요.';
    if (apiKey) settings.open = false;
  });
  $('ask-key-clear').addEventListener('click', function () {
    apiKey = ''; keyInput.value = ''; store.set(''); status.textContent = '키를 지웠습니다.';
  });
})();
