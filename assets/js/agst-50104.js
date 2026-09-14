(function () {
  const weeks = [
    { week: 1, focus: "Foundations", family: "Foundations", lecture: "Experimental units, treatments, replication, and randomization", lab: "Identify units and sources of variation", assignment: "Design vocabulary map", exam: "" },
    { week: 2, focus: "CRD", family: "One-factor CRD", lecture: "Completely randomized designs and estimands", lab: "Generate a reproducible CRD field book", assignment: "CRD randomization", exam: "" },
    { week: 3, focus: "One-way ANOVA", family: "One-factor CRD", lecture: "Model, partition of variation, and the F-test", lab: "Fit and interpret a one-way ANOVA", assignment: "CRD analysis", exam: "" },
    { week: 4, focus: "Blocking", family: "One-factor RCBD", lecture: "RCBD logic and nuisance variation", lab: "Generate and analyze an RCBD", assignment: "RCBD design", exam: "" },
    { week: 5, focus: "Model adequacy", family: "Cross-design", lecture: "Residual assumptions and diagnostics", lab: "Q–Q, residual–fitted, and variance diagnostics", assignment: "Diagnostic report", exam: "Exam I window · official date TBD" },
    { week: 6, focus: "Comparisons", family: "Cross-design", lecture: "Contrasts, estimated means, and multiplicity", lab: "Planned contrasts and adjusted comparisons", assignment: "Post-ANOVA analysis", exam: "" },
    { week: 7, focus: "Factorials", family: "Two-factor CRD", lecture: "Main effects and interactions", lab: "Create and visualize a two-factor design", assignment: "Factorial randomization", exam: "" },
    { week: 8, focus: "Interaction", family: "Two-factor CRD", lecture: "Simple effects and defensible interpretation", lab: "Interaction plots and simple effects", assignment: "Factorial analysis", exam: "" },
    { week: 9, focus: "Blocked factorials", family: "Two-factor RCBD", lecture: "Factorial treatments within blocks", lab: "Fit a two-factor RCBD", assignment: "Blocked factorial analysis", exam: "" },
    { week: 10, focus: "Split plots", family: "Split-plot", lecture: "Restricted randomization and two error strata", lab: "Generate a split-plot design", assignment: "Split-plot field book", exam: "Exam II window · official date TBD" },
    { week: 11, focus: "Split-plot inference", family: "Split-plot", lecture: "Whole-plot versus subplot tests", lab: "Fit fixed- and mixed-model forms", assignment: "Split-plot analysis", exam: "" },
    { week: 12, focus: "Strip plots", family: "Strip-plot", lecture: "Orthogonal strips and three error strata", lab: "Generate and inspect a strip-plot design", assignment: "Strip-plot field book", exam: "" },
    { week: 13, focus: "Mixed models", family: "Cross-design", lecture: "Fixed versus random effects; REML and ML", lab: "Fit mixed models that mirror randomization", assignment: "Mixed-model analysis", exam: "" },
    { week: 14, focus: "Model comparison", family: "Cross-design", lecture: "Nested models, likelihood comparisons, and prediction", lab: "Compare models responsibly", assignment: "Model audit", exam: "" },
    { week: 15, focus: "Synthesis", family: "All designs", lecture: "Choose, defend, analyze, and communicate a design", lab: "Reproducible analysis studio", assignment: "Final project synthesis", exam: "Comprehensive final exam" }
  ];

  const matrixData = window.AGST_MAIN_TABLE;
  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const weekRail = document.getElementById("agst-week-rail");
  const weekDetail = document.getElementById("agst-week-detail");
  const matrix = document.getElementById("agst-source-matrix");
  const atlasEmpty = document.getElementById("agst-atlas-empty");
  const matrixCount = document.getElementById("agst-matrix-count");
  const searchInput = document.getElementById("agst-atlas-search");
  const pillWrap = document.getElementById("agst-design-pills");
  let weekFilter = "all";
  let activeWeek = 1;
  const requestedWeek = Number(window.location.hash.match(/^#week-(\d{2})$/)?.[1]);
  if (requestedWeek >= 1 && requestedWeek <= weeks.length) activeWeek = requestedWeek;
  let designFilter = matrixData?.designs?.[0]?.key || "";
  const itemLabel = { lecture: "Lecture", lab: "Lab", assignment: "Assignment", exam: "Assessment" };

  function matchingWeeks() {
    return weeks.filter((week) => weekFilter === "all" || Boolean(week[weekFilter]));
  }

  function renderWeekDetail(week) {
    const firstLecture = (week.week * 2) - 1;
    const secondLecture = week.week * 2;
    const lectureItems = weekFilter === "all" || weekFilter === "lecture"
      ? [firstLecture, secondLecture].map((number, session) => `<a class="agst-detail-item lecture" href="../lectures/lecture-${String(number).padStart(2, "0")}/"><span>Lecture ${String(number).padStart(2, "0")}</span><p>${escapeHTML(week.lecture)}</p><small>Open session ${session === 0 ? "A" : "B"} →</small></a>`).join("")
      : "";
    const linkedItems = ["lab", "assignment", "exam"]
      .filter((key) => week[key])
      .filter((key) => weekFilter === "all" || weekFilter === key)
      .map((key) => {
        const examNumber = week.week === 5 ? "01" : week.week === 10 ? "02" : "03";
        const href = key === "exam" ? `../exams/exam-${examNumber}/` : `../${key === "assignment" ? "assignments" : "labs"}/${key === "assignment" ? "assignment" : "lab"}-${String(week.week).padStart(2, "0")}/`;
        const number = key === "exam" ? examNumber : String(week.week).padStart(2, "0");
        return `<a class="agst-detail-item ${key}" href="${href}"><span>${itemLabel[key]} ${number}</span><p>${escapeHTML(week[key])}</p><small>Open material →</small></a>`;
      })
      .join("");
    weekDetail.innerHTML = `<div class="agst-detail-top"><span>WEEK ${String(week.week).padStart(2, "0")}</span><em>${escapeHTML(week.family)}</em></div><h3>${escapeHTML(week.focus)}</h3><div class="agst-detail-grid">${lectureItems}${linkedItems}</div>`;
  }

  function renderWeeks() {
    const visible = matchingWeeks();
    if (!visible.some((week) => week.week === activeWeek)) activeWeek = visible[0].week;
    weekRail.innerHTML = visible.map((week) => `<button id="week-${String(week.week).padStart(2, "0")}" role="listitem" class="${week.week === activeWeek ? "active" : ""}" data-week="${week.week}"><span>${String(week.week).padStart(2, "0")}</span><b>${escapeHTML(week.focus)}</b><small>${escapeHTML(week.family)}</small></button>`).join("");
    renderWeekDetail(weeks.find((week) => week.week === activeWeek));
    weekRail.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      activeWeek = Number(button.dataset.week);
      window.history.replaceState(null, "", `#week-${String(activeWeek).padStart(2, "0")}`);
      renderWeeks();
    }));
  }

  if (weekRail && weekDetail) {
    document.querySelectorAll("[data-week-filter]").forEach((button) => button.addEventListener("click", () => {
      weekFilter = button.dataset.weekFilter;
      document.querySelectorAll("[data-week-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderWeeks();
    }));
    renderWeeks();
  }

  document.querySelectorAll("[data-jump-filter]").forEach((button) => button.addEventListener("click", () => {
    const target = document.querySelector(`[data-week-filter="${button.dataset.jumpFilter}"]`);
    if (target) target.click();
    document.getElementById("course-map").scrollIntoView({ behavior: "smooth" });
  }));

  function entryClass(text) {
    if (/\b(function|library|summary|anova|plot|resid|shapiro|levene|aov|lmer|lm|asreml)\s*\(|<-|::|^\s*#/im.test(text)) return " code";
    if (/^[yY][a-z]*\s*=|μ|𝜀|𝝉|⍺|𝛾|β/.test(text)) return " formula";
    return "";
  }

  function contextParts(entries) {
    const ordered = [...entries].sort((a, b) => a.slot - b.slot);
    const number = ordered.find((entry) => /^\d+(?:\.\d+)*$/.test(entry.text.trim()))?.text || "";
    const words = ordered.filter((entry) => entry.text !== number).map((entry) => entry.text);
    return { number, title: words[0] || "", note: words.slice(1).join(" ") };
  }

  function buildSections(design) {
    const sections = [];
    let section = null;
    let item = null;
    matrixData.rows.forEach((row) => {
      const entries = row.designs[design.key] || [];
      const major = row.context.some((entry) => entry.slot === 0 && /^\d+$/.test(entry.text.trim()));
      const context = contextParts(row.context);
      if (major) {
        section = { number: context.number, title: context.title || `Section ${context.number}`, items: [] };
        sections.push(section);
        item = null;
      }
      if (!section) {
        section = { number: "00", title: "Course notes", items: [] };
        sections.push(section);
      }
      const itemContext = major ? contextParts(row.context.filter((entry) => entry.slot > 1)) : context;
      if (row.context.length && (itemContext.number || itemContext.title || itemContext.note)) {
        item = { number: itemContext.number, title: itemContext.title || section.title, note: itemContext.note, chunks: [] };
        section.items.push(item);
      }
      if (entries.length) {
        if (!item) {
          item = { number: "", title: section.title, note: "", chunks: [] };
          section.items.push(item);
        }
        item.chunks.push({ sourceRow: row.sourceRow, entries: [...entries].sort((a, b) => a.slot - b.slot) });
      }
    });
    return sections.filter((group) => group.items.length);
  }

  function renderEntry(entry) {
    const isBlock = entry.text.includes("\n") || entry.text.length > 88;
    return `<span class="agst-reader-entry${entryClass(entry.text)}${isBlock ? " block" : ""}" title="Original cell ${escapeHTML(entry.ref)}">${escapeHTML(entry.text)}</span>`;
  }

  function renderChunks(chunks) {
    return chunks.map((chunk) => `<div class="agst-reader-entry-row" data-source-row="${chunk.sourceRow}">${chunk.entries.map(renderEntry).join("")}</div>`).join("");
  }

  function renderAnovaTable(item) {
    const dataRows = matrixData.anovaTables?.[designFilter] || [];
    const hasStratum = dataRows.some((row) => row[0]);
    const headers = ["Stratum", "Source", "df", "Sum of squares", "Mean square", "F statistic", "p-value"];
    const visibleColumns = headers.map((label, index) => ({ label, index })).filter((column) => hasStratum || column.index !== 0);
    const preface = item.chunks.filter((chunk) => chunk.sourceRow < 125).map((chunk) => ({
      ...chunk,
      entries: chunk.entries.filter((entry) => !["4.3", "The ANOVA table", "anova table on excel"].includes(entry.text.trim()))
    })).filter((chunk) => chunk.entries.length);
    const table = `<div class="agst-embedded-anova"><table><thead><tr>${visibleColumns.map((column) => `<th>${escapeHTML(column.label)}</th>`).join("")}</tr></thead><tbody>${dataRows.map((row) => `<tr>${visibleColumns.map((column) => {
      const value = row[column.index];
      return `<td${column.index >= 2 ? " class=\"agst-anova-expression\"" : ""}>${value && value !== "—" ? escapeHTML(value) : "<span aria-label=\"not applicable\">—</span>"}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table></div>`;
    return `${renderChunks(preface)}${table}`;
  }

  function renderItemContent(item) {
    if (item.number === "4.3" || item.title.trim().toLowerCase() === "the anova table") return renderAnovaTable(item);
    return renderChunks(item.chunks);
  }

  function renderMatrix() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const design = matrixData.designs.find((candidate) => candidate.key === designFilter) || matrixData.designs[0];
    const sections = buildSections(design).map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const text = [item.number, item.title, item.note, ...item.chunks.flatMap((chunk) => chunk.entries.map((entry) => entry.text))].join(" ").toLowerCase();
        return !query || text.includes(query);
      })
    })).filter((section) => section.items.length);
    const entryCount = sections.reduce((total, section) => total + section.items.reduce((sum, item) => sum + item.chunks.reduce((count, chunk) => count + chunk.entries.length, 0), 0), 0);
    const topicCount = sections.reduce((total, section) => total + section.items.length, 0);
    const navigation = sections.map((section) => `<a href="#agst-reader-section-${section.number}"><span>${escapeHTML(section.number)}</span>${escapeHTML(section.title)}</a>`).join("");
    const body = sections.map((section, sectionIndex) => `<details class="agst-reader-section" id="agst-reader-section-${section.number}" ${sectionIndex < 2 || query ? "open" : ""}><summary><span>${escapeHTML(section.number)}</span><strong>${escapeHTML(section.title)}</strong><small>${section.items.length} topics</small></summary><div class="agst-reader-items">${section.items.map((item) => `<article class="agst-reader-item"><header>${item.number ? `<span>${escapeHTML(item.number)}</span>` : ""}<div><h4>${escapeHTML(item.title)}</h4>${item.note ? `<p>${escapeHTML(item.note)}</p>` : ""}</div></header><div class="agst-reader-content">${renderItemContent(item)}${!item.chunks.length ? `<p class="agst-shared-note">Shared course note</p>` : ""}</div></article>`).join("")}</div></details>`).join("");
    matrix.innerHTML = `<header class="agst-reader-hero"><div><span>${escapeHTML(design.family)}</span><h3>${escapeHTML(design.name)}</h3><p>Complete source material arranged in the original course sequence.</p></div><div><strong>${entryCount}</strong><span>preserved entries</span></div></header><nav class="agst-reader-nav" aria-label="Jump to a course section">${navigation}</nav>${body}`;
    atlasEmpty.hidden = sections.length > 0;
    matrix.hidden = sections.length === 0;
    if (matrixCount) matrixCount.textContent = `${topicCount} topics · ${entryCount} populated entries`;
  }

  if (matrix && pillWrap && matrixData) {
    pillWrap.innerHTML = matrixData.designs
      .map((design, index) => `<button class="${index === 0 ? "active" : ""}" data-design-filter="${design.key}">${escapeHTML(design.name)}</button>`)
      .join("");
    pillWrap.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      designFilter = button.dataset.designFilter;
      pillWrap.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      renderMatrix();
    }));
    searchInput?.addEventListener("input", renderMatrix);

    document.querySelectorAll("[data-reader-action]").forEach((button) => button.addEventListener("click", () => {
      const open = button.dataset.readerAction === "expand";
      matrix.querySelectorAll(".agst-reader-section").forEach((section) => { section.open = open; });
    }));
    renderMatrix();
  }

  const field = document.getElementById("doe-field");
  if (field) {
    const treatments = ["A", "B", "C", "D"];
    const order = [2, 0, 3, 1, 1, 3, 0, 2, 0, 2, 1, 3, 3, 1, 2, 0, 1, 0, 3, 2, 2, 3, 1, 0, 0, 1, 2, 3, 3, 2, 0, 1, 1, 3, 2];
    field.innerHTML = order.map((index, position) => `<span class="t${index}" style="--delay:${position * 0.035}s" title="Treatment ${treatments[index]}">${treatments[index]}</span>`).join("");
  }

})();
