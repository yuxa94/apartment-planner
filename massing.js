/* Simple 3D massing view: an axonometric SVG of the site and each building
   outline extruded to its screening height H (engine buildingHeight), with the
   정북 sky plane and 인동거리 lines from the engine result. No WebGL or external
   library; painter's ordering is enough for separate prisms.
   World: metres, x right (east), y down (south), z up. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerMassing = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rad = d => d * Math.PI / 180;
  const m1 = v => Number.isFinite(v) ? v.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';

  // Camera: azimuth rotates the plan (degrees, clockwise on screen), elevation
  // tilts it (0 = side view, 90 = plan). project → [screenX, screenY, depth].
  function camera(center, azimuth, elevation) {
    const a = rad(azimuth), e = rad(elevation), ca = Math.cos(a), sa = Math.sin(a), se = Math.sin(e), ce = Math.cos(e);
    const rotate = (x, y) => { const dx = x - center[0], dy = y - center[1]; return [dx * ca - dy * sa, dx * sa + dy * ca]; };
    return {
      center, azimuth, elevation, rotate,
      project: (x, y, z) => { const [rx, ry] = rotate(x, y); return [rx, ry * se - z * ce, ry]; },
      // Screen point (viewBox units) → world point on the ground (z = 0).
      ground: (sx, sy) => { const rx = sx, ry = sy / se; return [center[0] + rx * ca + ry * sa, center[1] - rx * sa + ry * ca]; },
      zScale: ce
    };
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    return `rgb(${c.join(',')})`;
  }

  function rayToBoundary(o, dir, site) {
    let best = Infinity;
    for (let i = 0; i < site.length; i++) {
      const a = site[i], b = site[(i + 1) % site.length], e = [b[0] - a[0], b[1] - a[1]];
      const den = dir[0] * e[1] - dir[1] * e[0];
      if (Math.abs(den) < 1e-12) continue;
      const w = [a[0] - o[0], a[1] - o[1]];
      const t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * dir[1] - w[1] * dir[0]) / den;
      if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
    }
    return Number.isFinite(best) ? best : 0;
  }

  // 정북 sky plane over one building's east–west span: no building within the
  // low setback, the low height up to Lh·f, then height = distance / factor.
  function northSheet(poly, rules, P, pts, fail) {
    const a = rad(rules.northAngle || 0), N = [Math.sin(a), -Math.cos(a)], E = [Math.cos(a), Math.sin(a)], S = [-N[0], -N[1]];
    const proj = p => p[0] * E[0] + p[1] * E[1];
    const ends = [poly.reduce((m, p) => proj(p) < proj(m) ? p : m), poly.reduce((m, p) => proj(p) > proj(m) ? p : m)];
    const deep = Math.max(...poly.map(p => rayToBoundary(p, N, poly.site))) + 4;
    const s = rules.northLowSetback, Lh = rules.northLowHeight, f = rules.northFactor || 0.5;
    const profile = [[s, 0], [s, Lh]];
    if (Lh * f > s) profile.push([Lh * f, Lh]);
    profile.push([Math.max(deep, Lh * f + 1), Math.max(deep, Lh * f + 1) / f]);
    const lines = ends.map(p => {
      const t = rayToBoundary(p, N, poly.site), h = [p[0] + N[0] * t, p[1] + N[1] * t];
      return profile.map(([d, z]) => P(h[0] + S[0] * d, h[1] + S[1] * d, z));
    });
    const color = fail ? '#e0584a' : '#8e6cff';
    let out = '';
    for (let i = 0; i < profile.length - 1; i++) {
      out += `<polygon points="${pts([lines[0][i], lines[1][i], lines[1][i + 1], lines[0][i + 1]])}" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".7" stroke-width=".25"/>`;
    }
    return out;
  }

  // Selected building's candidate area (same grid as the drawing view) laid on
  // the ground: merged row runs plus the region edge.
  function candidateArea(heat, P, pts) {
    if (!heat || !heat.ok) return '';
    const { ok, nx, ny, x0, y0, step } = heat, at = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && ok[j * nx + i] === 1;
    const z = 0.05;
    let cells = '', edge = '';
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!at(i, j)) continue;
        let run = 1;
        while (at(i + run, j)) run++;
        const l = x0 + (i - 0.5) * step, t = y0 + (j - 0.5) * step, r = l + run * step, b = t + step;
        cells += `<polygon points="${pts([P(l, t, z), P(r, t, z), P(r, b, z), P(l, b, z)])}"/>`;
        i += run - 1;
      }
    }
    const seg = (a, b) => { const p = P(a[0], a[1], z), q = P(b[0], b[1], z); edge += `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`; };
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!at(i, j)) continue;
        const l = x0 + (i - 0.5) * step, t = y0 + (j - 0.5) * step, r = l + step, b = t + step;
        if (!at(i, j - 1)) seg([l, t], [r, t]);
        if (!at(i, j + 1)) seg([l, b], [r, b]);
        if (!at(i - 1, j)) seg([l, t], [l, b]);
        if (!at(i + 1, j)) seg([r, t], [r, b]);
      }
    }
    return `<g class="candidate-area" pointer-events="none"><g fill="#3fae7a" fill-opacity=".32">${cells}</g><path d="${edge}" fill="none" stroke="#23875a" stroke-width=".35"/></g>`;
  }

  // opts: project, result, footprint(b) → world outline, selected, azimuth,
  // elevation, zoom, viewBox (keeps the frame fixed while dragging),
  // showNorth, showDistances. Returns { svg, viewBox, camera }.
  function render(opts) {
    const { project, result, footprint, selected } = opts;
    const azimuth = opts.azimuth ?? -25, elevation = opts.elevation ?? 35, zoom = opts.zoom ?? 1;
    const site = project.site.polygon, rules = project.rules;
    const center = [site.reduce((s, p) => s + p[0], 0) / site.length, site.reduce((s, p) => s + p[1], 0) / site.length];
    const cam = camera(center, azimuth, elevation);
    const light = [-0.45, 0.75]; // from the viewer's lower left, in rotated plan
    const byId = new Map(result.buildings.map(q => [q.id, q]));
    const P = (x, y, z) => cam.project(x, y, z);
    const pts = list => list.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

    const ground = site.map(p => P(p[0], p[1], 0));
    let body = `<polygon points="${pts(ground)}" fill="#eef3ee" stroke="#d1453b" stroke-width="0.5" stroke-dasharray="2 1"/>`;

    const items = project.buildings.map(b => {
      const q = byId.get(b.id), corners = footprint(b);
      return { b, q, H: q.height, corners, depth: cam.rotate(b.x, b.y)[1] };
    }).sort((u, v) => u.depth - v.depth);

    body += candidateArea(opts.heat, P, pts);
    for (const it of items) body += `<polygon points="${pts(it.corners.map(c => P(c[0], c[1], 0)))}" fill="#00000018"/>`;

    // 인동거리 on the ground: pairs touching the selection, and every failure.
    const pairs = opts.showDistances === false ? [] : result.pairs.filter(p => p.a && p.b && p.distance > 0 && (!p.pass || p.aId === selected || p.bId === selected));
    const pairLabels = [];
    for (const pr of pairs) {
      const a = P(pr.a[0], pr.a[1], 0.3), b = P(pr.b[0], pr.b[1], 0.3), c = pr.pass ? '#2f8f6b' : '#d1453b';
      body += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="0.45" stroke-dasharray="${pr.pass ? '1.4 .8' : 'none'}"/>`;
      pairLabels.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, c, text: `${pr.pass ? '' : '✕ '}${m1(pr.distance)} / 요구 ${m1(pr.required)} m` });
    }

    const labels = [];
    for (const { b, q, H, corners } of items) {
      const sel = b.id === selected;
      const base = !q.pass ? '#e9a99f' : sel ? '#8fbad6' : '#cfd9dc';
      const stroke = !q.pass ? '#b5574b' : sel ? '#2f6f99' : '#6f8790';
      const rc = corners.map(c => cam.rotate(c[0], c[1]));
      let area = 0;
      rc.forEach((p, i) => { const r = rc[(i + 1) % rc.length]; area += p[0] * r[1] - r[0] * p[1]; });
      const faces = [];
      for (let i = 0; i < rc.length; i++) {
        const j = (i + 1) % rc.length, e = [rc[j][0] - rc[i][0], rc[j][1] - rc[i][1]], len = Math.hypot(e[0], e[1]) || 1;
        const n = area >= 0 ? [e[1] / len, -e[0] / len] : [-e[1] / len, e[0] / len];
        if (n[1] <= 0) continue; // faces away from the viewer
        faces.push({ i, j, n, depth: (rc[i][1] + rc[j][1]) / 2 });
      }
      faces.sort((u, v) => u.depth - v.depth);
      let svg = '';
      for (const { i, j, n } of faces) {
        const f = 0.72 + 0.22 * Math.max(0, n[0] * light[0] + n[1] * light[1]);
        const quad = [P(corners[i][0], corners[i][1], 0), P(corners[j][0], corners[j][1], 0), P(corners[j][0], corners[j][1], H), P(corners[i][0], corners[i][1], H)];
        svg += `<polygon points="${pts(quad)}" fill="${shade(base, f)}" stroke="${stroke}" stroke-width="0.25"/>`;
        // Floor lines at equal spacing: a visual cue, not the exact section.
        let lines = '';
        for (let k = 1; k < b.floors; k++) {
          const z = H * k / b.floors, a = cam.project(corners[i][0], corners[i][1], z), c = cam.project(corners[j][0], corners[j][1], z);
          lines += `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${c[0].toFixed(2)} ${c[1].toFixed(2)}`;
        }
        if (lines) svg += `<path d="${lines}" stroke="#00000022" stroke-width="0.15"/>`;
      }
      svg += `<polygon points="${pts(corners.map(c => P(c[0], c[1], H)))}" fill="${shade(base, 1.06)}" stroke="${stroke}" stroke-width="${sel ? 0.6 : 0.35}"/>`;
      body += `<g class="mass-building" data-mass="${esc(b.id)}">${svg}</g>`;
      const tc = cam.project(b.x, b.y, H);
      labels.push({ x: tc[0], y: tc[1], b, H, sel, pass: q.pass, q, corners });
    }

    // 정북 sky planes (rules.northEnabled), drawn over the masses like glass.
    if (rules.northEnabled && opts.showNorth !== false) {
      for (const l of labels) {
        const poly = l.corners.slice(); poly.site = site;
        if (!l.sel && l.q.northPass) continue;
        body += `<g class="north-sheet" pointer-events="none">${northSheet(poly, rules, P, pts, !l.q.northPass)}</g>`;
      }
    }

    // Frame from rotation-invariant sizes (site radius, tallest H), so orbiting
    // never changes the apparent zoom; pan shifts the frame centre.
    const radius = Math.max(...site.map(p => Math.hypot(p[0] - center[0], p[1] - center[1])));
    const tallest = Math.max(0, ...items.map(it => it.H));
    const span = 2.3 * Math.max(radius, tallest * 0.75) + 20, aspect = opts.aspect > 0 ? opts.aspect : 0.75;
    const pan = opts.pan || [0, 0], w = span / zoom, h = w * aspect;
    const cy = -tallest * cam.zScale * 0.35;
    const vb = opts.viewBox || [pan[0] - w / 2, cy + pan[1] - h / 2, w, h];
    const fs = vb[2] / 70;
    for (const pl of pairLabels) {
      const w = pl.text.length * fs * 0.5 + fs;
      body += `<g pointer-events="none"><rect x="${pl.x - w / 2}" y="${pl.y - fs * 0.85}" width="${w}" height="${fs * 1.2}" rx="${fs * 0.2}" fill="#ffffffe6" stroke="${pl.c}" stroke-width="${fs * 0.04}"/>` +
        `<text x="${pl.x}" y="${pl.y}" text-anchor="middle" font-size="${fs * 0.72}" font-weight="600" fill="${pl.c}">${esc(pl.text)}</text></g>`;
    }
    for (const l of labels) {
      const north = rules.northEnabled ? ` · 정북 ${m1(l.q.northDistance)}/${m1(l.q.northRequired)} m` : '';
      body += `<g pointer-events="none"><line x1="${l.x}" y1="${l.y}" x2="${l.x}" y2="${l.y - fs * 2.2}" stroke="#55707a" stroke-width="${fs * 0.06}"/>` +
        `<text x="${l.x}" y="${l.y - fs * 3.4}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${l.pass ? (l.sel ? '#1f5f86' : '#2f4d58') : '#b5574b'}">${esc(l.b.name)}</text>` +
        `<text x="${l.x}" y="${l.y - fs * 2.4}" text-anchor="middle" font-size="${fs * 0.72}" fill="${l.q.northPass ? '#55707a' : '#b5574b'}">${l.b.floors}F · H ${m1(l.H)} m${north}</text></g>`;
      if (l.sel && !l.b.locked) {
        // Roof handle: drag up or down to change the number of floors.
        body += `<g class="roof-handle" data-roof="${esc(l.b.id)}" style="cursor:ns-resize"><title>위아래로 드래그해 층수 변경</title>` +
          `<circle cx="${l.x}" cy="${l.y}" r="${fs * 1.4}" fill="transparent"/>` +
          `<circle cx="${l.x}" cy="${l.y}" r="${fs * 0.75}" fill="#2f6f99" stroke="#fff" stroke-width="${fs * 0.12}"/>` +
          `<path d="M${l.x} ${l.y - fs * 0.45}l${-fs * 0.3} ${fs * 0.3}M${l.x} ${l.y - fs * 0.45}l${fs * 0.3} ${fs * 0.3}M${l.x} ${l.y + fs * 0.45}l${-fs * 0.3} ${-fs * 0.3}M${l.x} ${l.y + fs * 0.45}l${fs * 0.3} ${-fs * 0.3}" stroke="#fff" stroke-width="${fs * 0.1}"/></g>`;
      }
    }
    // North arrow, turned with the camera.
    const north = rad((rules.northAngle || 0) + azimuth), nx = vb[0] + vb[2] - fs * 3, ny = vb[1] + fs * 3;
    const tip = [nx + Math.sin(north) * fs * 1.6, ny - Math.cos(north) * fs * 1.6 * Math.sin(rad(elevation))];
    body += `<g pointer-events="none"><circle cx="${nx}" cy="${ny}" r="${fs * 1.9}" fill="#ffffffcc" stroke="#9fb3ab" stroke-width="${fs * 0.05}"/>` +
      `<line x1="${nx}" y1="${ny}" x2="${tip[0]}" y2="${tip[1]}" stroke="#486d63" stroke-width="${fs * 0.18}"/>` +
      `<text x="${tip[0]}" y="${tip[1] - fs * 0.3}" text-anchor="middle" font-size="${fs * 0.8}" fill="#486d63">N</text></g>`;
    return { svg: `<rect class="mass-bg" x="-100000" y="-100000" width="200000" height="200000" fill="#f4f7f6"/>${body}`, viewBox: vb, camera: cam };
  }

  return Object.freeze({ render, camera });
}));
