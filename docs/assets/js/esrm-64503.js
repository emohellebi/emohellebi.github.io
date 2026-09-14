(function () {
  const weeks = [
    { week: 1, date: "AUG 17", focus: "Introduction and overview", family: "Orientation", lecture: [1, "Course orientation and introduction to applied multivariate statistics"], practice: "R orientation, data transformation, and a tidy workflow", homework: ["Homework 0", "Optional introductory work begins", "homework-00"], assessment: "An optional brief in-class quiz may be given" },
    { week: 2, date: "AUG 24", focus: "Statistics in the AI era", family: "Orientation", lecture: [2, "Continuation of the introduction with attention to statistics in the AI era"], practice: "Reproducible data preparation and documentation", homework: ["Homework 0", "Optional introductory work continues", "homework-00"], assessment: "An optional brief in-class quiz may be given" },
    { week: 3, date: "AUG 31", focus: "Descriptive statistics and GLM", family: "Foundations", lecture: [3, "Descriptive statistics and the general linear model"], practice: "Descriptive summaries and linear-model review", homework: ["Homework 0", "Optional introductory work is due", "homework-00"], assessment: "An optional brief in-class quiz may be given" },
    { week: 4, date: "SEP 07", focus: "Labor Day", family: "No class", noClass: "No class is scheduled because of the Labor Day holiday." },
    { week: 5, date: "SEP 14", focus: "Effects and interactions", family: "Linear models", lecture: [4, "Simple, marginal, and interaction effects"], practice: "Visualize and interpret conditional effects", homework: ["Homework 1", "Assignment begins", "homework-01"], assessment: "An optional brief in-class quiz may be given" },
    { week: 6, date: "SEP 21", focus: "Distributions and estimation", family: "Estimation", lecture: [5, "Probability distributions and statistical estimation"], practice: "Explore sampling distributions and estimators", homework: ["Homework 1", "Deadline listed in the weekly schedule", "homework-01"], assessment: "An optional brief in-class quiz may be given" },
    { week: 7, date: "SEP 28", focus: "Maximum likelihood", family: "Estimation", lecture: [6, "Maximum likelihood estimation"], practice: "Construct and inspect a likelihood function", assessment: "An optional brief in-class quiz may be given" },
    { week: 8, date: "OCT 05", focus: "GLMs and matrix algebra", family: "Matrix methods", lecture: [7, "Generalized linear models and matrix representation"], practice: "Matrix operations and model representation", assessment: "An optional brief in-class quiz may be given" },
    { week: 9, date: "OCT 12", focus: "Matrix algebra continued", family: "Matrix methods", lecture: [8, "Further matrix foundations for multivariate models"], practice: "Matrix-based statistical calculations", assessment: "An optional brief in-class quiz may be given" },
    { week: 10, date: "OCT 19", focus: "Fall Break", family: "No class", noClass: "No class is scheduled because of Fall Break." },
    { week: 11, date: "OCT 26", focus: "Path analysis: introduction", family: "Path analysis", lecture: [9, "Path-analysis specification and identification"], practice: "Represent an identified path model", homework: ["Homework 2", "Assignment begins", "homework-02"], assessment: "An optional brief in-class quiz may be given" },
    { week: 12, date: "NOV 02", focus: "Path-model interpretation", family: "Path analysis", lecture: [10, "Interpretation of path-analysis models"], practice: "Interpret direct, indirect, and total pathways", homework: ["Homework 2", "Follow-up; consult the official portal for the precise requirement", "homework-02"], assessment: "An optional brief in-class quiz may be given" },
    { week: 13, date: "NOV 09", focus: "Repeated-measures ANOVA", family: "No class · independent topic", practice: "Organize and model repeated observations", noClass: "The syllabus lists repeated-measures ANOVA and identifies this as a no-class week." },
    { week: 14, date: "NOV 16", focus: "PCA and exploratory FA", family: "Dimension reduction", lecture: [11, "Principal component analysis and exploratory factor analysis"], practice: "Explore components, loadings, scores, and factor structure", assessment: "An optional brief in-class quiz may be given" },
    { week: 15, date: "NOV 23", focus: "Confirmatory FA and networks", family: "Latent structure", lecture: [12, "Confirmatory factor analysis and psychological network analysis"], practice: "Explore measurement and psychological network structures", assessment: "An optional brief in-class quiz may be given" },
    { week: 16, date: "NOV 30", focus: "Questions and answers", family: "Synthesis", lecture: [13, "Course integration and final-analysis support"], practice: "Troubleshoot the final reproducible analysis", homework: ["Final Homework", "Listed for this week", "final-homework"], assessment: "An optional brief in-class quiz may be given" },
    { week: 17, date: "DEC 07", focus: "Final class", family: "Synthesis", lecture: [14, "Closing class meeting"], practice: "Verify code, output, interpretation, and reproducibility", homework: ["Final Homework", "Due at 7:00 PM", "final-homework"], assessment: "No separate final examination is listed" }
  ];

  const rail = document.getElementById("esrm-week-rail");
  const detail = document.getElementById("esrm-week-detail");
  if (!rail || !detail) return;

  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const pad = (number) => String(number).padStart(2, "0");
  let activeWeek = 1;
  let filter = "all";
  const requestedWeek = Number(window.location.hash.match(/^#week-(\d{2})$/)?.[1]);
  if (requestedWeek >= 1 && requestedWeek <= weeks.length) activeWeek = requestedWeek;

  function visibleWeeks() {
    return weeks.filter((week) => filter === "all" || Boolean(week[filter]));
  }

  function materialCards(week) {
    const cards = [];
    if (week.lecture) cards.push({ key: "lecture", label: `Lecture ${pad(week.lecture[0])}`, text: week.lecture[1], href: `../lectures/lecture-${pad(week.lecture[0])}/` });
    if (week.practice) cards.push({ key: "practice", label: `R Practice · Week ${pad(week.week)}`, text: week.practice, href: `../practice/practice-${pad(week.week)}/` });
    if (week.homework) cards.push({ key: "homework", label: week.homework[0], text: week.homework[1], href: `../assignments/${week.homework[2]}/` });
    if (week.assessment) cards.push({ key: "assessment", label: "Assessment", text: week.assessment, href: "../assessments/" });
    return cards.filter((card) => filter === "all" || filter === card.key);
  }

  function renderDetail(week) {
    const cards = materialCards(week).map((card) => `<a class="agst-detail-item ${card.key}" href="${card.href}"><span>${escapeHTML(card.label)}</span><p>${escapeHTML(card.text)}</p><small>Open material →</small></a>`).join("");
    const status = week.noClass && filter === "all" ? `<div class="agst-detail-item status"><span>Calendar note</span><p>${escapeHTML(week.noClass)}</p><small>Preserved in the 17-week timeline</small></div>` : "";
    detail.innerHTML = `<div class="agst-detail-top"><span>WEEK ${pad(week.week)} · ${escapeHTML(week.date)}</span><em>${escapeHTML(week.family)}</em></div><h3>${escapeHTML(week.focus)}</h3><div class="agst-detail-grid">${status}${cards}</div>`;
  }

  function render() {
    const visible = visibleWeeks();
    if (!visible.some((week) => week.week === activeWeek)) activeWeek = visible[0].week;
    rail.innerHTML = visible.map((week) => `<button id="week-${pad(week.week)}" role="listitem" class="${week.week === activeWeek ? "active" : ""}" data-week="${week.week}"><span>${pad(week.week)}</span><b>${escapeHTML(week.focus)}</b><small>${escapeHTML(week.date)} · ${escapeHTML(week.family)}</small></button>`).join("");
    rail.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      activeWeek = Number(button.dataset.week);
      window.history.replaceState(null, "", `#week-${pad(activeWeek)}`);
      render();
    }));
    renderDetail(weeks.find((week) => week.week === activeWeek));
  }

  document.querySelectorAll("[data-esrm-filter]").forEach((button) => button.addEventListener("click", () => {
    filter = button.dataset.esrmFilter;
    document.querySelectorAll("[data-esrm-filter]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    render();
  }));

  render();
})();
