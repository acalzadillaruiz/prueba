// Logo New Place v2 (comité): doble tejado — exterior en tinta, interior en Terracota Riviera al 60 % del grosor —,
// sin la casita (desaparecía en tamaños pequeños), ápices alineados, Cinzel con tracking .22em, «Bienes raíces» en Manrope.
window.npMark = (ink, teja, w = 120) =>
  `<svg width="${w}" height="${(w * 42) / 120}" viewBox="0 0 120 42" aria-hidden="true">
    <path d="M4 37 60 6l56 31" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linejoin="miter" stroke-miterlimit="10"/>
    <path d="M24 37 60 17 96 37" fill="none" stroke="${teja}" stroke-width="2.05" stroke-linejoin="miter" stroke-miterlimit="10"/>
  </svg>`;
window.npMono = (ink, teja, bg, d = 120) =>
  `<svg width="${d}" height="${d}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="${bg}"/>
    <path d="M26 54 60 33l34 21" fill="none" stroke="${teja}" stroke-width="3"/>
    <text x="60" y="84" text-anchor="middle" font-family="Cinzel" font-weight="500" font-size="30" letter-spacing="2" fill="${ink}">NP</text></svg>`;
window.npLogo = (ink, teja, sub, size = 1, mode = "stack") => {
  if (mode === "row")
    return `<div style="display:flex;align-items:center;gap:${12 * size}px">${npMark(ink, teja, 50 * size)}<div style="font:500 ${19 * size}px Cinzel,serif;letter-spacing:.22em;color:${ink};line-height:1">NEW PLACE</div></div>`;
  return `<div style="display:grid;justify-items:center;gap:${10 * size}px">${npMark(ink, teja, 118 * size)}
    <div style="font:500 ${32 * size}px Cinzel,serif;letter-spacing:.22em;padding-left:.22em;color:${ink};line-height:1">NEW PLACE</div>
    <div style="font:500 ${11 * size}px Manrope,sans-serif;letter-spacing:.34em;padding-left:.34em;text-transform:uppercase;color:${sub}">Bienes raíces</div></div>`;
};
document.querySelectorAll("[data-logo]").forEach((el) => {
  const [ink, teja, sub, size, mode] = el.dataset.logo.split(",");
  el.innerHTML = npLogo(ink, teja, sub, +size, mode);
});
document.querySelectorAll("[data-mono]").forEach((el) => {
  const [ink, teja, bg, d] = el.dataset.mono.split(",");
  el.innerHTML = npMono(ink, teja, bg, +d);
});
