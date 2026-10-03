// Logo New Place mejorado: mismo tejado doble con la casita central, trazo fino, acento oro y nombre en capitales romanas.
window.npMark = (ink, gold, w = 120) =>
  `<svg width="${w}" height="${(w * 46) / 120}" viewBox="0 0 120 46" aria-hidden="true">
    <path d="M3 36 60 5l57 31" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="square" stroke-linejoin="miter"/>
    <path d="M21 36 60 14.5 99 36" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="square"/>
    <path d="M53 36V27.5L60 22l7 5.5V36" fill="none" stroke="${gold}" stroke-width="2"/>
    <path d="M58 36v-5h4v5" fill="${gold}"/>
  </svg>`;
window.npLogo = (ink, gold, size = 1, stacked = true) => {
  const m = npMark(ink, gold, 120 * size);
  const wm = `<div style="font:500 ${30 * size}px Cinzel,serif;letter-spacing:.3em;padding-left:.3em;color:${ink};line-height:1">NEW PLACE</div>`;
  const tg = `<div style="display:flex;align-items:center;gap:${10 * size}px;margin-top:${9 * size}px;color:${gold};font:600 ${8.5 * size}px Manrope,sans-serif;letter-spacing:.42em;text-transform:uppercase;justify-content:center"><span style="width:${26 * size}px;height:1px;background:${gold};opacity:.7"></span>Bienes raíces<span style="width:${26 * size}px;height:1px;background:${gold};opacity:.7"></span></div>`;
  if (stacked) return `<div style="display:grid;justify-items:center;gap:${8 * size}px">${m}<div>${wm}${tg}</div></div>`;
  return `<div style="display:flex;align-items:center;gap:${12 * size}px">${npMark(ink, gold, 54 * size)}<div style="font:500 ${19 * size}px Cinzel,serif;letter-spacing:.26em;color:${ink};line-height:1">NEW PLACE</div></div>`;
};
document.querySelectorAll("[data-logo]").forEach((el) => {
  const [ink, gold, size, stacked] = el.dataset.logo.split(",");
  el.innerHTML = npLogo(ink, gold, +size, stacked !== "row");
});
