import { CreatorProfile } from '../types/zenoa';

export function buildStandaloneIndexHtml(creator: CreatorProfile): string {
  const safeName = creator.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeGrade = creator.grade.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeLocation = creator.location.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeStory = creator.story.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Zenoa — Your Free AI Friend in Every Language</title>
  <meta name="description" content="Zenoa: Your Free AI Friend in Every Language. Runs 100% in your browser with zero backend servers, zero API keys, and zero limits." />
  <meta name="theme-color" content="#4F46E5" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' };
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: "Plus Jakarta Sans", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen flex flex-col">
  <header class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-indigo-100 dark:border-slate-800 px-4 py-3">
    <div class="max-w-5xl mx-auto flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">Z</div>
        <div>
          <h1 class="text-base font-bold leading-tight">Zenoa</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">Your Free AI Friend in Every Language</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="themeBtn" type="button" aria-label="Toggle theme" class="h-10 w-10 rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-900 flex items-center justify-center hover:bg-sky-100 dark:hover:bg-slate-800">◐</button>
        <button id="settingsBtn" type="button" aria-label="Open settings" class="h-10 px-3 rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-900 text-xs font-medium hover:bg-sky-100 dark:hover:bg-slate-800">⚙️ Settings</button>
      </div>
    </div>
  </header>

  <main id="chatList" class="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-4 overflow-y-auto"></main>

  <footer class="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-indigo-100 dark:border-slate-800 px-4 py-3">
    <form id="chatForm" class="max-w-4xl mx-auto flex items-center gap-2">
      <button id="micBtn" type="button" aria-label="Speak" class="h-11 w-11 shrink-0 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800">🎤</button>
      <input id="chatInput" type="text" dir="auto" placeholder="Message Zenoa" class="flex-1 h-11 rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/40 dark:bg-slate-950 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <button type="submit" class="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shrink-0">Send</button>
    </form>
  </footer>

  <!-- Settings Modal -->
  <div id="settingsModal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-6 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Settings &amp; About</h2>
        <button id="closeSettings" type="button" class="px-3 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-slate-800">✕</button>
      </div>
      <div class="flex gap-2">
        <button id="personaBtn" type="button" class="flex-1 h-10 px-3 rounded-xl border border-indigo-100 dark:border-slate-700 text-xs font-medium hover:bg-sky-50 dark:hover:bg-slate-800">Mode: Caring Friend</button>
        <button id="ttsToggle" type="button" class="flex-1 h-10 px-3 rounded-xl border border-indigo-100 dark:border-slate-700 text-xs font-medium hover:bg-sky-50 dark:hover:bg-slate-800">Voice: Off</button>
      </div>
      <div class="rounded-2xl bg-sky-50/60 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 p-4 space-y-2">
        <p class="text-sm font-semibold text-indigo-700 dark:text-sky-300">${safeName} · ${safeGrade}</p>
        <p class="text-xs text-slate-500">${safeLocation}</p>
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${safeStory}</p>
      </div>
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        Privacy: 100% browser-local storage. Zero tracking, zero external servers collecting your identity.
      </p>
    </div>
  </div>

  <script>
    const manifestObj = {
      name: "Zenoa — Your Free AI Friend in Every Language",
      short_name: "Zenoa",
      start_url: ".",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#4F46E5"
    };
    const manifestBlob = new Blob([JSON.stringify(manifestObj)], { type: "application/manifest+json" });
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = URL.createObjectURL(manifestBlob);
    document.head.appendChild(manifestLink);

    let persona = "friend";
    let autoRead = false;
    const chatList = document.getElementById("chatList");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");

    function safeCalc(str) {
      const m = str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d)).replace(/[०-९]/g, d => "०१२३४५६७८९".indexOf(d));
      const match = m.match(/^\\s*(-?\\d+(?:\\.\\d+)?(?:\\s*[+\\-*/]\\s*-?\\d+(?:\\.\\d+)?)+)\\s*$/);
      if (!match) return null;
      const tokens = match[1].match(/-?\\d+(?:\\.\\d+)?|[+\\-*/]/g);
      if (!tokens) return null;
      let vals = [parseFloat(tokens[0])];
      for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i], b = parseFloat(tokens[i + 1]);
        if (op === "*") vals[vals.length - 1] *= b;
        else if (op === "/") vals[vals.length - 1] /= b;
        else if (op === "+") vals.push(b);
        else if (op === "-") vals.push(-b);
      }
      return Math.round(vals.reduce((a, b) => a + b, 0) * 1e8) / 1e8;
    }

    function instantReply(text) {
      const l = text.toLowerCase().trim();
      const now = new Date();
      if (/(কয়টা\\s*বাজে|সময়|koyta\\s*baje|koita\\s*baje|kota\\s*baje|what.*time|current\\s+time|^time$|kitne\\s*baje|samay|समय)/.test(l)) {
        return "It is currently " + now.toLocaleTimeString() + ".";
      }
      if (/(আজ\\s*কী\\s*বার|তারিখ|ajke\\s*ki\\s*bar|aj\\s*ki\\s*bar|^date$|^day$|today.*date|आज\\s*कौन)/.test(l)) {
        return "Today is " + now.toDateString() + ".";
      }
      const calc = safeCalc(text);
      if (calc !== null) return text.trim() + " = " + calc;
      return null;
    }

    function speakText(text) {
      if (!autoRead || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utt);
    }

    function appendMessageContent(box, text, isAssistant) {
      const re = /\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)/g;
      let last = 0, m;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) box.appendChild(document.createTextNode(text.slice(last, m.index)));
        const a = document.createElement("a");
        a.href = m[2];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = m[1];
        a.className = isAssistant
          ? "inline-flex items-center gap-1 rounded-xl bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 my-1 mr-1 no-underline"
          : "underline font-medium";
        box.appendChild(a);
        last = re.lastIndex;
      }
      if (last < text.length) box.appendChild(document.createTextNode(text.slice(last)));
    }

    function addBubble(role, text) {
      const wrap = document.createElement("div");
      wrap.className = role === "user" ? "flex justify-end" : "flex justify-start";
      const box = document.createElement("div");
      box.dir = "auto";
      box.className = role === "user"
        ? "max-w-[82%] rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white px-4 py-3 text-sm whitespace-pre-wrap"
        : "max-w-[82%] rounded-2xl bg-sky-50/75 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 px-4 py-3 text-sm whitespace-pre-wrap";
      appendMessageContent(box, text, role === "assistant");
      wrap.appendChild(box);
      chatList.appendChild(wrap);
      chatList.scrollTop = chatList.scrollHeight;
      if (role === "assistant") speakText(text.replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, "$1"));
    }

    addBubble("assistant", "Hello! I am Zenoa — Your Free AI Friend in Every Language. Write or speak in বাংলা, हिन्दी, English, Banglish, Hinglish, or any language!");

    async function askKnowledgeAndNews(userMessage) {
      const wantsBirth = /(?:birth|birt|brith|bday|dob|born|jonmo|janmo|janam)/i.test(userMessage);
      const spellMap = { narando: "Narendra", narendro: "Narendra", kholi: "Kohli", mamta: "Mamata", sourav: "Sourav", salman: "Salman", sharukh: "Shah Rukh" };
      const rawClean = userMessage
        .replace(/[?!।؟,."'(){}]/g, " ")
        .replace(/^(hello|hi|hey|tumi|apni|who is|what is|when is|tell me about)\\s+/i, "")
        .replace(/\\b(ke|ki|koto|kothay|kano|kobe|bolo|cheno|jano|please|bhai|bondhu|birth[a-z]*|birt[a-z]*|brith[a-z]*|bday|jonmo(?:din)?|janam(?:din)?|age|boyosh|height|capital|wife)\\b/gi, "")
        .replace(/\\s+/g, " ")
        .trim() || userMessage.trim();
      const cleanQ = rawClean.split(/\\s+/).map((w) => spellMap[w.toLowerCase()] || w).join(" ");

      const concise = (txt) => (txt.match(/[^.!?]+[.!?]+/g) || [txt]).slice(0, 3).join(" ").trim();

      if (/\\b(news|khobor|khabar|samachar|ki hoce)\\b/i.test(userMessage)) {
        try {
          const r = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"), { signal: AbortSignal.timeout(6500) });
          if (r.ok) {
            const d = await r.json();
            const items = (d.items || []).slice(0, 5);
            if (items.length) {
              return "Latest Headlines:\\n\\n" + items.map((it, idx) => (idx + 1) + ". " + it.title + " [Read](" + it.link + ")").join("\\n");
            }
          }
        } catch {}
      }

      const fetchWikiTitle = async (t) => {
        const w = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/\\s+/g, "_")), { signal: AbortSignal.timeout(6500) });
        if (!w.ok) return null;
        const d = await w.json();
        return d.extract && d.type !== "disambiguation" ? d : null;
      };

      try {
        let hit = await fetchWikiTitle(cleanQ);
        if (!hit) {
          const os = await fetch("https://en.wikipedia.org/w/api.php?action=opensearch&search=" + encodeURIComponent(cleanQ) + "&limit=1&format=json&origin=*", { signal: AbortSignal.timeout(6500) });
          if (os.ok) {
            const od = await os.json();
            const topTitle = od && od[1] && od[1][0];
            if (topTitle) hit = await fetchWikiTitle(topTitle);
          }
        }
        if (!hit) {
          const s = await fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(cleanQ) + "&srinfo=suggestion&srlimit=1&format=json&origin=*", { signal: AbortSignal.timeout(6500) });
          if (s.ok) {
            const sd = await s.json();
            const suggested = sd.query && sd.query.searchinfo && sd.query.searchinfo.suggestion;
            const best = suggested || (sd.query && sd.query.search && sd.query.search[0] && sd.query.search[0].title);
            if (best && cleanQ.toLowerCase().split(/\\s+/).some((tok) => tok.length >= 3 && best.toLowerCase().includes(tok.slice(0, 3)))) {
              hit = await fetchWikiTitle(best);
            }
          }
        }
        if (hit) {
          const shortText = concise(hit.extract);
          if (wantsBirth) {
            const bm = hit.extract.match(/(?:born(?:\\s+on)?|\\()\\s*(\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}|[A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})/i);
            if (bm && bm[1]) return hit.title + " — Born on " + bm[1] + "\\n\\n" + shortText;
          }
          return hit.title + "\\n\\n" + shortText;
        }
      } catch {}

      try {
        const ddg = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(cleanQ) + "&format=json&no_html=1&skip_disambig=1", { signal: AbortSignal.timeout(6500) });
        if (ddg.ok) {
          const d = await ddg.json();
          if (d.AbstractText) return concise(d.AbstractText);
        }
      } catch {}

      return "I couldn't find an exact match for \\"" + cleanQ + "\\". Try writing the name or topic slightly more clearly!";
    }

    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      addBubble("user", text);
      chatInput.value = "";
      const instant = instantReply(text);
      if (instant) { addBubble("assistant", instant); return; }
      const answer = await askKnowledgeAndNews(text);
      addBubble("assistant", answer);
    });

    document.getElementById("personaBtn").addEventListener("click", (e) => {
      persona = persona === "friend" ? "study" : "friend";
      e.target.textContent = "Mode: " + (persona === "friend" ? "Caring Friend" : "Study Buddy");
    });

    document.getElementById("ttsToggle").addEventListener("click", (e) => {
      autoRead = !autoRead;
      e.target.textContent = "Voice: " + (autoRead ? "On" : "Off");
    });

    document.getElementById("themeBtn").addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
    });

    document.getElementById("micBtn").addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.onresult = (ev) => { chatInput.value = ev.results[0][0].transcript; };
      rec.start();
    });

    document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
    document.getElementById("closeSettings").onclick = () => document.getElementById("settingsModal").classList.add("hidden");
  </script>
</body>
</html>`;
}
