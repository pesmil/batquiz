// results.js – the results page (results.html): reads the answers from the Google Sheet
// (through the Apps Script web app, see apps-script.gs → doGet) and compares them
// with the reference identifications in quizzes/….js
(function () {
  "use strict";
  const C = window.QUIZ_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const intro = $("resultsIntro"), box = $("quizResults");

  if (C.showResults === false) {
    intro.textContent = "The survey is still running. The results will be published here once it has closed.";
    return;
  }
  if (!C.scriptUrl) {
    intro.textContent = "No storage URL is set in config.js, so there are no results to show yet.";
    return;
  }

  // ---------- load everything: quiz files (one after the other) + answers ----------
  const quizzes = [];
  const loadQuizzes = (C.quizzes || []).reduce((chain, quiz) => chain
    .then(() => window.PHOTOS.loadQuestions(quiz.id))
    .then((list) => { if (list && list.length) quizzes.push({ quiz, list }); }), Promise.resolve());
  const loadAnswers = fetch(C.scriptUrl + "?version=" + encodeURIComponent(C.version || ""))
    .then((r) => r.json());

  Promise.all([loadQuizzes, loadAnswers]).then(([, data]) => {
    if (!data || !data.ok) throw new Error("bad answer");
    show(data.rows || []);
  }).catch(() => {
    intro.textContent = "The results could not be loaded. Please try again later.";
  });

  // ---------- comparing an answer with the reference ----------
  // "Pipistrellus cf. pygmaeus" → ["pipistrellus", "pygmaeus"]; flags complex / genus-only answers
  const LEVEL_WORDS = /\b(complex|group|agg|aggregate|s\.l\.|sensu lato)\b/;
  function words(s) {
    const t = String(s).toLowerCase().replace(/\b(cf|aff)\.?\s/g, " ").replace(/[^a-z.\s-]/g, " ");
    const level = LEVEL_WORDS.test(t);
    const w = t.replace(LEVEL_WORDS, " ").split(/\s+/).filter((x) => x && !/^(sp|spp|spec)\.?$/.test(x));
    return { genus: w[0] || "", species: w[1] || "", level };
  }
  // 1 = correct species, 2 = correct genus or complex only, 3 = other answer
  function grade(answer, reference) {
    const a = words(answer), r = words(reference);
    if (!a.genus || a.genus !== r.genus) return 3;
    if (!r.species) return 1;                                   // reference is a genus
    if (a.species === r.species) return a.level && !r.level ? 2 : 1;
    if (!a.species) return 2;                                   // only the genus given
    return 3;                                                   // other species of the same genus
  }

  // ---------- page ----------
  function show(rows) {
    // rows: [quiz, photo_id, answer, answer_rank, seconds, participant]
    const people = new Set(rows.map((r) => r[5]));
    intro.textContent = rows.length
      ? rows.length + " answers from " + people.size + (people.size === 1 ? " participant" : " participants") +
        ". The figures are calculated live from the survey answers."
      : "No answers yet.";
    if (!rows.length) return;
    $("legend").hidden = false;

    quizzes.forEach(({ quiz, list }) => {
      const ids = new Set(list.map((q) => q.id));
      // older answers have no quiz name: assign them by observation id
      const mine = rows.filter((r) => r[0] === quiz.id || (!r[0] && ids.has(r[1])));
      if (mine.length) renderQuiz(quiz, list, mine);
    });
  }

  function renderQuiz(quiz, list, rows) {
    const sec = document.createElement("section");
    sec.className = "quizresult";
    sec.innerHTML =
      '<h2><i></i></h2>' +
      '<div class="facts"></div>' +
      '<div class="sortbar"><label>Sort <select><option value="hard">hardest first</option><option value="easy">easiest first</option><option value="quiz">quiz order</option></select></label></div>' +
      '<ol class="obslist"></ol>' +
      '<h3>By species</h3>' +
      '<div class="tablewrap"><table class="speciestable"><thead><tr><th scope="col">Reference</th><th scope="col">Observations</th><th scope="col">Answers</th><th scope="col">Correct species</th><th scope="col">Most frequent other answer</th></tr></thead><tbody></tbody></table></div>';
    sec.querySelector("h2 i").textContent = quiz.name;
    box.appendChild(sec);

    // one entry per observation
    const obs = list.map((q, i) => {
      const answers = rows.filter((r) => r[1] === q.id);
      const counts = [0, 0, 0, 0];
      answers.forEach((r) => counts[grade(r[2], q.reference)]++);
      return { q, i, answers, counts, n: answers.length, share: answers.length ? counts[1] / answers.length : 0 };
    }).filter((o) => o.n);

    const all = obs.reduce((t, o) => t.map((v, k) => v + o.counts[k]), [0, 0, 0, 0]);
    const n = all[1] + all[2] + all[3];
    const facts = sec.querySelector(".facts");
    [["Participants", new Set(rows.map((r) => r[5])).size],
     ["Answers", n],
     ["Correct species", pct(all[1], n)],
     ["Correct genus or better", pct(all[1] + all[2], n)]].forEach(([label, value]) => {
      const d = document.createElement("div");
      d.innerHTML = '<span class="label"></span><strong></strong>';
      d.firstChild.textContent = label; d.lastChild.textContent = value;
      facts.appendChild(d);
    });

    const ol = sec.querySelector(".obslist");
    function draw(order) {
      const sorted = obs.slice().sort(order === "quiz" ? (a, b) => a.i - b.i
        : order === "easy" ? (a, b) => b.share - a.share || b.n - a.n
        : (a, b) => a.share - b.share || b.n - a.n);
      ol.innerHTML = "";
      sorted.forEach((o) => ol.appendChild(obsItem(o)));
    }
    sec.querySelector("select").addEventListener("change", (e) => draw(e.target.value));
    draw("hard");

    // thumbnails: resolve the photos once (iNaturalist or local files)
    window.PHOTOS.load(obs.map((o) => o.q)).then((loaded) => {
      loaded.forEach((q) => {
        const o = obs.find((x) => x.q.id === q.id);
        if (o) { o.thumb = q.imgs[0] || ""; }
      });
      ol.querySelectorAll("li").forEach((li) => {
        const o = obs.find((x) => x.q.id === li.dataset.id);
        const img = li.querySelector("img");
        if (o && o.thumb) img.src = o.thumb; else img.parentElement.classList.add("nothumb");
      });
    });

    // species table
    const bySpecies = {};
    obs.forEach((o) => {
      const s = bySpecies[o.q.reference] || (bySpecies[o.q.reference] = { obs: 0, answers: [], counts: [0, 0, 0, 0] });
      s.obs++; s.answers.push(...o.answers.map((r) => r[2])); o.counts.forEach((v, k) => { s.counts[k] += v; });
    });
    const tbody = sec.querySelector("tbody");
    Object.keys(bySpecies).sort((a, b) => share(bySpecies[a]) - share(bySpecies[b])).forEach((ref) => {
      const s = bySpecies[ref];
      const wrong = topAnswers(s.answers.filter((a) => grade(a, ref) === 3), 1)[0];
      const tr = document.createElement("tr");
      tr.innerHTML = '<td class="taxon"></td><td class="num"></td><td class="num"></td><td class="num"></td><td></td>';
      const td = tr.children;
      td[0].textContent = ref; td[1].textContent = s.obs; td[2].textContent = s.answers.length;
      td[3].textContent = pct(s.counts[1], s.answers.length);
      td[4].textContent = wrong ? wrong.label + " (" + wrong.count + "×)" : "–";
      tbody.appendChild(tr);
    });
    function share(s) { return s.answers.length ? s.counts[1] / s.answers.length : 0; }
  }

  function obsItem(o) {
    const li = document.createElement("li");
    li.dataset.id = o.q.id;
    const link = inatLink(o.q);
    li.innerHTML =
      '<a class="obsthumb"><img alt=""></a>' +
      '<div class="obsbody">' +
        '<div class="obshead"><span class="taxon ref"></span><span class="obsmeta"></span></div>' +
        '<div class="stack" role="img"></div>' +
        '<p class="obsnums"></p>' +
        '<p class="obstop"></p>' +
      "</div>";
    const a = li.querySelector(".obsthumb");
    if (link) { a.href = link; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", "Observation " + o.q.id + " on iNaturalist"); }
    else a.removeAttribute("href");
    li.querySelector(".ref").textContent = o.q.reference;
    const secs = median(o.answers.map((r) => r[4]).filter((x) => x > 0));
    li.querySelector(".obsmeta").textContent = o.q.id + " · " + o.n + (o.n === 1 ? " answer" : " answers") + (secs ? " · median " + secs + " s" : "");

    // stacked bar: correct species / genus or complex / other
    const names = ["", "Correct species", "Correct genus or complex only", "Other answer"];
    const stack = li.querySelector(".stack");
    stack.setAttribute("aria-label", [1, 2, 3].map((k) => names[k] + " " + pct(o.counts[k], o.n)).join(", "));
    [1, 2, 3].forEach((k) => {
      if (!o.counts[k]) return;
      const seg = document.createElement("span");
      seg.className = "seg s" + k;
      seg.style.flexGrow = o.counts[k];
      seg.title = names[k] + ": " + o.counts[k] + " of " + o.n + " (" + pct(o.counts[k], o.n) + ")";
      stack.appendChild(seg);
    });
    li.querySelector(".obsnums").textContent =
      pct(o.counts[1], o.n) + " correct species · " + pct(o.counts[2], o.n) + " genus or complex · " + pct(o.counts[3], o.n) + " other";
    li.querySelector(".obstop").textContent = "Most frequent: " +
      topAnswers(o.answers.map((r) => r[2]), 3).map((t) => (grade(t.label, o.q.reference) === 1 ? "✓ " : "") + t.label + " (" + t.count + "×)").join(", ");
    return li;
  }

  // ---------- helpers ----------
  // groups spelling variants ("pipistrellus pygmaeus" = "Pipistrellus pygmaeus ") and
  // shows the most common spelling
  function topAnswers(list, k) {
    const groups = {};
    list.forEach((a) => {
      const w = words(a);
      const key = [w.genus, w.species, w.level ? "c" : ""].join(" ").trim() || a.trim().toLowerCase();
      const g = groups[key] || (groups[key] = { count: 0, forms: {} });
      g.count++; g.forms[a.trim()] = (g.forms[a.trim()] || 0) + 1;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count).slice(0, k).map((g) => ({
      count: g.count,
      label: tidy(Object.keys(g.forms).sort((a, b) => g.forms[b] - g.forms[a])[0]),
    }));
  }
  function inatLink(q) {
    const p = String((q.images || [])[0] || "").match(/^inat:\s*(\d+)/i) || String((q.images || [])[0] || "").match(/observations\/(\d+)/);
    return p ? "https://www.inaturalist.org/observations/" + p[1] : "";
  }
  // "pipistrellus  Pipistrellus" → "Pipistrellus pipistrellus"
  function tidy(s) { s = s.replace(/\s+/g, " ").trim().toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pct(a, b) { return b ? Math.round(a / b * 100) + "%" : "–"; }
  function median(xs) {
    if (!xs.length) return 0;
    xs = xs.slice().sort((a, b) => a - b);
    const m = Math.floor(xs.length / 2);
    return Math.round(xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2);
  }
})();
