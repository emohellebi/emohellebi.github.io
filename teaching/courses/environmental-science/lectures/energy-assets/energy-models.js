/* Original, deliberately simplified classroom models; no external services. */
(() => {
  const thermal = (input, efficiency) => ({input, electricity: input * efficiency / 100, heat: input * (1 - efficiency / 100)});
  const decay = (initial, halfLife, time) => initial * 2 ** (-time / halfLife);
  const wind = speed => speed < 3 || speed >= 25 ? 0 : Math.min(1, (speed ** 3 - 27) / (12 ** 3 - 27));
  function grid(p) {
    const factor = p.weather === 'weak' ? .25 : 1;
    const demand = [40, 70, 90].map(v => v * (1 - p.efficiency / 100));
    demand[1] += p.shift; demand[2] -= p.shift;
    const renewable = [p.wind * factor, p.solar + p.wind * .5 * factor, p.wind * factor];
    let stored = 0;
    const rows = demand.map((d, i) => {
      const before = stored;
      const surplus = Math.max(0, renewable[i] - d) * 8;
      const charged = Math.min(surplus, Math.max(0, p.battery - stored));
      const returned = Math.min(Math.max(0, d - renewable[i]) * 8, p.power * 8, stored * .8);
      stored += charged - returned / .8;
      return {d, r: renewable[i], before, charged, returned, stored, backup: Math.max(0, d - renewable[i] - returned / 8), curtailed: surplus - charged};
    });
    return {demand, renewable, rows, total: rows.reduce((s, r) => s + r.backup * 8, 0), peak: Math.max(...rows.map(r => r.backup))};
  }
  globalThis.EnergyModels = Object.freeze({thermal, decay, wind, grid});
})();
