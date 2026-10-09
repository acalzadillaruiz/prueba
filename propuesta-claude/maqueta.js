// Maqueta 4D «Cockpit Tierra»: 3D real en CSS (sin librerías). Se mueve sola, se gira arrastrando (ratón o dedo),
// se despieza por plantas, la luz sigue la hora de 07:00 a 19:00 (empieza en la hora real de Venezuela, UTC-4) y
// desde las 18:00 se encienden las ventanas. Con «reducir movimiento»: un fotograma quieto y botón Reproducir.
(function () {
  const root = document.querySelector("[data-m4d]");
  if (!root) return;
  const FLOORS = 6, FH = 36, SLAB = 6;
  const VOL = [{ x: -60, z: -10, w: 116, d: 124 }, { x: 66, z: 22, w: 112, d: 112 }];
  const rotor = root.querySelector(".rotor");
  const faces = (w, h, d, kind, list = ["front", "back", "left", "right", "top"], extra = "") => list.map((f) => {
    const t = { front: [w, h, `translateZ(${d / 2}px)`], back: [w, h, `rotateY(180deg) translateZ(${d / 2}px)`], right: [d, h, `rotateY(90deg) translateZ(${w / 2}px)`], left: [d, h, `rotateY(-90deg) translateZ(${w / 2}px)`], top: [w, d, `rotateX(90deg) translateZ(${h / 2}px)`] }[f];
    return `<i class="cara ${kind} f-${f} ${f === "top" ? extra : ""}" style="width:${t[0]}px;height:${t[1]}px;margin:${-t[1] / 2}px 0 0 ${-t[0] / 2}px;transform:${t[2]}"></i>`;
  }).join("");
  let html = "";
  for (let i = 0; i < FLOORS; i++) {
    html += `<div class="planta" data-i="${i}">` + VOL.map((v) => `<div class="vol" style="transform:translate3d(${v.x}px,0,${v.z}px)"><div class="caja">${faces(v.w + 14, SLAB, v.d + 12, "losa")}</div><div class="caja" style="transform:translateY(${-(FH - SLAB) / 2 - SLAB / 2}px)">${faces(v.w - 8, FH - SLAB, v.d - 10, "vidrio", ["front", "back", "left", "right"])}</div></div>`).join("") + `</div>`;
  }
  html += `<div class="planta" data-roof>` + VOL.map((v) => `<div class="vol" style="transform:translate3d(${v.x}px,0,${v.z}px)"><div class="caja">${faces(v.w + 14, SLAB + 2, v.d + 12, "techo")}</div></div>`).join("") + `</div>`;
  rotor.innerHTML = html;
  const plantas = [...rotor.querySelectorAll(".planta")];

  const st = { ry: -32, vel: 0, drag: false, lx: 0, lt: 0, hold: 0, t: 0, hour: 17.5, touched: false, ex: 0.3, floor: null, paused: false, live: false };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slider = root.querySelector("input[type=range]");
  const marca = root.querySelector(".marca");
  const playBtn = root.querySelector("[data-play]");
  const hhmm = (h) => { const m = Math.round((h % 1) * 60); const H = Math.floor(h) + (m === 60 ? 1 : 0); return `${String(H).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const now = new Date();
  st.hour = Math.min(19, Math.max(7, ((now.getUTCHours() + 20) % 24) + now.getUTCMinutes() / 60));
  if (reduced) st.paused = true;
  const sm = (t) => t * t * (3 - 2 * t);
  const explode = (p) => (p < 0.15 ? 0 : p < 0.35 ? sm((p - 0.15) / 0.2) : p < 0.7 ? 1 : p < 0.9 ? 1 - sm((p - 0.7) / 0.2) : 0);

  function paint() {
    const h = st.hour, day = (h - 7) / 12, az = 90 + day * 180, el = Math.sin(Math.PI * Math.min(1, Math.max(0, day)));
    for (const [f, a] of Object.entries({ front: 180, right: 90, back: 0, left: 270 })) {
      const lit = Math.max(0, Math.cos(((a + st.ry - az) * Math.PI) / 180));
      root.style.setProperty(`--sh-${f}`, (0.5 - 0.42 * lit * (0.4 + 0.6 * el)).toFixed(3));
    }
    root.style.setProperty("--sh-top", (0.3 - 0.24 * el).toFixed(3));
    root.style.setProperty("--ry", `${st.ry.toFixed(2)}deg`);
    root.style.setProperty("--luces", Math.min(1, Math.max(0, (h - 17.6) / 0.8)).toFixed(3));
    const len = 30 + (1 - el) * 80, r = ((az + 180) * Math.PI) / 180;
    root.style.setProperty("--shx", `${(Math.sin(r) * len).toFixed(1)}px`);
    root.style.setProperty("--shy", `${(-Math.cos(r) * len * 0.5).toFixed(1)}px`);
    plantas.forEach((p, i) => {
      const roof = p.hasAttribute("data-roof");
      const y = roof ? -FLOORS * FH - SLAB / 2 - st.ex * (FLOORS * 18 + 26) : -i * FH - SLAB / 2 - st.ex * i * 18;
      const out = st.floor === i ? 56 : 0;
      p.style.transform = `translate3d(0,${y}px,${out}px)`;
      p.classList.toggle("sel", st.floor === i);
      p.querySelectorAll(".losa.f-top").forEach((t) => t.classList.toggle("plano-planta", st.floor === i));
    });
    root.querySelectorAll(".etiquetas li").forEach((li, k) => {
      const fl = [4, 2, 0][k] ?? 0;
      const y = ((fl + 0.5) * FH + fl * 18 * st.ex) * Math.cos((22 * Math.PI) / 180);
      li.style.bottom = `calc(24% + ${y}px * var(--s, .7))`;
    });
    slider.value = h; slider.style.setProperty("--p", `${((h - 7) / 12) * 100}%`);
    marca.textContent = hhmm(h); marca.style.left = `${((h - 7) / 12) * 100}%`;
  }
  let raf = 0, prev = 0, lastPaint = 0;
  const coarse = matchMedia("(pointer: coarse)").matches;
  function tick(t) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(64, t - (prev || t)); prev = t; st.t += dt;
    if (!st.drag) { if (Math.abs(st.vel) > 0.002) { st.ry += st.vel * dt; st.vel *= Math.pow(0.94, dt / 16); } else if (t > st.hold) st.ry += (360 / 40000) * dt; }
    const p = (st.t % 10000) / 10000;
    st.ex = st.floor === null ? explode(p) : 0.55;
    root.style.setProperty("--trazo", st.floor === null && p >= 0.15 && p < 0.18 ? ((p - 0.15) / 0.03).toFixed(3) : "1");
    if (!st.touched) st.hour = 7 + 12 * p;
    if (!coarse || t - lastPaint > 33) { lastPaint = t; paint(); }
  }
  function run() { cancelAnimationFrame(raf); prev = 0; if (st.live && !st.paused) raf = requestAnimationFrame(tick); else paint(); }
  new IntersectionObserver(([e]) => { st.live = e.intersectionRatio >= 0.35; run(); }, { threshold: [0, 0.35] }).observe(root);
  playBtn.addEventListener("click", () => { st.paused = !st.paused; playBtn.setAttribute("aria-pressed", String(st.paused)); playBtn.setAttribute("aria-label", st.paused ? "Reproducir" : "Pausar"); playBtn.innerHTML = st.paused ? "&#9654;" : "&#10074;&#10074;"; run(); });
  playBtn.setAttribute("aria-pressed", String(st.paused)); if (st.paused) { playBtn.innerHTML = "&#9654;"; playBtn.setAttribute("aria-label", "Reproducir"); }
  slider.addEventListener("input", () => { st.touched = true; st.hour = +slider.value; paint(); });
  root.querySelectorAll("[data-floor]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.floor; st.floor = st.floor === i ? null : i;
    root.querySelectorAll("[data-floor]").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.floor === st.floor)));
    paint();
  }));
  const vista = root.querySelector(".vista");
  vista.addEventListener("pointerdown", (e) => { st.drag = true; st.vel = 0; st.lx = e.clientX; st.lt = performance.now(); vista.setPointerCapture(e.pointerId); });
  vista.addEventListener("pointermove", (e) => { if (!st.drag) return; const n = performance.now(), dx = e.clientX - st.lx; st.ry += dx * 0.42; st.vel = (dx * 0.42) / Math.max(8, n - st.lt); st.lx = e.clientX; st.lt = n; paint(); });
  const up = () => { if (!st.drag) return; st.drag = false; st.hold = performance.now() + 3500; };
  vista.addEventListener("pointerup", up); vista.addEventListener("pointercancel", up);
  vista.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); st.ry += e.key === "ArrowLeft" ? -15 : 15; st.hold = performance.now() + 3500; paint(); } });
  if (reduced) st.ex = 0.35;
  paint();
})();
