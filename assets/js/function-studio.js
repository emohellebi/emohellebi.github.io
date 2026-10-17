(function () {
  "use strict";

  const studio = document.getElementById("function-studio");
  if (!studio) return;
  const disclosure = studio.closest("details");

  const colors = ["#2f7d6d", "#d9654f", "#5865a8", "#c28a26"];
  const expressionInput = document.getElementById("function-equation");
  const descriptionInput = document.getElementById("function-description");
  const minInput = document.getElementById("function-x-min");
  const maxInput = document.getElementById("function-x-max");
  const canvas = document.getElementById("function-canvas");
  const context = canvas.getContext("2d");
  const status = document.getElementById("function-status");
  const graphTitle = document.getElementById("function-graph-title");
  const curveKey = document.getElementById("function-curve-key");
  const coordinate = document.getElementById("function-coordinate");
  const suggestions = document.getElementById("function-suggestions");
  const suggestionGrid = document.getElementById("function-suggestion-grid");
  const suggestionStatus = document.getElementById("function-suggestion-status");
  let currentRange = { min: -10, max: 10 };
  let currentPlots = [];

  const functions = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    exp: Math.exp,
    log: Math.log,
    ln: Math.log,
    sqrt: Math.sqrt,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  };

  function tokenize(source) {
    const normalized = source
      .replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, "")
      .replace(/[−–—]/g, "-")
      .replace(/π/gi, "pi")
      .replace(/\bln\b/gi, "log")
      .toLowerCase();
    const tokens = [];
    let index = 0;
    while (index < normalized.length) {
      const rest = normalized.slice(index);
      const whitespace = rest.match(/^\s+/);
      if (whitespace) { index += whitespace[0].length; continue; }
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (number) { tokens.push({ type: "number", value: Number(number[0]) }); index += number[0].length; continue; }
      const identifier = rest.match(/^[a-z]+/i);
      if (identifier) { tokens.push({ type: "identifier", value: identifier[0] }); index += identifier[0].length; continue; }
      const character = normalized[index];
      if ("+-*/^()".includes(character)) { tokens.push({ type: character, value: character }); index += 1; continue; }
      throw new Error(`Unsupported symbol “${character}”`);
    }
    tokens.push({ type: "end" });
    return tokens;
  }

  function compileExpression(source) {
    const tokens = tokenize(source);
    let position = 0;
    const peek = () => tokens[position];
    const take = (type) => {
      if (peek().type !== type) throw new Error(`Expected “${type}”`);
      return tokens[position++];
    };
    const startsPrimary = (token) => token.type === "number" || token.type === "identifier" || token.type === "(";

    function primary() {
      const token = peek();
      if (token.type === "number") { position += 1; return () => token.value; }
      if (token.type === "(") {
        position += 1;
        const value = expression();
        take(")");
        return value;
      }
      if (token.type === "identifier") {
        position += 1;
        const name = token.value;
        if (name === "x") return (x) => x;
        if (name === "pi") return () => Math.PI;
        if (name === "e") return () => Math.E;
        if (!functions[name]) throw new Error(`Unknown function or symbol “${name}”`);
        if (peek().type !== "(") throw new Error(`${name} needs parentheses`);
        position += 1;
        const argument = expression();
        take(")");
        return (x) => functions[name](argument(x));
      }
      throw new Error("Expected a number, x, or function");
    }

    function power() {
      const left = primary();
      if (peek().type === "^") {
        position += 1;
        const right = unary();
        return (x) => Math.pow(left(x), right(x));
      }
      return left;
    }

    function unary() {
      if (peek().type === "+") { position += 1; return unary(); }
      if (peek().type === "-") { position += 1; const value = unary(); return (x) => -value(x); }
      return power();
    }

    function term() {
      let left = unary();
      while (peek().type === "*" || peek().type === "/" || startsPrimary(peek())) {
        const operator = peek().type === "*" || peek().type === "/" ? tokens[position++].type : "*";
        const right = unary();
        const previous = left;
        left = operator === "*" ? (x) => previous(x) * right(x) : (x) => previous(x) / right(x);
      }
      return left;
    }

    function expression() {
      let left = term();
      while (peek().type === "+" || peek().type === "-") {
        const operator = tokens[position++].type;
        const right = term();
        const previous = left;
        left = operator === "+" ? (x) => previous(x) + right(x) : (x) => previous(x) - right(x);
      }
      return left;
    }

    const evaluator = expression();
    if (peek().type !== "end") throw new Error(`Unexpected token “${peek().value || peek().type}”`);
    return evaluator;
  }

  function parsePlots(value) {
    const expressions = value.split(/[;\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 4);
    if (!expressions.length) throw new Error("Enter at least one equation.");
    return expressions.map((label, index) => ({ label, color: colors[index], evaluate: compileExpression(label) }));
  }

  function niceStep(span, targetLines) {
    const rough = span / targetLines;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalized = rough / magnitude;
    const factor = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
    return factor * magnitude;
  }

  function samplePlots(plots, xMin, xMax, sampleCount) {
    const allY = [];
    const series = plots.map((plot) => {
      const points = [];
      for (let index = 0; index <= sampleCount; index += 1) {
        const x = xMin + (index / sampleCount) * (xMax - xMin);
        let y = plot.evaluate(x);
        if (!Number.isFinite(y) || Math.abs(y) > 1e6) y = null;
        if (y !== null) allY.push(y);
        points.push({ x, y });
      }
      return { ...plot, points };
    });
    let yMin = allY.length ? Math.min(...allY) : -1;
    let yMax = allY.length ? Math.max(...allY) : 1;
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const padding = Math.max((yMax - yMin) * 0.12, 0.25);
    yMin -= padding;
    yMax += padding;
    if (yMin > 0 && yMin < (yMax - yMin) * 0.4) yMin = 0;
    if (yMax < 0 && Math.abs(yMax) < (yMax - yMin) * 0.4) yMax = 0;
    return { series, yMin, yMax };
  }

  function drawGraph(target, plots, xMin, xMax, compact) {
    const ctx = target.getContext("2d");
    const rect = target.getBoundingClientRect();
    const cssWidth = Math.max(compact ? 230 : 320, rect.width || target.width);
    const cssHeight = Math.max(compact ? 140 : 260, rect.height || target.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    target.width = Math.round(cssWidth * ratio);
    target.height = Math.round(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const width = cssWidth;
    const height = cssHeight;
    const margin = compact ? { top: 10, right: 10, bottom: 18, left: 24 } : { top: 24, right: 24, bottom: 38, left: 54 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const sampled = samplePlots(plots, xMin, xMax, compact ? 180 : Math.round(chartWidth * 1.35));
    const { yMin, yMax } = sampled;
    const mapX = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * chartWidth;
    const mapY = (y) => margin.top + (1 - (y - yMin) / (yMax - yMin)) * chartHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = compact ? "#fbfcfa" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const xStep = niceStep(xMax - xMin, compact ? 5 : 9);
    const yStep = niceStep(yMax - yMin, compact ? 4 : 7);
    ctx.font = compact ? "9px ui-monospace, monospace" : "11px ui-monospace, monospace";
    ctx.lineWidth = 1;

    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + xStep * 0.01; x += xStep) {
      const pixel = mapX(x);
      ctx.strokeStyle = Math.abs(x) < xStep * 0.01 ? "#75827c" : "#e4ebe7";
      ctx.beginPath(); ctx.moveTo(pixel, margin.top); ctx.lineTo(pixel, margin.top + chartHeight); ctx.stroke();
      if (!compact) { ctx.fillStyle = "#718079"; ctx.textAlign = "center"; ctx.fillText(Number(x.toPrecision(4)), pixel, height - 14); }
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + yStep * 0.01; y += yStep) {
      const pixel = mapY(y);
      ctx.strokeStyle = Math.abs(y) < yStep * 0.01 ? "#75827c" : "#e4ebe7";
      ctx.beginPath(); ctx.moveTo(margin.left, pixel); ctx.lineTo(margin.left + chartWidth, pixel); ctx.stroke();
      if (!compact) { ctx.fillStyle = "#718079"; ctx.textAlign = "right"; ctx.fillText(Number(y.toPrecision(4)), margin.left - 8, pixel + 4); }
    }

    sampled.series.forEach((series) => {
      ctx.strokeStyle = series.color;
      ctx.lineWidth = compact ? 2 : 2.6;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      let drawing = false;
      let previousY = null;
      series.points.forEach((point) => {
        if (point.y === null) { drawing = false; previousY = null; return; }
        const pixelX = mapX(point.x);
        const pixelY = mapY(point.y);
        const discontinuity = previousY !== null && Math.abs(pixelY - previousY) > chartHeight * 0.65;
        if (!drawing || discontinuity) ctx.moveTo(pixelX, pixelY); else ctx.lineTo(pixelX, pixelY);
        drawing = true;
        previousY = pixelY;
      });
      ctx.stroke();
    });
    return { mapX, mapY, yMin, yMax, width, height, margin, chartWidth, chartHeight };
  }

  function renderMainGraph() {
    // A hidden canvas has no usable layout dimensions. Draw when revealed.
    if (disclosure && !disclosure.open) return;
    try {
      const xMin = Number(minInput.value);
      const xMax = Number(maxInput.value);
      if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) throw new Error("The x minimum must be smaller than the x maximum.");
      currentPlots = parsePlots(expressionInput.value);
      currentRange = { min: xMin, max: xMax };
      drawGraph(canvas, currentPlots, xMin, xMax, false);
      graphTitle.textContent = currentPlots.length === 1 ? "1 function" : `Comparing ${currentPlots.length} functions`;
      curveKey.innerHTML = currentPlots.map((plot) => `<span><i style="--curve-color:${plot.color}"></i><code>${escapeHTML(plot.label)}</code></span>`).join("");
      status.textContent = "Graph updated.";
      status.classList.remove("error");
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  }

  function normalizeDescription(value) {
    return value.toLowerCase().replace(/[‐‑‒–—-]/g, " ").replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
  }

  const searchStopWords = new Set(["a", "an", "and", "as", "at", "be", "by", "curve", "for", "from", "function", "graph", "i", "is", "it", "like", "me", "of", "or", "plot", "show", "something", "that", "the", "then", "to", "with", "whose"]);

  function canonicalSearchToken(token) {
    if (/^(grow|increas|ris)/.test(token)) return "growth";
    if (/^(decreas|declin|fall|shrink)/.test(token)) return "decrease";
    if (/^(oscillat|wave)/.test(token)) return "wave";
    if (/^(period|cycl|repeat)/.test(token)) return "periodic";
    if (/^(fad|damp|dying)/.test(token)) return "fade";
    if (/^(slow|flatten)/.test(token)) return "slow";
    if (/^(fast|quick|rapid)/.test(token)) return "fast";
    if (/^(symmetr)/.test(token)) return "symmetric";
    if (/^(parabol|quadratic)/.test(token)) return "parabola";
    if (/^(exponent)/.test(token)) return "exponential";
    if (/^(logarith)/.test(token)) return "logarithm";
    if (/^(asymptot)/.test(token)) return "asymptote";
    if (/^(center|centre|middle)/.test(token)) return "center";
    if (/^(maximum|maxima)/.test(token)) return "maximum";
    if (/^(minimum|minima)/.test(token)) return "minimum";
    return token.replace(/(?:ing|ed|es|s)$/, "");
  }

  function searchTokens(value) {
    return normalizeDescription(value).split(" ").filter((token) => token.length > 1 && !searchStopWords.has(token)).map(canonicalSearchToken);
  }

  function editDistance(left, right) {
    if (left === right) return 0;
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const current = [leftIndex];
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        current[rightIndex] = Math.min(
          current[rightIndex - 1] + 1,
          previous[rightIndex] + 1,
          previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
        );
      }
      previous.splice(0, previous.length, ...current);
    }
    return previous[right.length];
  }

  function tokenMatchScore(queryToken, catalogTokens) {
    if (catalogTokens.has(queryToken)) return 5;
    if (queryToken.length < 5) return 0;
    const tolerance = queryToken.length >= 8 ? 2 : 1;
    return [...catalogTokens].some((catalogToken) => Math.abs(catalogToken.length - queryToken.length) <= tolerance && editDistance(queryToken, catalogToken) <= tolerance) ? 2 : 0;
  }

  function numberAfter(description, words, fallback) {
    const match = description.match(new RegExp(`(?:${words})\\s*(?:of|=|is|at|by)?\\s*(-?\\d+(?:\\.\\d+)?)`));
    return match ? Number(match[1]) : fallback;
  }

  function compactNumber(value) {
    return Number(value.toFixed(3)).toString();
  }

  const functionSearchCatalog = [
    { key: "damped", label: "damped oscillation", terms: "damped fading dying wave oscillation amplitude envelope smaller weaker decay ringdown", phrases: ["fades away", "amplitude gets smaller", "decreasing amplitude", "dying wave"] },
    { key: "logistic", label: "bounded S-shaped growth", terms: "logistic sigmoid s shape growth levels off saturates plateau carrying capacity bounded upper limit population", phrases: ["s shaped", "s curve", "levels off", "carrying capacity", "upper limit"] },
    { key: "bell", label: "symmetric bell-shaped peak", terms: "bell gaussian normal distribution symmetric peak mound hill center probability density", phrases: ["bell shaped", "normal distribution", "symmetric peak"] },
    { key: "periodic", label: "periodic oscillation", terms: "periodic wave oscillation sine cosine harmonic repeating cycle frequency amplitude fast slow", phrases: ["sine wave", "cosine wave", "repeating pattern", "fast oscillations", "slow oscillations"] },
    { key: "growth", label: "accelerating growth", terms: "exponential compound accelerating growth fast rapid increasing rate population unlimited", phrases: ["exponential growth", "compound growth", "grows faster", "increasing rate"] },
    { key: "decay", label: "decay toward zero", terms: "exponential decay decrease falling shrinking toward zero half life cooling radioactive", phrases: ["exponential decay", "toward zero", "half life"] },
    { key: "quadratic", label: "quadratic parabola", terms: "quadratic parabola u shape vertex turning point opens upward downward maximum minimum symmetric projectile", phrases: ["opens upward", "opens downward", "turning point", "u shaped"] },
    { key: "absolute", label: "absolute-value V shape", terms: "absolute value v shape sharp corner minimum maximum distance piecewise", phrases: ["absolute value", "v shaped", "sharp corner", "distance from zero"] },
    { key: "inverse", label: "inverse relationship", terms: "inverse reciprocal hyperbola asymptote one over x inversely proportional", phrases: ["one over x", "inversely proportional", "inverse relationship"] },
    { key: "logarithmic", label: "growth that slows", terms: "logarithm logarithmic growth slow slowing diminishing returns increases quickly flattens", phrases: ["growth slows", "diminishing returns", "increases quickly then slows", "rises quickly then slows"] },
    { key: "sqrt", label: "square-root growth", terms: "square root radical growth slow flatten starts endpoint increasing", phrases: ["square root", "root curve"] },
    { key: "cubic", label: "cubic with an inflection", terms: "cubic third degree inflection odd symmetry s curve two turning points", phrases: ["inflection point", "third degree", "two turning points"] },
    { key: "linear", label: "straight-line relationship", terms: "linear straight line constant slope constant rate increasing decreasing positive negative relationship", phrases: ["straight line", "constant slope", "constant rate"] }
  ];

  function candidatesForIntent(intent, description) {
    const fast = /\b(?:fast|rapid|high frequency|many cycles|frequent)/.test(description);
    const slow = /\b(?:slow|gentle|low frequency|long period|few cycles)/.test(description);
    const decreasing = /\b(?:decreas|fall|downward|negative slope|declin)/.test(description);
    const downward = /(?:opens? down|downward parabola|inverted|maximum)/.test(description);
    const frequency = Math.min(10, Math.max(.1, numberAfter(description, "frequency|rate|cycles", fast ? 3 : slow ? .5 : 1)));
    const amplitude = Math.min(20, Math.max(.1, Math.abs(numberAfter(description, "amplitude|height", 1))));
    const center = Math.min(20, Math.max(-20, numberAfter(description, "centered at|center at|peak at|vertex at", 0)));
    const f = compactNumber(frequency);
    const a = compactNumber(amplitude);
    const shiftedX = center === 0 ? "x" : `(x ${center < 0 ? "+" : "-"} ${compactNumber(Math.abs(center))})`;
    const prefixed = amplitude === 1 ? "" : `${a} * `;
    const options = {
      damped: [
        { name: "Damped oscillation", expression: `${prefixed}sin(${f}${shiftedX}) * exp(-0.25abs(${shiftedX}))`, note: "A periodic signal whose amplitude fades away from its center" },
        { name: "Slowly damped wave", expression: `${prefixed}cos(${f}${shiftedX}) * exp(-0.12abs(${shiftedX}))`, note: "A longer-lasting oscillation with a gentler envelope" }
      ],
      logistic: [
        { name: "Logistic growth", expression: `1 / (1 + exp(-${shiftedX}))`, note: "S-shaped growth that approaches lower and upper limits" },
        { name: "Steep logistic transition", expression: `1 / (1 + exp(-2${shiftedX}))`, note: "A faster transition between two stable levels" },
        { name: "Centered sigmoid", expression: `2 / (1 + exp(-${shiftedX})) - 1`, note: "An S-curve ranging from approximately −1 to 1" }
      ],
      bell: [
        { name: "Gaussian bell", expression: `${prefixed}exp(-0.5${shiftedX}^2)`, note: "A symmetric bell-shaped peak" },
        { name: "Narrow bell", expression: `${prefixed}exp(-1.5${shiftedX}^2)`, note: "A sharper, more concentrated symmetric peak" },
        { name: "Wide bell", expression: `${prefixed}exp(-0.18${shiftedX}^2)`, note: "A broader symmetric peak with gradual tails" }
      ],
      periodic: [
        { name: fast ? "Fast sine wave" : slow ? "Slow sine wave" : "Sine wave", expression: `${prefixed}sin(${f}${shiftedX})`, note: `Smooth periodic motion with frequency factor ${f}` },
        { name: "Cosine wave", expression: `${prefixed}cos(${f}${shiftedX})`, note: "The same periodic family beginning at a peak" },
        { name: "Two-harmonic wave", expression: `${prefixed}(sin(${f}${shiftedX}) + 0.35sin(${compactNumber(frequency * 2)}${shiftedX}))`, note: "A richer periodic shape combining two frequencies" }
      ],
      growth: [
        { name: "Exponential growth", expression: "exp(0.35x)", note: "Growth whose rate increases with the current value" },
        { name: "Faster exponential growth", expression: "exp(0.6x)", note: "A more rapidly accelerating growth curve" },
        { name: "Positive quadratic growth", expression: "0.25x^2", note: "Polynomial growth increasing in both directions" }
      ],
      decay: [
        { name: "Exponential decay", expression: "exp(-0.35(x + 6))", note: "Positive values that decrease toward zero" },
        { name: "Faster exponential decay", expression: "exp(-0.7(x + 6))", note: "A sharper decrease toward zero" },
        { name: "Symmetric rational decay", expression: "1 / (1 + x^2)", note: "A central peak with slowly decaying tails" }
      ],
      quadratic: [
        { name: downward ? "Downward parabola" : "Upward parabola", expression: `${downward ? "-" : ""}${shiftedX}^2`, note: `A symmetric quadratic opening ${downward ? "downward" : "upward"}` },
        { name: "Wide parabola", expression: `${downward ? "-" : ""}0.25${shiftedX}^2`, note: "A broader quadratic curve" },
        { name: "Narrow parabola", expression: `${downward ? "-" : ""}2${shiftedX}^2`, note: "A steeper quadratic curve" }
      ],
      absolute: [
        { name: "Absolute-value V", expression: `abs(${shiftedX})`, note: "A V-shaped curve with a sharp minimum" },
        { name: "Inverted absolute value", expression: `-abs(${shiftedX})`, note: "An upside-down V with a sharp maximum" }
      ],
      inverse: [
        { name: "Reciprocal curve", expression: "1 / x", note: "Two branches separated by vertical and horizontal asymptotes" },
        { name: "Shifted reciprocal", expression: `1 / (${shiftedX})`, note: "A reciprocal relationship with a shifted vertical asymptote" }
      ],
      logarithmic: [
        { name: "Logarithmic growth", expression: "log(x + 7)", note: "Rapid early increase followed by progressively slower growth" },
        { name: "Scaled logarithmic growth", expression: "2log(x + 7)", note: "A taller diminishing-returns curve" }
      ],
      sqrt: [
        { name: "Square-root growth", expression: "sqrt(x + 6)", note: "Increasing growth that gradually flattens" },
        { name: "Reflected square root", expression: "-sqrt(x + 6)", note: "A decreasing reflected root curve" }
      ],
      cubic: [
        { name: "Basic cubic", expression: "0.12x^3", note: "An odd-symmetric curve with a central inflection" },
        { name: "Cubic with two turns", expression: "0.12x^3 - x", note: "A cubic curve with a local maximum and minimum" }
      ],
      linear: [
        { name: decreasing ? "Decreasing line" : "Increasing line", expression: decreasing ? "-x" : "x", note: "A straight relationship with constant slope" },
        { name: "Steeper line", expression: decreasing ? "-2x + 1" : "2x + 1", note: "A straight line with a larger slope magnitude" }
      ]
    };
    return options[intent] || [];
  }

  function matchDescription(value) {
    const description = normalizeDescription(value);
    const queryTokens = [...new Set(searchTokens(description))];
    const ranked = functionSearchCatalog.map((entry, index) => {
      const catalogTokens = new Set(searchTokens(`${entry.label} ${entry.terms} ${entry.phrases.join(" ")}`));
      const tokenScores = queryTokens.map((queryToken) => tokenMatchScore(queryToken, catalogTokens));
      const exactPhraseScore = entry.phrases.reduce((score, phrase) => score + (description.includes(normalizeDescription(phrase)) ? 10 : 0), 0);
      const matchedTokens = tokenScores.filter((score) => score > 0).length;
      const coverageBonus = queryTokens.length > 1 && matchedTokens === queryTokens.length ? 6 : 0;
      return { ...entry, score: tokenScores.reduce((sum, score) => sum + score, 0) + exactPhraseScore + coverageBonus, matchedTokens, index };
    }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || right.matchedTokens - left.matchedTokens || left.index - right.index);
    const selectedIntents = ranked.length ? ranked.slice(0, 3) : [
      { key: "periodic", label: "periodic oscillation", score: 0 },
      { key: "logistic", label: "bounded S-shaped growth", score: 0 },
      { key: "bell", label: "symmetric bell-shaped peak", score: 0 },
      { key: "quadratic", label: "quadratic parabola", score: 0 }
    ];
    const candidates = [];
    selectedIntents.forEach((intent) => candidatesForIntent(intent.key, description).forEach((candidate) => {
      if (!candidates.some((existing) => existing.expression === candidate.expression)) candidates.push({ ...candidate, intent: intent.label });
    }));
    return { description, queryTokens, ranked, candidates: candidates.slice(0, 4) };
  }

  function suggestFunctions(options = {}) {
    const result = matchDescription(descriptionInput.value);
    const chosen = result.candidates;
    suggestionGrid.innerHTML = chosen.map((item, index) => `<article class="function-suggestion-card"><div class="function-mini-graph"><canvas id="function-mini-${index}" width="320" height="170" aria-label="Preview of ${escapeHTML(item.name)}"></canvas></div><div><span>OPTION ${String(index + 1).padStart(2, "0")}</span><h4>${escapeHTML(item.name)}</h4><code>${escapeHTML(item.expression)}</code><p>${escapeHTML(item.note)}</p><button type="button" data-use-function="${escapeHTML(item.expression)}">Use this function <span aria-hidden="true">→</span></button></div></article>`).join("");
    suggestions.hidden = false;
    chosen.forEach((item, index) => drawGraph(document.getElementById(`function-mini-${index}`), [{ label: item.expression, color: colors[index], evaluate: compileExpression(item.expression) }], -6, 6, true));
    suggestionStatus.textContent = result.ranked.length
      ? `Best library matches: ${result.ranked.slice(0, 3).map((intent) => intent.label).join(", ")}.`
      : "No close library match found; showing popular starting points. Try terms such as line, bell, wave, parabola, decay, plateau, or asymptote.";
    if (options.scroll !== false) suggestions.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  studio.querySelectorAll("[data-function-tab]").forEach((button) => button.addEventListener("click", () => {
    const selected = button.dataset.functionTab;
    studio.querySelectorAll("[data-function-tab]").forEach((tab) => { const active = tab === button; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
    studio.querySelectorAll("[data-function-panel]").forEach((panel) => { const active = panel.dataset.functionPanel === selected; panel.classList.toggle("active", active); panel.hidden = !active; });
  }));
  studio.querySelectorAll("[data-function-example]").forEach((button) => button.addEventListener("click", () => { expressionInput.value = button.dataset.functionExample; renderMainGraph(); }));
  studio.querySelectorAll("[data-function-prompt]").forEach((button) => button.addEventListener("click", () => { descriptionInput.value = button.dataset.functionPrompt; suggestFunctions(); }));
  document.getElementById("function-draw").addEventListener("click", renderMainGraph);
  document.getElementById("function-suggest").addEventListener("click", suggestFunctions);
  document.getElementById("function-reset").addEventListener("click", () => { minInput.value = -10; maxInput.value = 10; renderMainGraph(); });
  const copyEquations = document.getElementById("function-copy-equations");
  const copyGraph = document.getElementById("function-copy-graph");
  const saveGraph = document.getElementById("function-save-graph");
  const equationCopyStatus = document.getElementById("function-copy-equations-status");
  const graphCopyStatus = document.getElementById("function-copy-graph-status");
  if (copyEquations) copyEquations.addEventListener("click", async () => {
    const text = expressionInput.value.trim();
    if (!text) { equationCopyStatus.textContent = "Enter an equation to copy."; return; }
    try {
      await navigator.clipboard.writeText(text);
      equationCopyStatus.textContent = "Equations copied. Paste them into your document or code.";
    } catch {
      expressionInput.focus();
      expressionInput.select();
      equationCopyStatus.textContent = "Clipboard access is unavailable. Equations selected: press Ctrl+C or Command+C to copy.";
    }
  });
  function graphPNG() {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
    });
  }
  if (copyGraph) copyGraph.addEventListener("click", async () => {
    copyGraph.disabled = true;
    try {
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("Image clipboard unavailable");
      // Pass the promise during the click gesture (including Safari).
      await navigator.clipboard.write([new ClipboardItem({ "image/png": graphPNG() })]);
      graphCopyStatus.textContent = "Graph copied as a PNG image. Paste it into your slides or document.";
      saveGraph.hidden = true;
    } catch {
      graphCopyStatus.textContent = "This browser could not copy the image. Use Save PNG to download the displayed graph.";
      saveGraph.hidden = false;
    } finally {
      copyGraph.disabled = false;
    }
  });
  if (saveGraph) saveGraph.addEventListener("click", async () => {
    try {
      const url = URL.createObjectURL(await graphPNG());
      const link = document.createElement("a");
      link.href = url;
      link.download = "visual-mathematics-graph.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      graphCopyStatus.textContent = "PNG download started.";
    } catch {
      graphCopyStatus.textContent = "PNG export failed. Please reopen the lab and try again.";
    }
  });
  suggestionGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-use-function]");
    if (!button) return;
    expressionInput.value = button.dataset.useFunction;
    studio.querySelector('[data-function-tab="equation"]').click();
    renderMainGraph();
    studio.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  expressionInput.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") renderMainGraph(); });
  descriptionInput.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") suggestFunctions(); });
  let suggestionTimer;
  descriptionInput.addEventListener("input", () => {
    clearTimeout(suggestionTimer);
    if (descriptionInput.value.trim().length < 3) return;
    suggestionTimer = setTimeout(() => suggestFunctions({ scroll: false }), 320);
  });
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = currentRange.min + ((event.clientX - rect.left) / rect.width) * (currentRange.max - currentRange.min);
    const values = currentPlots.map((plot) => { const y = plot.evaluate(x); return Number.isFinite(y) ? y.toFixed(3) : "undefined"; });
    coordinate.textContent = `x ${x.toFixed(3)}  ·  ${values.map((value, index) => `y${index + 1} ${value}`).join("  ·  ")}`;
    coordinate.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - coordinate.offsetWidth - 8)}px`;
    coordinate.style.top = `${Math.max(8, event.clientY - rect.top - 34)}px`;
    coordinate.classList.add("visible");
  });
  canvas.addEventListener("pointerleave", () => coordinate.classList.remove("visible"));
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderMainGraph, 120); }, { passive: true });
  if (disclosure) disclosure.addEventListener("toggle", () => {
    if (disclosure.open) requestAnimationFrame(renderMainGraph);
  });

  renderMainGraph();
})();
