// photos.js – loads the quiz files and turns their photo entries into real photo addresses
// (used by index.html and quiz.html)
//
// A photo in a quiz file (quizzes/….js) can be
//   a file in images/:      "pippyg_1 - © Mateusz Ciechanowski CC BY-NC.jpg"
//   an iNaturalist photo:   "inat:123456789"     all photos of observation 123456789
//                           "inat:123456789/2"   only photo no. 2 of that observation
//                           or the link "https://www.inaturalist.org/observations/123456789"
// Author and licence are shown under each photo: for files they are read from the
// part after "©" in the file name, for iNaturalist photos they come from iNaturalist.
(function () {
  "use strict";
  const API = "https://api.inaturalist.org/v1/observations";
  const INAT_CREDITS = {};                       // photo address → "© Author · Licence (iNaturalist)"

  // ---------- local files ----------
  function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  // adds "images/" and makes spaces and © safe for the browser
  function fileUrl(name) {
    if (name.indexOf("/") < 0) name = "images/" + name;
    return name.split("/").map((part) => encodeURIComponent(safeDecode(part))).join("/");
  }
  // "… © Mateusz Ciechanowski CC BY-NC.jpg" → "© Mateusz Ciechanowski · CC BY-NC"
  const LICENCE = /^(.*?)\s*\b(CC0(?:[ -]\d\.\d)?|CC[ -]BY(?:-(?:NC|SA|ND))*(?:[ -]\d\.\d)?|alle Rechte vorbehalten|all rights reserved|public domain|gemeinfrei)$/i;
  function creditOf(src) {
    if (INAT_CREDITS[src]) return INAT_CREDITS[src];
    const name = safeDecode(String(src).split("/").pop()).replace(/\.[a-z0-9]+$/i, "");
    const at = name.indexOf("©");
    if (at < 0) return "";
    const rest = name.slice(at + 1).trim();
    const m = rest.match(LICENCE);
    let author = m ? m[1].trim() : rest, licence = m ? m[2] : "";
    if (/^alle Rechte vorbehalten$/i.test(licence)) licence = "All rights reserved";
    if (/^gemeinfrei$/i.test(licence)) licence = "Public domain";
    return "© " + author + (licence ? " · " + licence : "");
  }

  // ---------- iNaturalist ----------
  // "inat:123/2" or an observation link → { obs: "123", nr: 2 } (nr 0 = all photos)
  function parseInat(entry) {
    const m = entry.match(/^inat:\s*(\d+)(?:\/(\d+))?$/i) || entry.match(/inaturalist\.org\/observations\/(\d+)/i);
    return m ? { obs: m[1], nr: m[2] ? parseInt(m[2], 10) : 0 } : null;
  }
  // "(c) Jane Doe, some rights reserved (CC BY-NC)" + "cc-by-nc" → "© Jane Doe · CC BY-NC (iNaturalist)"
  function inatCredit(photo) {
    const name = String(photo.attribution || "").replace(/^\s*\(c\)\s*/i, "").split(",")[0].trim();
    const code = photo.license_code;
    const licence = !code ? "All rights reserved" : code === "cc0" ? "CC0" : code.toUpperCase().replace(/^CC-/, "CC ");
    return "© " + (name || "unknown") + " · " + licence + " (iNaturalist)";
  }
  // Asks iNaturalist for all observations at once → { "123": [photo, …], … }
  // If iNaturalist cannot be reached, those photos are simply left out.
  function fetchObservations(ids) {
    if (!ids.length) return Promise.resolve({});
    return fetch(API + "?per_page=200&id=" + ids.join(","))
      .then((r) => r.json())
      .then((d) => {
        const byId = {};
        (d.results || []).forEach((o) => { byId[String(o.id)] = o.photos || []; });
        return byId;
      })
      .catch(() => ({}));
  }

  // ---------- safety net ----------
  // Only keep photos that actually load, so a deleted file or a typo in
  // a quiz file shows no empty thumbnail.
  function imageExists(src) {
    return new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok(true);
      i.onerror = () => ok(false);
      i.src = src;
    });
  }

  // Returns the questions, each with .imgs = list of working photo addresses.
  function load(questions) {
    const Q = questions.map((q) => Object.assign({}, q, {
      imgs: (q.images || []).map((s) => String(s || "").trim()).filter(Boolean),
    }));
    const ids = new Set();
    Q.forEach((q) => q.imgs.forEach((e) => { const p = parseInat(e); if (p) ids.add(p.obs); }));
    return fetchObservations([...ids]).then((byId) => {
      Q.forEach((q) => {
        q.imgs = q.imgs.flatMap((e) => {
          const p = parseInat(e);
          if (!p) return [fileUrl(e)];
          let photos = byId[p.obs] || [];
          if (p.nr) photos = photos.slice(p.nr - 1, p.nr);
          return photos.map((ph) => {
            const url = String(ph.url || "").replace(/\/square\./, "/large.");   // 1024 px version
            INAT_CREDITS[url] = inatCredit(ph);
            return url;
          });
        });
      });
      return Promise.all(Q.map((q) => Promise.all(q.imgs.map(imageExists))
        .then((ok) => { q.imgs = q.imgs.filter((src, i) => ok[i]); })));
    }).then(() => Q);
  }

  // ---------- question files ----------
  // Loads quizzes/<id>.js and returns its list of observations.
  function loadQuestions(id) {
    return new Promise((ok) => {
      window.QUIZ_QUESTIONS = undefined;
      const s = document.createElement("script");
      s.src = "quizzes/" + encodeURIComponent(id) + ".js";
      s.onload = () => { ok(Array.isArray(window.QUIZ_QUESTIONS) ? window.QUIZ_QUESTIONS : []); window.QUIZ_QUESTIONS = undefined; s.remove(); };
      s.onerror = () => { ok(null); s.remove(); };   // file missing
      document.head.appendChild(s);
    });
  }

  window.PHOTOS = { load, creditOf, loadQuestions };
})();