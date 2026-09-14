(function () {
  "use strict";
  const root = document.getElementById("chem-exam-center");
  const bank = window.CHEM58103_BANK;
  if (!root || !bank) return;

  const storageKey = "chem58103-study-history-v1";
  const state = { mode: "exam", chapters: [2, 3, 4, 5, 6], size: 20, session: [], cursor: 0, answers: [], started: false };
  const history = (() => { try { return JSON.parse(localStorage.getItem(storageKey)) || { seen: [], missed: [] }; } catch (_) { return { seen: [], missed: [] }; } })();
  const save = () => localStorage.setItem(storageKey, JSON.stringify(history));
  const shuffle = (items) => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pool = () => bank.questions.filter((q) => state.chapters.includes(q.chapter));
  const chapterCount = (chapter) => bank.questions.filter((q) => q.chapter === chapter).length;

  function setupView() {
    const selected = pool().length;
    const sessions = Math.ceil(selected / state.size);
    root.innerHTML = `
      <section class="chem-config">
        <div class="chem-config-head"><div><span>SESSION BUILDER</span><h2>Design your review</h2></div><div class="chem-bank-total"><strong>${selected}</strong><small>selected / ${bank.questions.length} available</small></div></div>
        <div class="chem-step"><div class="chem-step-no">01</div><div><h3>Choose your coverage</h3><p>Exam I follows the paper syllabus and includes Chapters 2–6.</p></div></div>
        <div class="chem-mode-row"><button class="chem-mode ${state.mode === "exam" ? "active" : ""}" data-mode="exam">Exam I · Chapters 2–6</button><button class="chem-mode ${state.mode === "custom" ? "active" : ""}" data-mode="custom">Custom chapter set</button></div>
        <div class="chem-chapter-selector">${[1,2,3,4,5,6].map((ch) => `<button class="chem-chapter-pill ${state.chapters.includes(ch) ? "selected" : ""}" data-chapter="${ch}"><span>CH ${String(ch).padStart(2,"0")}</span><strong>${bank.chapters[ch].title}</strong><small>${chapterCount(ch)} / ${bank.questions.length} questions</small></button>`).join("")}</div>
        <div class="chem-step"><div class="chem-step-no">02</div><div><h3>Set session intensity</h3><p>Short sessions support frequent retrieval; longer sessions approximate a cumulative review.</p></div></div>
        <div class="chem-size-row">${[5,10,15,20,25,40].map((n) => `<button class="chem-size ${n === state.size ? "selected" : ""}" data-size="${n}">${n}</button>`).join("")}</div>
        <div class="chem-plan"><div><small>YOUR PLAN</small><strong>${state.size} questions per session</strong><span>${sessions || 0} session${sessions === 1 ? "" : "s"} recommended to cycle through ${selected} selected questions.</span></div><div><small>HISTORY</small><strong>${history.seen.length} encountered</strong><span>${history.missed.length} currently marked for review across the complete bank.</span></div></div>
        <div class="chem-start-row"><button id="chem-start" class="chem-button chem-button-primary" ${selected ? "" : "disabled"}>Begin adaptive session <span>→</span></button><button id="chem-reset" class="chem-text-button">Reset study history</button></div>
      </section>`;

    root.querySelectorAll(".chem-mode").forEach((button) => button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      if (state.mode === "exam") state.chapters = [2,3,4,5,6];
      setupView();
    }));
    root.querySelectorAll(".chem-chapter-pill").forEach((button) => button.addEventListener("click", () => {
      const chapter = Number(button.dataset.chapter);
      state.mode = "custom";
      state.chapters = state.chapters.includes(chapter) ? state.chapters.filter((ch) => ch !== chapter) : [...state.chapters, chapter].sort();
      setupView();
    }));
    root.querySelectorAll(".chem-size").forEach((button) => button.addEventListener("click", () => { state.size = Number(button.dataset.size); setupView(); }));
    root.querySelector("#chem-start")?.addEventListener("click", startSession);
    root.querySelector("#chem-reset").addEventListener("click", () => {
      if (window.confirm("Reset all CHEM 58103 question history on this device?")) { history.seen = []; history.missed = []; save(); setupView(); }
    });
  }

  function startSession() {
    const selected = pool();
    let unseen = selected.filter((q) => !history.seen.includes(q.id));
    if (!unseen.length) {
      const selectedIds = new Set(selected.map((q) => q.id));
      history.seen = history.seen.filter((id) => !selectedIds.has(id));
      unseen = selected;
    }
    const missed = unseen.filter((q) => history.missed.includes(q.id));
    const fresh = unseen.filter((q) => !history.missed.includes(q.id));
    state.session = [...shuffle(missed), ...shuffle(fresh)].slice(0, Math.min(state.size, unseen.length));
    state.cursor = 0; state.answers = []; state.started = true;
    questionView();
  }

  function questionView() {
    const q = state.session[state.cursor];
    const score = state.answers.filter(Boolean).length;
    root.innerHTML = `<section class="chem-quiz">
      <div class="chem-quiz-top"><button id="chem-exit" class="chem-text-button">← Exit session</button><span>Question ${state.cursor + 1} / ${state.session.length}</span><span>Score ${score} / ${state.answers.length}</span></div>
      <div class="chem-progress"><i style="width:${((state.cursor) / state.session.length) * 100}%"></i></div>
      <div class="chem-question-meta"><span>CHAPTER ${q.chapter}</span><span>${q.chapterTitle}</span></div>
      <h2 class="chem-question">${q.prompt.replace("\n", "<br><small>")}${q.prompt.includes("\n") ? "</small>" : ""}</h2>
      <div class="chem-options">${q.options.map((option, i) => `<button data-option="${i}"><b>${String.fromCharCode(65 + i)}</b><span>${option}</span></button>`).join("")}</div>
      <div id="chem-feedback" class="chem-feedback" aria-live="polite"></div>
    </section>`;
    root.querySelector("#chem-exit").addEventListener("click", setupView);
    root.querySelectorAll(".chem-options button").forEach((button) => button.addEventListener("click", () => answer(Number(button.dataset.option))));
  }

  function answer(choice) {
    const q = state.session[state.cursor];
    const correct = choice === q.answer;
    state.answers.push(correct);
    if (!history.seen.includes(q.id)) history.seen.push(q.id);
    if (correct) history.missed = history.missed.filter((id) => id !== q.id);
    else if (!history.missed.includes(q.id)) history.missed.push(q.id);
    save();
    root.querySelectorAll(".chem-options button").forEach((button, i) => {
      button.disabled = true;
      if (i === q.answer) button.classList.add("correct");
      else if (i === choice) button.classList.add("incorrect");
    });
    const feedback = root.querySelector("#chem-feedback");
    feedback.classList.add("visible", correct ? "is-correct" : "is-incorrect");
    feedback.innerHTML = `<strong>${correct ? "Correct — connection secured." : "Not yet — add this concept to review."}</strong><p>${q.explanation}</p><button id="chem-next" class="chem-button chem-button-primary">${state.cursor + 1 === state.session.length ? "View session report" : "Next question"} →</button>`;
    root.querySelector("#chem-next").addEventListener("click", () => { state.cursor += 1; state.cursor < state.session.length ? questionView() : reportView(); });
  }

  function reportView() {
    const correct = state.answers.filter(Boolean).length;
    const percent = Math.round((correct / state.answers.length) * 100);
    const chapterRows = state.chapters.map((chapter) => {
      const indices = state.session.map((q, i) => q.chapter === chapter ? i : -1).filter((i) => i >= 0);
      if (!indices.length) return "";
      const hits = indices.filter((i) => state.answers[i]).length;
      return `<div><span>Chapter ${chapter}</span><i><b style="width:${Math.round(hits / indices.length * 100)}%"></b></i><strong>${hits}/${indices.length}</strong></div>`;
    }).join("");
    root.innerHTML = `<section class="chem-report"><span class="chem-kicker">SESSION COMPLETE</span><div class="chem-score-ring" style="--score:${percent * 3.6}deg"><div><strong>${percent}%</strong><span>${correct} of ${state.answers.length}</span></div></div><h2>${percent >= 85 ? "Strong molecular recall." : percent >= 65 ? "A solid foundation—keep cycling." : "Useful diagnostic—review and rebuild."}</h2><div class="chem-breakdown">${chapterRows}</div><div class="chem-start-row"><button id="chem-another" class="chem-button chem-button-primary">Build another session</button><button id="chem-repeat" class="chem-button">Continue same coverage</button></div><p class="chem-report-note">Missed concepts stay prioritized for a later session. Correct responses are removed from that review queue.</p></section>`;
    root.querySelector("#chem-another").addEventListener("click", setupView);
    root.querySelector("#chem-repeat").addEventListener("click", startSession);
  }

  setupView();
}());
