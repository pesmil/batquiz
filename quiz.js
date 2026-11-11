// quiz.js – the survey itself (quiz.html): photo gallery, answers, sending, results
(function () {
  "use strict";
  const C = window.QUIZ_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const INAT_CHIROPTERA = 40268;
  const creditOf = window.PHOTOS.creditOf;   // photos.js

  // ---------- state ----------
  const session = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 13);
  // which quiz: quiz.html?quiz=plecotus → the entry with id "plecotus" in config.js
  const quizId = new URLSearchParams(location.search).get("quiz") || "";
  const quiz = (C.quizzes || []).find((z) => z.id === quizId);
  let order = [];                            // the observations in random order, filled at the end
  const answers = [];
  let idx = 0, obsStart = 0, picked = null, viewed = new Set();

  // ---------- carousel (used for the main gallery and the lightbox) ----------
  function Carousel(opts) {
    const track = opts.track, counter = opts.counter, prev = opts.prev, next = opts.next, thumbs = opts.thumbs;
    let imgs = [], cur = 0, raf = 0;
    function set(list, start) {
      imgs = list; cur = 0; track.innerHTML = "";
      if (thumbs) thumbs.innerHTML = "";
      list.forEach((src, i) => {
        const s = document.createElement(opts.slideTag || "div");
        s.className = "slide";
        if (s.tagName === "BUTTON") { s.type = "button"; s.setAttribute("aria-label", "Enlarge photo " + (i + 1)); }
        const im = document.createElement("img");
        im.src = src; im.alt = "Photo " + (i + 1) + " of " + list.length; im.draggable = false;
        if (i > 1) im.loading = "lazy";
        s.appendChild(im);
        if (opts.onSlideClick) s.addEventListener("click", (e) => opts.onSlideClick(i, e));
        track.appendChild(s);
        if (thumbs) {
          const t = document.createElement("button");
          t.type = "button"; t.className = "thumb"; t.setAttribute("aria-label", "Show photo " + (i + 1));
          const ti = document.createElement("img"); ti.src = src; ti.alt = "";
          t.appendChild(ti); t.addEventListener("click", () => go(i));
          thumbs.appendChild(t);
        }
      });
      const multi = list.length > 1;
      prev.hidden = next.hidden = counter.hidden = !multi;
      if (thumbs) thumbs.hidden = !multi;
      go(start || 0, true);
    }
    function go(i, instant) {
      cur = Math.max(0, Math.min(imgs.length - 1, i));
      track.scrollTo({ left: cur * track.clientWidth, behavior: instant ? "instant" : "smooth" });
      paint();
    }
    function paint() {
      counter.textContent = (cur + 1) + " / " + imgs.length;
      prev.disabled = cur === 0; next.disabled = cur === imgs.length - 1;
      if (thumbs) [...thumbs.children].forEach((t, i) => t.setAttribute("aria-current", i === cur ? "true" : "false"));
      if (opts.credit) { const c = creditOf(imgs[cur] || ""); opts.credit.textContent = c; opts.credit.hidden = !c; }
      if (opts.onChange) opts.onChange(cur);
    }
    track.addEventListener("scroll", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = track.clientWidth || 1;
        const i = Math.round(track.scrollLeft / w);
        if (i !== cur && i >= 0 && i < imgs.length) { cur = i; paint(); }
      });
    }, { passive: true });
    prev.addEventListener("click", () => go(cur - 1));
    next.addEventListener("click", () => go(cur + 1));
    window.addEventListener("resize", () => { track.scrollTo({ left: cur * track.clientWidth, behavior: "instant" }); });
    return { set, go, get index() { return cur; }, get count() { return imgs.length; } };
  }

  const main = Carousel({
    track: $("track"), counter: $("imgCounter"), prev: $("prevBtn"), next: $("nextImgBtn"), thumbs: $("thumbs"), credit: $("credit"),
    slideTag: "button",
    onSlideClick: (i) => openLightbox(order[idx].imgs, i, (j) => main.go(j, true)),
    onChange: (i) => viewed.add(i),
  });
  let lbDone = null;
  const lb = Carousel({
    track: $("lbTrack"), counter: $("lbCounter"), prev: $("lbPrev"), next: $("lbNext"), credit: $("lbCredit"),
    onSlideClick: (i, e) => {
      if (!canZoom) return;
      const img = e.currentTarget.querySelector("img");
      if (zoomedImg) zoomOut(); else zoomIn(img, e);
    },
    onChange: (i) => { zoomOut(); if (!$("screenQuiz").hidden) viewed.add(i); },
  });

  // ---------- click-to-zoom in the lightbox (mouse / trackpad) ----------
  // Touch screens keep the browser's own pinch-zoom instead.
  const canZoom = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let zoomedImg = null;
  $("lightbox").classList.toggle("canzoom", canZoom);
  $("lbHint").textContent = canZoom ? "Click photo to zoom" : "Pinch to zoom";
  // Map the mouse position over the frame to a zoom origin that keeps the
  // magnified photo filling the frame (no black letterbox while zoomed).
  function setOrigin(img, e) {
    const s = parseFloat(img.dataset.scale || "1");
    const W = img.offsetWidth, H = img.offsetHeight;
    const ratio = img.naturalWidth / img.naturalHeight;
    const cw = Math.min(W, H * ratio), ch = Math.min(H, W / ratio);   // size of the visible photo
    const ox = (W - cw) / 2, oy = (H - ch) / 2;                       // letterbox offsets
    const r = img.parentElement.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left - img.offsetLeft) / W));
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top - img.offsetTop) / H));
    const axis = (o, c, L, f) => {
      const lo = s * o / (s - 1), hi = (s * (o + c) - L) / (s - 1);
      return lo > hi ? L / 2 : lo + f * (hi - lo);
    };
    img.style.transformOrigin = axis(ox, cw, W, fx) + "px " + axis(oy, ch, H, fy) + "px";
  }
  function zoomIn(img, e) {
    if (!img || !img.naturalWidth) return;
    // zoom up to the photo's full resolution (at least 2x, at most 4x)
    const shownW = Math.min(img.offsetWidth, img.offsetHeight * img.naturalWidth / img.naturalHeight);
    const scale = Math.max(2, Math.min(4, img.naturalWidth / shownW));
    img.dataset.scale = scale;
    setOrigin(img, e);
    img.style.transform = "scale(" + scale.toFixed(2) + ")";
    img.classList.add("zoomed");
    $("lbTrack").classList.add("locked");
    $("lbHint").textContent = "Move the mouse to explore · click to zoom out";
    zoomedImg = img;
  }
  function zoomOut() {
    if (!zoomedImg) return;
    zoomedImg.style.transform = ""; zoomedImg.classList.remove("zoomed");
    $("lbTrack").classList.remove("locked");
    $("lbHint").textContent = "Click photo to zoom";
    zoomedImg = null;
  }
  $("lbTrack").addEventListener("mousemove", (e) => { if (zoomedImg) setOrigin(zoomedImg, e); });


  // ---------- quiz ----------
  function showObservation() {
    const q = order[idx];
    viewed = new Set();
    main.set(q.imgs, 0);
    $("count").textContent = quiz.name + " · Observation " + (idx + 1) + " of " + order.length;
    $("barFill").style.width = (idx / order.length * 100) + "%";
    $("swipeHint").textContent = q.imgs.length > 1 ? q.imgs.length + " photos of the same individual. Swipe, use the arrows or click the thumbnails." : "";
    $("taxonInput").value = ""; $("featuresInput").value = ""; picked = null; $("chosen").textContent = "";
    $("nextBtn").textContent = idx === order.length - 1 ? "Finish" : "Next observation";
    updateNext(); closeSuggest();
    obsStart = performance.now();
    if (order[idx + 1]) order[idx + 1].imgs.forEach(preload);
    $("taxonInput").focus({ preventScroll: true });
  }
  function updateNext() {
    const ok = $("taxonInput").value.trim() && $("featuresInput").value.trim();
    $("nextBtn").disabled = !ok;
    $("nextNote").hidden = !!ok;
  }
  $("featuresInput").addEventListener("input", updateNext);

  $("answerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("nextBtn").disabled) return;
    const q = order[idx];
    const row = {
      session_id: session, version: C.version || "", quiz: quizId, photo_id: q.id, position: idx + 1,
      answer: $("taxonInput").value.trim(),
      answer_inat_id: picked ? picked.id : "", answer_rank: picked ? picked.rank : "",
      features: $("featuresInput").value.trim(),
      seconds_on_photo: Math.round((performance.now() - obsStart) / 1000),
      photos_viewed: viewed.size + "/" + q.imgs.length,
    };
    answers.push({ q, row });
    send(row, $("sendStatus"));
    idx++;
    if (idx < order.length) { showObservation(); window.scrollTo({ top: 0 }); }
    else finish();
  });

  function finish() {
    $("barFill").style.width = "100%";
    $("screenQuiz").hidden = true; $("screenEnd").hidden = false; window.scrollTo(0, 0);
  }

  // ---------- end ----------
  $("commentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = $("commentInput").value.trim();
    if (txt) send({ session_id: session, version: C.version || "", quiz: quizId, photo_id: "_comment", position: "", answer: "", features: txt }, $("endStatus"));
    $("commentForm").hidden = true;
    renderResults();
    $("resultsWrap").hidden = false;
  });
  function renderResults() {
    const box = $("results");
    answers.slice().sort((a, b) => a.q.id.localeCompare(b.q.id)).forEach(({ q, row }) => {
      const el = document.createElement("div"); el.className = "res";
      el.innerHTML =
        '<button type="button" class="thumbbtn"><img alt=""><span class="pill"></span></button>' +
        '<div class="cols">' +
          '<div><span class="label">Your answer</span><span class="val taxon a"></span></div>' +
          '<div><span class="label">Reference</span><span class="val taxon ref"></span></div>' +
          '<div class="feat"></div>' +
          '<div class="pid"></div>' +
        "</div>";
      const tb = el.querySelector(".thumbbtn");
      tb.setAttribute("aria-label", "View photos of " + q.id);
      tb.querySelector("img").src = q.imgs[0];
      const pill = tb.querySelector(".pill");
      if (q.imgs.length > 1) pill.textContent = q.imgs.length + " photos"; else pill.hidden = true;
      tb.addEventListener("click", () => openLightbox(q.imgs, 0));
      el.querySelector(".a").textContent = row.answer;
      el.querySelector(".ref").textContent = q.reference || "–";
      el.querySelector(".feat").textContent = q.note || "";
      el.querySelector(".pid").textContent = q.id;
      box.appendChild(el);
    });
  }

  // ---------- sending ----------
  let pending = 0;
  function send(row, statusEl) {
    if (!C.scriptUrl) { console.log("[test mode] answer", row); return; }
    pending++;
    const attempt = (n) => fetch(C.scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(row),
    }).then(() => { pending--; statusEl.textContent = ""; statusEl.classList.remove("err"); })
      .catch(() => {
        if (n < 3) setTimeout(() => attempt(n + 1), 1500 * (n + 1));
        else { pending--; statusEl.textContent = "An answer could not be sent. Please check your connection; the survey keeps working."; statusEl.classList.add("err"); }
      });
    attempt(0);
  }
  window.addEventListener("beforeunload", (e) => {
    const midQuiz = !$("screenQuiz").hidden && idx > 0;
    if (pending > 0 || midQuiz) { e.preventDefault(); e.returnValue = ""; }
  });

  // ---------- lightbox ----------
  let lbReturnFocus = null;
  function openLightbox(imgs, start, onClose) {
    lbDone = onClose || null; lbReturnFocus = document.activeElement;
    $("lightbox").hidden = false;
    document.body.style.overflow = "hidden";
    lb.set(imgs, start);
    $("lightboxClose").focus();
  }
  function closeLightbox() {
    if ($("lightbox").hidden) return;
    zoomOut();
    $("lightbox").hidden = true;
    document.body.style.overflow = "";
    if (lbDone) lbDone(lb.index);
    if (lbReturnFocus) lbReturnFocus.focus({ preventScroll: true });
  }
  $("lightboxClose").addEventListener("click", closeLightbox);

  // keyboard: ←/→ browse photos (not while typing), Esc closes the lightbox
  document.addEventListener("keydown", (e) => {
    const lbOpen = !$("lightbox").hidden;
    if (e.key === "Escape" && lbOpen) { closeLightbox(); return; }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    if (typing && !lbOpen) return;
    const c = lbOpen ? lb : ($("screenQuiz").hidden ? null : main);
    if (!c) return;
    e.preventDefault();
    c.go(c.index + (e.key === "ArrowRight" ? 1 : -1));
  });

  // ---------- iNaturalist taxon suggestions ----------
  const input = $("taxonInput"), list = $("suggestList");
  let timer = null, ctrl = null, items = [], active = -1;
  input.addEventListener("input", () => {
    picked = null; $("chosen").textContent = ""; updateNext();
    if (C.inatSuggestions === false) return;
    clearTimeout(timer);
    const term = input.value.trim();
    if (term.length < 3) { closeSuggest(); return; }
    timer = setTimeout(() => lookup(term), 250);
  });
  function lookup(term) {
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    const url = "https://api.inaturalist.org/v1/taxa/autocomplete?per_page=8&locale=en&taxon_id=" + INAT_CHIROPTERA + "&q=" + encodeURIComponent(term);
    fetch(url, { signal: ctrl.signal }).then((r) => r.json()).then((d) => {
      items = (d.results || []).filter((t) => t.is_active !== false);
      renderSuggest();
    }).catch(() => closeSuggest()); // offline or blocked: free text still works
  }
  function renderSuggest() {
    list.innerHTML = ""; active = -1;
    if (!items.length) { closeSuggest(); return; }
    items.forEach((t, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option"); li.id = "opt" + i;
      // iNat style: common name bold, then "Rank Scientific name" in grey
      const cn = document.createElement("span"); cn.className = "cn";
      cn.textContent = t.preferred_common_name || t.name;
      const sci = document.createElement("span"); sci.className = "sci";
      const isItalic = ["species", "subspecies", "genus", "subgenus", "complex", "section"].includes(t.rank);
      if (t.rank !== "species") sci.append(t.rank.charAt(0).toUpperCase() + t.rank.slice(1) + " ");
      const nm = document.createElement(isItalic ? "i" : "span"); nm.textContent = t.name;
      sci.appendChild(nm);
      li.append(cn, sci);
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(i); });
      list.appendChild(li);
    });
    const src = document.createElement("li"); src.className = "src"; src.setAttribute("aria-hidden", "true");
    src.textContent = "Suggestions from iNaturalist · free text is fine too";
    list.appendChild(src);
    list.hidden = false; input.setAttribute("aria-expanded", "true");
  }
  function choose(i) {
    const t = items[i]; if (!t) return;
    input.value = t.name; picked = { id: t.id, rank: t.rank };
    $("chosen").textContent = "✓ iNaturalist taxon " + t.id + " (" + t.rank + ")";
    closeSuggest(); updateNext(); $("featuresInput").focus();
  }
  function closeSuggest() { list.hidden = true; list.innerHTML = ""; items = []; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      [...list.querySelectorAll('[role="option"]')].forEach((li, i) => li.setAttribute("aria-selected", i === active ? "true" : "false"));
      input.setAttribute("aria-activedescendant", "opt" + active);
    } else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") closeSuggest();
  });
  input.addEventListener("blur", () => setTimeout(closeSuggest, 120));

  function preload(src) { const i = new Image(); i.src = src; }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // ---------- start: load the photos, then show the first observation ----------
  // photos.js fetches iNaturalist photos and drops photos that do not load;
  // observations left without any photo are skipped.
  if (!C.scriptUrl) $("testBanner").hidden = false;
  if (!quizId) location.replace("index.html#quizList");   // no quiz chosen yet (e.g. "Quiz" in the menu)
  else if (!quiz) $("count").textContent = "Quiz not found. Please choose a quiz on the start page.";
  else {
    document.title = "Bat Photo ID Survey – " + quiz.name;
    window.PHOTOS.loadQuestions(quiz.id)
      .then((list) => window.PHOTOS.load(list || []))
      .then((Q) => {
        order = shuffle(Q.filter((q) => q.imgs.length));
        if (order.length) showObservation();
        else $("count").textContent = "No photos could be loaded for this quiz.";
      });
  }
})();
