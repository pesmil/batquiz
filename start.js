// start.js – fills the start page (index.html): texts from config.js and the list of quizzes
(function () {
  "use strict";
  const C = window.QUIZ_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  $("startTitle").textContent = C.title || "Bat photo identification";
  $("startIntro").textContent = C.intro || "";
  $("startConsent").textContent = C.consent || "";
  (C.instructions || []).forEach((t) => { const li = document.createElement("li"); li.textContent = t; $("startHow").appendChild(li); });
  if (!C.scriptUrl) $("testBanner").hidden = false;

  // one row per quiz: name, number of observations, estimated time, start button
  const buttons = [];
  (C.quizzes || []).forEach((quiz) => {
    const li = document.createElement("li");
    li.innerHTML = '<div><span class="qname"></span><span class="qmeta">…</span></div><button class="btn" type="button" disabled>Start</button>';
    li.querySelector(".qname").textContent = quiz.name;
    const btn = li.querySelector("button");
    btn.setAttribute("aria-label", "Start the " + quiz.name + " quiz");
    btn.addEventListener("click", () => { window.location.href = "quiz.html?quiz=" + encodeURIComponent(quiz.id); });
    buttons.push({ btn, ready: false });
    $("quizList").appendChild(li);
  });

  // read the quiz files one after the other to count their observations
  (C.quizzes || []).reduce((chain, quiz, i) => chain.then(() => window.PHOTOS.loadQuestions(quiz.id).then((list) => {
    const meta = $("quizList").children[i].querySelector(".qmeta");
    const n = list ? list.length : 0;
    if (!list) meta.textContent = "File quizzes/" + quiz.id + ".js not found";
    else if (!n) meta.textContent = "Coming soon";
    else meta.textContent = n + (n === 1 ? " observation" : " observations");
    buttons[i].ready = n > 0;
    update();
  })), Promise.resolve());

  // the start buttons only work once the consent box is ticked
  function update() { buttons.forEach((b) => { b.btn.disabled = !(b.ready && $("consentBox").checked); }); }
  $("consentBox").addEventListener("change", update);
})();
