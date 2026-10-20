(function () {
  "use strict";
  const models = {
    heat: efficiency => ({ electricity: efficiency, heat: 100 - efficiency }),
    solar: angle => Math.max(0, 100 * Math.cos(angle * Math.PI / 180)),
    hydro: head => 1000 * 9.81 * 1 * head * 0.8 / 1000,
    storage: efficiency => ({ delivered: 2 * efficiency / 100, loss: 2 * (1 - efficiency / 100) }),
    grid: (wind, demand) => {
      const gap = Math.max(0, demand - wind - 4);
      return { gap, energy: gap * 4, powerOK: gap <= 3, energyOK: gap * 4 <= 12 };
    }
  };
  const figureMeta = {
    generator: ["Simplified rotating-coil generator, reconstructed for the Chapter 9 presentation.",9],
    "fossil-power": ["Reconstructed steam-power diagram; Molles & Borrell (2016), §9.2, pp. 270–272.",9],
    "nuclear-power": ["Reconstructed pressurized-water example; Molles & Borrell (2016), §9.3, pp. 272–274. Not a plant safety specification.",9],
    "mountaintop-mining": ["Mary Hufford / Library of Congress, via USGS. West Virginia mountaintop mining; public domain.",9],
    "oil-spill-response": ["Tom MacKenzie / U.S. Fish and Wildlife Service. Deepwater Horizon wildlife response (2010); public domain.",9],
    photovoltaic: ["Reconstructed teaching mechanism from Chapter_10.pptx, adapted from textbook Fig. 10.7.",10],
    geothermal: ["Reconstructed binary-cycle mechanism from Chapter_10.pptx, adapted from textbook Fig. 10.19.",10],
    "reservoir-community": ["Molles & Borrell (2016), Fig. 10.34, from the supplied Chapter 10 presentation. A home affected by the Three Gorges reservoir.",10]
  };
  const chapterLink = ch => `../lectures/${ch === 9 ? "guest-lecture-01-energy-systems" : "guest-lecture-02-renewable-transition"}/`;
  const escape = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slider = (id,label,min,max,step,value,unit) => `<label class="es-slider" for="${id}"><span>${label} <output id="${id}-value" for="${id}">${value}${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  const bar = (label,value,max,unit,color) => `<div class="es-model-bar"><span>${label}</span><div><i class="${color}" style="width:${Math.min(100,Math.max(0,value/max*100))}%"></i></div><strong>${Number(value.toFixed(2))} ${unit}</strong></div>`;
  const flow = (labels) => `<div class="es-flow" aria-label="Energy pathway">${labels.map((t,i)=>`<div><span>${String(i+1).padStart(2,"0")}</span><strong>${t}</strong></div>`).join("")}</div>`;

  function mount(node, media) {
    if (!media) return;
    if (media.kind === "figure") {
      const [caption,ch] = figureMeta[media.asset];
      const src=`../lectures/energy-assets/figures/${media.asset}.webp`;
      node.innerHTML=`<figure class="es-course-figure"><a href="${src}" target="_blank" rel="noopener" aria-label="Open full-size figure in a new tab"><img src="${src}" alt="${escape(media.alt)}" decoding="async"></a><figcaption>${caption} <a href="${chapterLink(ch)}#figure-${media.asset}" target="_blank" rel="noopener">Figure context and credits ↗</a></figcaption></figure>`;
      return;
    }
    if (media.kind === "pathway") {
      node.innerHTML=flow(["Extraction","Processing / transport","Electricity generation","Waste / long-term care"])+`<p class="es-model-note">Simplified life-cycle boundary. Motion indicates sequence, not measured rates or equal impact magnitudes.</p>`;
      return;
    }
    if (media.kind === "spill") {
      node.innerHTML=`<div class="es-spill-scene"><svg viewBox="0 0 700 215" role="img" aria-label="Conceptual oil slick moving toward a wetland; current points right. A boom can divert the surface slick.">
        <rect width="700" height="215" rx="12" fill="#123d51"/><path d="M555 0 Q580 70 548 130 Q540 180 575 215 H700 V0Z" fill="#225c4d"/>
        <path d="M30 130 H470" fill="none" stroke="#81d4ec" stroke-width="4" stroke-dasharray="12 12" class="es-water-flow"/>
        <path d="m460 120 18 10-18 10" fill="none" stroke="#81d4ec" stroke-width="4"/>
        <g class="es-oil"><ellipse cx="220" cy="105" rx="65" ry="25" fill="#e7ae62" opacity=".8"/><ellipse cx="265" cy="120" rx="38" ry="18" fill="#e7ae62" opacity=".65"/></g>
        <path class="es-boom" d="M455 55 L400 165" stroke="#f5e5ba" stroke-width="12" stroke-dasharray="17 3" fill="none" opacity="0"/>
        <text x="28" y="32" fill="#eaf5f9" font-size="20">Surface current →</text><text x="580" y="108" fill="#eaf5f9" font-size="20">Wetland</text>
      </svg></div><div class="es-lab-actions"><button type="button" id="es-boom" aria-pressed="false">Deploy a boom</button><span id="es-spill-readout" role="status">Unprotected shoreline in this schematic.</span></div><p class="es-model-note">Conceptual animation, not a spill forecast or response instruction. Real containment depends on currents, waves, weather and oil type. A boom contains oil; it does not remove it.</p>`;
      node.querySelector("#es-boom").addEventListener("click",event=>{
        const active=event.currentTarget.getAttribute("aria-pressed")!=="true";
        event.currentTarget.setAttribute("aria-pressed",String(active));
        event.currentTarget.textContent=active?"Remove the boom":"Deploy a boom";
        node.classList.toggle("es-contained",active);
        node.querySelector("#es-spill-readout").textContent=active?"Surface spread is limited in this schematic; recovery and monitoring still matter.":"Unprotected shoreline in this schematic.";
      });
      return;
    }
    const settings = {
      heat: ["Thermal energy balance", "Efficiency", 10,60,5,"%"],
      solar: ["Panel-angle experiment", "Angle from panel normal", 0,90,15,"°"],
      hydro: ["Hydropower experiment", "Water drop (head)", 5,40,5," m"],
      storage: ["Storage experiment", "Round-trip efficiency", 50,100,5,"%"],
      grid: ["Four hours after sunset", "Wind supply", 0,6,1," MW"]
    };
    const [title,label,min,max,step,unit]=settings[media.kind];
    node.innerHTML=`<div class="es-lab-heading"><span class="es-eyebrow">INTERACTIVE MODEL</span><h3>${title}</h3><p>Explore freely, then answer for the values specified in the question.</p></div>${slider("es-parameter",label,min,max,step,media.setting,unit)}${media.kind==="grid"?slider("es-demand","Demand",6,12,1,10," MW"):""}<div id="es-model-output" class="es-model-output"></div><p class="es-model-note" id="es-model-note"></p>`;
    const input=node.querySelector("#es-parameter"), second=node.querySelector("#es-demand");
    const update=()=>{
      const v=Number(input.value),o=node.querySelector("#es-model-output"), note=node.querySelector("#es-model-note");
      node.querySelector("#es-parameter-value").textContent=v+unit;
      if(second)node.querySelector("#es-demand-value").textContent=second.value+" MW";
      if(media.kind==="heat"){
        const r=models.heat(v);
        o.innerHTML=flow(["100 input units","Thermal conversion","Electricity + heat"])+bar("Electricity",r.electricity,100,"units","es-teal")+bar("Rejected heat",r.heat,100,"units","es-gold");
        note.textContent="Idealized classroom balance: electricity + rejected heat = 100 input units. Other outputs are combined into the heat term; this is not a measured plant rating.";
      }
      if(media.kind==="solar"){
        const r=models.solar(v);
        o.innerHTML=`<svg viewBox="0 0 600 175" role="img" aria-label="A panel rotated ${v} degrees from perpendicular incidence. Relative direct-beam power ${r.toFixed(1)} percent."><g stroke="#e9be75" stroke-width="4" class="es-sunrays"><path d="M40 45H245 M40 85H245 M40 125H245" stroke-dasharray="14 7"/></g><g transform="translate(325 85) rotate(${v})"><rect x="-7" y="-65" width="14" height="130" fill="#6ddac5"/><path d="M-80 0H80" stroke="#eaf4f7" stroke-width="2" stroke-dasharray="5 5"/></g><text x="410" y="90" fill="#eaf4f7" font-size="24">${r.toFixed(1)}%</text></svg>`+bar("Direct-beam power",r,100,"%","es-teal");
        note.textContent="Ideal projected-area model: relative power = 100 × cos(angle). The dashed line is the panel normal. Diffuse light, temperature and electrical losses are excluded.";
      }
      if(media.kind==="hydro"){
        const p=models.hydro(v);
        o.innerHTML=flow([`${v} m head`,"Water through turbine",`${p.toFixed(1)} kW`])+bar("Calculated output",p,models.hydro(40),"kW","es-teal");
        note.textContent="Classroom model: P = ρgQHη; ρ = 1,000 kg/m³, g = 9.81 m/s², Q = 1 m³/s and η = 80%. Flow and efficiency remain fixed. Real sites have additional limits.";
      }
      if(media.kind==="storage"){
        const r=models.storage(v);
        o.innerHTML=flow(["2 MWh charged","Store and discharge",`${r.delivered.toFixed(2)} MWh delivered`])+bar("Delivered",r.delivered,2,"MWh","es-teal")+bar("Losses",r.loss,2,"MWh","es-gold");
        note.textContent="Classroom energy balance: output = charged energy × round-trip efficiency. The model does not specify a battery's maximum power or chemistry.";
      }
      if(media.kind==="grid"){
        const r=models.grid(v,Number(second.value));
        o.innerHTML=`<div class="es-grid-supply"><span>Hydro <strong>4 MW</strong></span><span>Direct PV <strong>0 MW</strong></span><span>Battery <strong>3 MW / 12 MWh</strong></span></div>`+
          bar("Power gap",r.gap,8,"MW",r.powerOK?"es-teal":"es-gold")+bar("Energy needed (4 h)",r.energy,32,"MWh",r.energyOK?"es-teal":"es-gold")+
          `<div class="es-model-verdict"><strong>${r.powerOK&&r.energyOK?"Within both battery limits":"Battery alone is insufficient"}</strong><span>Power limit: ${r.powerOK?"met":"exceeded"}. Energy capacity: ${r.energyOK?"met":"exceeded"}.</span></div>`;
        note.textContent="Hypothetical isolated system. Wind, hydro and demand stay constant for four hours. The battery starts full with 12 MWh usable output, so losses are already accounted for. No automatic grid imports.";
      }
    };
    input.addEventListener("input",update);if(second)second.addEventListener("input",update);update();
  }
  window.ENV_SCIENCE_LAB={models,mount};
}());
