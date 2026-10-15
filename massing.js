/* Simple 3D massing view: an axonometric SVG of the site and each building
   extruded to its screening height H (engine buildingHeight). No WebGL or
   external library; painter's ordering is enough for separate boxes.
   World: metres, x right, y down (south), z up. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerMassing = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rad = d => d * Math.PI / 180;

  // Camera: azimuth rotates the plan (degrees, clockwise on screen), elevation
  // tilts it (0 = side view, 90 = plan). Returns a projector for [x, y, z].
  function camera(center, azimuth, elevation) {
    const a = rad(azimuth), e = rad(elevation), ca = Math.cos(a), sa = Math.sin(a), se = Math.sin(e), ce = Math.cos(e);
    const rotate = (x, y) => { const dx = x - center[0], dy = y - center[1]; return [dx * ca - dy * sa, dx * sa + dy * ca]; };
    return {
      rotate,
      project: (x, y, z) => { const [rx, ry] = rotate(x, y); return [rx, ry * se - z * ce, ry]; }
    };
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    return `rgb(${c.join(',')})`;
  }

  // opts: project, result, footprint(b) → corners, selected, azimuth, elevation,
  // zoom. Returns { svg, viewBox }.
  function render(opts) {
    const { project, result, footprint, selected } = opts;
    const azimuth = opts.azimuth ?? -25, elevation = opts.elevation ?? 35, zoom = opts.zoom ?? 1;
    const site = project.site.polygon;
    const center = [site.reduce((s, p) => s + p[0], 0) / site.length, site.reduce((s, p) => s + p[1], 0) / site.length];
    const cam = camera(center, azimuth, elevation);
    const light = [-0.45, 0.75]; // from the viewer's lower left, in rotated plan
    const byId = new Map(result.buildings.map(q => [q.id, q]));
    const all = [];
    const P = (x, y, z) => { const p = cam.project(x, y, z); all.push(p); return p; };
    const pts = list => list.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

    const ground = site.map(p => P(p[0], p[1], 0));
    let body = `<polygon points="${pts(ground)}" fill="#eef3ee" stroke="#6f9989" stroke-width="0.5" stroke-dasharray="2 1"/>`;

    const items = project.buildings.map(b => {
      const q = byId.get(b.id), H = q.height, corners = footprint(b);
      const depth = cam.rotate(b.x, b.y)[1];
      return { b, q, H, corners, depth };
    }).sort((u, v) => u.depth - v.depth);

    // Footprint shadows first so every building sits on them.
    for (const it of items) body += `<polygon points="${pts(it.corners.map(c => P(c[0], c[1], 0)))}" fill="#00000018"/>`;

    const labels = [];
    for (const { b, q, H, corners } of items) {
      const sel = b.id === selected;
      const base = !q.pass ? '#e9a99f' : sel ? '#8fbad6' : '#cfd9dc';
      const stroke = !q.pass ? '#b5574b' : sel ? '#2f6f99' : '#6f8790';
      const rc = corners.map(c => cam.rotate(c[0], c[1]));
      const cx = rc.reduce((s, p) => s + p[0], 0) / 4, cy = rc.reduce((s, p) => s + p[1], 0) / 4;
      let faces = '';
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4, e = [rc[j][0] - rc[i][0], rc[j][1] - rc[i][1]];
        let n = [e[1], -e[0]];
        const len = Math.hypot(n[0], n[1]) || 1; n = [n[0] / len, n[1] / len];
        if (n[0] * ((rc[i][0] + rc[j][0]) / 2 - cx) + n[1] * ((rc[i][1] + rc[j][1]) / 2 - cy) < 0) n = [-n[0], -n[1]];
        if (n[1] <= 0) continue; // faces away from the viewer
        const f = 0.72 + 0.22 * Math.max(0, n[0] * light[0] + n[1] * light[1]);
        const quad = [P(corners[i][0], corners[i][1], 0), P(corners[j][0], corners[j][1], 0), P(corners[j][0], corners[j][1], H), P(corners[i][0], corners[i][1], H)];
        faces += `<polygon points="${pts(quad)}" fill="${shade(base.startsWith('#') ? base : '#cfd9dc', f)}" stroke="${stroke}" stroke-width="0.3"/>`;
        // Floor lines at equal spacing: a visual cue, not the exact section.
        let lines = '';
        for (let k = 1; k < b.floors; k++) {
          const z = H * k / b.floors, a = cam.project(corners[i][0], corners[i][1], z), c = cam.project(corners[j][0], corners[j][1], z);
          lines += `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${c[0].toFixed(2)} ${c[1].toFixed(2)}`;
        }
        if (lines) faces += `<path d="${lines}" stroke="#00000022" stroke-width="0.18"/>`;
      }
      const top = corners.map(c => P(c[0], c[1], H));
      faces += `<polygon points="${pts(top)}" fill="${shade(base, 1.06)}" stroke="${stroke}" stroke-width="${sel ? 0.6 : 0.35}"/>`;
      body += `<g class="mass-building" data-mass="${esc(b.id)}">${faces}</g>`;
      const tc = cam.project(b.x, b.y, H);
      labels.push({ x: tc[0], y: tc[1], b, H, sel, pass: q.pass });
    }

    const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 0.08 * Math.max(maxX - minX, maxY - minY) + 10;
    let vb = [minX - pad, minY - pad * 1.6, maxX - minX + pad * 2, maxY - minY + pad * 2.6];
    if (zoom !== 1) vb = [vb[0] + vb[2] * (1 - 1 / zoom) / 2, vb[1] + vb[3] * (1 - 1 / zoom) / 2, vb[2] / zoom, vb[3] / zoom];
    const fs = vb[2] / 70;
    for (const l of labels) {
      body += `<g pointer-events="none"><line x1="${l.x}" y1="${l.y}" x2="${l.x}" y2="${l.y - fs * 2.2}" stroke="#55707a" stroke-width="${fs * 0.06}"/>` +
        `<text x="${l.x}" y="${l.y - fs * 3.4}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${l.pass ? (l.sel ? '#1f5f86' : '#2f4d58') : '#b5574b'}">${esc(l.b.name)}</text>` +
        `<text x="${l.x}" y="${l.y - fs * 2.4}" text-anchor="middle" font-size="${fs * 0.78}" fill="#55707a">${l.b.floors}F · H ${l.H.toFixed(1)} m</text></g>`;
    }
    // North arrow, turned with the camera.
    const north = rad((project.rules.northAngle || 0) + azimuth), nx = vb[0] + vb[2] - fs * 3, ny = vb[1] + fs * 3;
    const tip = [nx + Math.sin(north) * fs * 1.6, ny - Math.cos(north) * fs * 1.6 * Math.sin(rad(elevation))];
    body += `<g pointer-events="none"><circle cx="${nx}" cy="${ny}" r="${fs * 1.9}" fill="#ffffffcc" stroke="#9fb3ab" stroke-width="${fs * 0.05}"/>` +
      `<line x1="${nx}" y1="${ny}" x2="${tip[0]}" y2="${tip[1]}" stroke="#486d63" stroke-width="${fs * 0.18}"/>` +
      `<text x="${tip[0]}" y="${tip[1] - fs * 0.3}" text-anchor="middle" font-size="${fs * 0.8}" fill="#486d63">N</text></g>`;
    return { svg: `<rect x="-100000" y="-100000" width="200000" height="200000" fill="#f4f7f6"/>${body}`, viewBox: vb };
  }

  return Object.freeze({ render, camera });
}));
