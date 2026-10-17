/* Original classroom arithmetic. These are not engineering or risk models. */
(() => {
  'use strict';
  function equalService(output, efficiency) {
    if (output < 0 || efficiency <= 0 || efficiency > 100) throw new RangeError('Invalid energy balance');
    const input = output / (efficiency / 100);
    return {input, output, heat: input - output};
  }
  function energyReturn(delivered, invested) {
    if (delivered < 0 || invested <= 0) throw new RangeError('Energy investment must be positive');
    return {ratio: delivered / invested, net: delivered - invested};
  }
  function neutronStep(current, rods) {
    const factors = {inserted: 0.2, balanced: 1, withdrawn: 1.35};
    if (!(rods in factors)) throw new RangeError('Unknown toy control state');
    return Math.min(240, current * factors[rods]);
  }
  globalThis.EnergyV1Models = Object.freeze({equalService, energyReturn, neutronStep});
})();
