/* Site map renderer: the plan (editing) view and a CAD-style review drawing that
   follows the reference 인동거리배치도 sheets. Coordinates are metres, x right,
   y down. Annotations restate engine results; they are not legal judgements. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerDrawing = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mm = v => Number.isFinite(v) ? Math.round(v * 1000).toLocaleString('en-US') : '—';
  const m1 = v => Number.isFinite(v) ? v.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
  const pts = poly => poly.map(p => p.join(',')).join(' ');
  const factorText = f => `${(Math.round(f * 100) / 100).toFixed(1)}H`;

  const THEMES = {
    plan: {
      bg: '#f1f5f2', dot: '#d6e0d9', siteFill: '#ffffffa0', siteEdge: '#baccc2', site: '#6f9989', siteDash: '2 1',
      setback: null, pass: '#578e88', fail: '#d1453b', text: '#617b7b', muted: '#92a4a0', north: '#486d63'
    },
    cad: {
      bg: '#1f2428', dot: null, siteFill: 'none', siteEdge: null, site: '#ff4b4b', siteDash: '4 1.2 .8 1.2',
      setback: '#4fd6e8', pass: '#7ee08a', fail: '#ff5c5c', text: '#e8edf0', muted: '#9fb0b8', north: '#e8edf0'
    }
  };

  // Text width estimate for label boxes: Hangul ≈ 1 em, Latin/digits ≈ 0.58 em.
  function textWidth(text, size) {
    let w = 0;
    for (const ch of String(text)) w += ch.charCodeAt(0) > 0x1100 ? size : size * 0.58;
    return w;
  }

  // Inward offset of a simple polygon (miter joins), used for the 건축한계선 /
  // 대지안의 공지 line. Concave corners are clamped to avoid long spikes.
  function offsetPolygon(poly, d) {
    if (!(d > 0)) return null;
    let area = 0;
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; });
    const sign = area > 0 ? 1 : -1; // inward normal side for this winding
    const lines = poly.map((a, i) => {
      const b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = [-(b[1] - a[1]) / len * sign, (b[0] - a[0]) / len * sign];
      return { p: [a[0] + n[0] * d, a[1] + n[1] * d], t: [(b[0] - a[0]) / len, (b[1] - a[1]) / len] };
    });
    return lines.map((l1, i) => {
      const l0 = lines[(i + lines.length - 1) % lines.length];
      const den = l0.t[0] * l1.t[1] - l0.t[1] * l1.t[0];
      if (Math.abs(den) < 1e-9) return l1.p;
      const w = [l1.p[0] - l0.p[0], l1.p[1] - l0.p[1]];
      const s = (w[0] * l1.t[1] - w[1] * l1.t[0]) / den;
      const q = [l0.p[0] + l0.t[0] * s, l0.p[1] + l0.t[1] * s];
      const corner = poly[i];
      const far = Math.hypot(q[0] - corner[0], q[1] - corner[1]);
      return far > d * 4 ? l1.p : q;
    });
  }

  // "(기준 1.0H, 20F=56,850)" style annotation from an engine pair basis.
  function basisNote(basis) {
    const parts = [];
    if (basis.fixed) parts.push(`${basis.fixed}m`);
    for (const t of basis.terms || []) parts.push(`${factorText(t.factor)}, ${t.floors}F=${mm(t.value)}`);
    if (basis.min) parts.push(`최소 ${basis.min}m`);
    const tag = { 'side-side': '측벽 ', 'south-low': '남측저층 ', 'light-side': '채광↔측벽 ', diagonal: '대각·가정 ', uniform: '단순 ' }[basis.type] || '';
    return `(기준 ${tag}${parts.join(' / ')})`;
  }

  // Text placed along a segment, kept upright, offset to one side of the line.
  function alongText(a, b, text, size, color, offset, weight = 500) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang <= -90) ang += 180;
    return `<text transform="translate(${mx} ${my}) rotate(${ang})" y="${offset}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(text)}</text>`;
  }

  function dimension(a, b, color, k, width) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const n = [-(b[1] - a[1]) / len * 0.9 * k, (b[0] - a[0]) / len * 0.9 * k];
    const tick = p => `<line x1="${p[0] - n[0]}" y1="${p[1] - n[1]}" x2="${p[0] + n[0]}" y2="${p[1] + n[1]}" stroke="${color}" stroke-width="${0.25 * k}"/>`;
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}"/>${tick(a)}${tick(b)}`;
  }

  function hexTag(x, y, top, bottom, k, color) {
    const r = 3.2 * k, h = r * 0.62;
    const path = [[-r, 0], [-r / 2, -h * 1.6], [r / 2, -h * 1.6], [r, 0], [r / 2, h * 1.6], [-r / 2, h * 1.6]].map(p => `${x + p[0]},${y + p[1]}`).join(' ');
    return `<polygon points="${path}" fill="#1f2428" stroke="${color}" stroke-width="${0.25 * k}"/><line x1="${x - r}" y1="${y}" x2="${x + r}" y2="${y}" stroke="${color}" stroke-width="${0.2 * k}"/>` +
      `<text x="${x}" y="${y - 0.75 * k}" text-anchor="middle" font-size="${1.9 * k}" fill="#e8edf0">${esc(top)}</text>` +
      `<text x="${x}" y="${y + 2.1 * k}" text-anchor="middle" font-size="${1.9 * k}" fill="#e8edf0">${esc(bottom)}</text>`;
  }

  function planPairLabel(pair, k) {
    const ok = pair.pass, color = ok ? THEMES.plan.pass : THEMES.plan.fail, a = pair.a, c = pair.b;
    const main = `${ok ? '' : '✕ '}실제 ${m1(pair.distance)} / 요구 ${m1(pair.required)} m`;
    const sub = pair.basis.text;
    const fs1 = 2.3 * k, fs2 = 1.9 * k, w = Math.max(textWidth(main, fs1), textWidth(sub, fs2)) + 4 * k;
    const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2;
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${color}" stroke-width="${(ok ? 0.5 : 0.7) * k}" stroke-dasharray="${ok ? `${1.1 * k} ${0.7 * k}` : 'none'}"/>` +
      `<circle cx="${a[0]}" cy="${a[1]}" r="${0.6 * k}" fill="${color}"/><circle cx="${c[0]}" cy="${c[1]}" r="${0.6 * k}" fill="${color}"/>` +
      `<g class="distance-label"><title>${ok ? '충족' : '미충족'} · 실제 ${m1(pair.distance)} m / 요구 ${m1(pair.required)} m · ${esc(sub)} (사용자 가정, 법정 판정 아님)</title>` +
      `<rect x="${mx - w / 2}" y="${my - 3.4 * k}" width="${w}" height="${8.4 * k}" rx="${k}" fill="${ok ? 'white' : '#fdecea'}" stroke="${color}" stroke-width="${(ok ? 0.2 : 0.35) * k}"/>` +
      `<text x="${mx}" y="${my}" fill="${color}" text-anchor="middle" font-size="${fs1}" font-weight="600">${esc(main)}</text>` +
      `<text x="${mx}" y="${my + 2.9 * k}" fill="${ok ? '#6f8a86' : color}" text-anchor="middle" font-size="${fs2}">${esc(sub)}</text></g>`;
  }

  function cadPairLabel(pair, k) {
    const ok = pair.pass, color = ok ? THEMES.cad.pass : THEMES.cad.fail;
    return `<g class="distance-label"><title>${ok ? '충족' : '미충족'} · 실제 ${m1(pair.distance)} m / 요구 ${m1(pair.required)} m · ${esc(pair.basis.text)} (사용자 가정, 법정 판정 아님)</title>` +
      dimension(pair.a, pair.b, color, k, (ok ? 0.22 : 0.4) * k) +
      alongText(pair.a, pair.b, `${ok ? '' : '✕ '}${mm(pair.distance)}`, 2.1 * k, color, -0.8 * k, 600) +
      alongText(pair.a, pair.b, basisNote(pair.basis), 1.5 * k, color, 2.0 * k) + '</g>';
  }

  function rayNote(from, to, title, distance, need, ok, k, color) {
    return dimension(from, to, color, k, 0.2 * k) +
      alongText(from, to, `${title} ${mm(distance)}`, 1.6 * k, color, -0.6 * k, 600) +
      alongText(from, to, `(기준 ${need})`, 1.4 * k, color, 1.7 * k);
  }

  function buildingPlan(bl, q, sel, k) {
    const color = sel ? '#78a5bd' : q.pass ? '#b4c3c6' : '#d9b3a9';
    const w = bl.width, d = bl.depth;
    return `<g class="building-shape" data-building="${esc(bl.id)}" transform="translate(${bl.x} ${bl.y}) rotate(${bl.rotation})">` +
      `<rect x="${-w / 2 - 1}" y="${-d / 2 - 1}" width="${w + 2}" height="${d + 2}" rx=".3" fill="none" stroke="${sel ? '#367a9e' : 'transparent'}" stroke-width=".5" stroke-dasharray="1 .7"/>` +
      `<rect x="${-w / 2 + 0.8}" y="${-d / 2 + 1.3}" width="${w}" height="${d}" fill="#143c4320"/>` +
      `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="${color}" stroke="${q.pass ? sel ? '#457c99' : '#7d999b' : '#bd6f60'}" stroke-width=".45"/>` +
      `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="url(#rooms)"/>` +
      `<rect x="-3" y="${-d / 2 - 2}" width="6" height="${d / 2 + 2}" fill="${sel ? '#5086a4' : '#819fa6'}" stroke="#fff" stroke-width=".25"/></g>` +
      // Labels stay upright below the rotated footprint's lowest point.
      `<g class="building-shape" data-building="${esc(bl.id)}" transform="translate(${bl.x} ${bl.y + halfHeight(bl)})">` +
      `<text x="0" y="${4.2 * k}" text-anchor="middle" font-size="${3.3 * k}" font-weight="700" fill="${sel ? '#285f7d' : '#617b7b'}">${esc(bl.name)}${bl.locked ? ' ▣' : ''}</text>` +
      `<text x="0" y="${7.5 * k}" text-anchor="middle" font-size="${2.3 * k}" fill="#92a4a0">${bl.floors}F · ${bl.floors * bl.unitsPerFloor}세대${bl.pilotiFull ? ' · 필로티' : ''}</text></g>`;
  }

  // Vertical half-extent of a rotated footprint.
  function halfHeight(bl) {
    const a = bl.rotation * Math.PI / 180;
    return Math.abs(bl.width / 2 * Math.sin(a)) + Math.abs(bl.depth / 2 * Math.cos(a));
  }

  function buildingCad(bl, q, sel, k) {
    const w = bl.width, d = bl.depth, edge = !q.pass ? THEMES.cad.fail : sel ? '#4fc3f7' : '#f3c5d8';
    return `<g class="building-shape" data-building="${esc(bl.id)}" transform="translate(${bl.x} ${bl.y}) rotate(${bl.rotation})">` +
      `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="#e7a3bf55" stroke="${edge}" stroke-width="${(sel ? 0.5 : 0.3) * k}"/>` +
      `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="url(#cadHatch)"/>` +
      `<rect x="-3" y="${-d / 2}" width="6" height="${d * 0.55}" fill="none" stroke="#f3c5d8" stroke-width="${0.2 * k}"/>` +
      (sel ? `<rect x="${-w / 2 - 1}" y="${-d / 2 - 1}" width="${w + 2}" height="${d + 2}" fill="none" stroke="#4fc3f7" stroke-width="${0.3 * k}" stroke-dasharray="${k} ${0.6 * k}"/>` : '') +
      `</g>`;
  }

  // Candidate area for the selected building's centre, from a sampled grid
  // (heat = { ok: Uint8Array, nx, ny, x0, y0, step }). Cells are merged into row
  // runs and the region edge is traced so it reads as one area, not dots.
  // Returns { fill, edge }: the fill sits under the buildings, the edge is drawn
  // over them so the region stays readable where a building covers it.
  function heatLayer(heat, cad, k) {
    if (!heat || !heat.ok) return { fill: '', edge: '' };
    const { ok, nx, ny, x0, y0, step } = heat, at = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && ok[j * nx + i] === 1;
    const fill = cad ? '#7ee08a' : '#3fae7a', edge = cad ? '#9cf0a6' : '#23875a';
    let rects = '', path = '';
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!at(i, j)) continue;
        let run = 1;
        while (at(i + run, j)) run++;
        rects += `<rect x="${x0 + (i - 0.5) * step}" y="${y0 + (j - 0.5) * step}" width="${run * step}" height="${step}"/>`;
        i += run - 1;
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!at(i, j)) continue;
        const l = x0 + (i - 0.5) * step, t = y0 + (j - 0.5) * step, r = l + step, b = t + step;
        if (!at(i, j - 1)) path += `M${l} ${t}H${r}`;
        if (!at(i, j + 1)) path += `M${l} ${b}H${r}`;
        if (!at(i - 1, j)) path += `M${l} ${t}V${b}`;
        if (!at(i + 1, j)) path += `M${r} ${t}V${b}`;
      }
    }
    return {
      fill: `<g class="candidate-area" fill="${fill}" fill-opacity="${cad ? 0.2 : 0.26}" shape-rendering="crispEdges">${rects}</g>`,
      edge: `<path class="candidate-edge" d="${path}" fill="none" stroke="${edge}" stroke-width="${0.4 * k}" stroke-dasharray="${1.2 * k} ${0.5 * k}" stroke-linecap="square" pointer-events="none"/>`
    };
  }

  // Crosshair at the selected building's centre: green when the current
  // position meets the screening rules, red when it does not.
  function centerMark(b, pass, k, cad) {
    const c = pass ? (cad ? '#9cf0a6' : '#23875a') : (cad ? THEMES.cad.fail : THEMES.plan.fail), r = 1.6 * k;
    return `<g class="center-mark" pointer-events="none"><circle cx="${b.x}" cy="${b.y}" r="${r}" fill="none" stroke="${c}" stroke-width="${0.35 * k}"/>` +
      `<path d="M${b.x - r * 1.8} ${b.y}H${b.x + r * 1.8}M${b.x} ${b.y - r * 1.8}V${b.y + r * 1.8}" stroke="${c}" stroke-width="${0.25 * k}"/></g>`;
  }

  // Rotation handle above the selected building's top face (local −y). Dragging
  // it rotates the building about its centre; the angle shows while rotating.
  function rotateHandle(bl, k, cad, rotating) {
    const reach = bl.depth / 2 + 7 * k, r = 1.7 * k;
    const color = cad ? '#4fc3f7' : '#2f6f99', fill = cad ? '#1f2428' : '#ffffff';
    let out = `<g class="rotate-handle" data-rotate="${esc(bl.id)}" transform="translate(${bl.x} ${bl.y}) rotate(${bl.rotation})" style="cursor:grab">` +
      `<line x1="0" y1="${-bl.depth / 2}" x2="0" y2="${-reach + r}" stroke="${color}" stroke-width="${0.25 * k}" stroke-dasharray="${0.6 * k} ${0.4 * k}"/>` +
      `<circle cx="0" cy="${-reach}" r="${r * 1.9}" fill="transparent"/>` +
      `<circle cx="0" cy="${-reach}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${0.35 * k}"/>` +
      `<path d="M${-r * 0.5} ${-reach - r * 0.15} A${r * 0.55} ${r * 0.55} 0 1 1 ${r * 0.1} ${-reach + r * 0.55}" fill="none" stroke="${color}" stroke-width="${0.25 * k}"/>` +
      `<path d="M${-r * 0.75} ${-reach - r * 0.45} L${-r * 0.5} ${-reach - r * 0.1} L${-r * 0.15} ${-reach - r * 0.35}" fill="none" stroke="${color}" stroke-width="${0.25 * k}"/>` +
      `<title>드래그해서 회전 · 기본 5° · Shift 15° · Alt 1° 단위</title></g>`;
    if (rotating) {
      const deg = ((bl.rotation % 360) + 360) % 360, text = `${Math.round(deg * 10) / 10}°`;
      const w = textWidth(text, 2.4 * k) + 2.4 * k, a = bl.rotation * Math.PI / 180;
      const lx = bl.x + Math.sin(a) * (reach + 4 * k), ly = bl.y - Math.cos(a) * (reach + 4 * k);
      out += `<g pointer-events="none"><rect x="${lx - w / 2}" y="${ly - 2.2 * k}" width="${w}" height="${3.4 * k}" rx="${0.6 * k}" fill="${color}"/>` +
        `<text x="${lx}" y="${ly + 0.4 * k}" text-anchor="middle" font-size="${2.4 * k}" font-weight="700" fill="#fff">${text}</text></g>`;
    }
    return out;
  }

  // Site boundary editing: draggable vertices (double-click deletes), a "+"
  // at each edge midpoint to insert a vertex, and edge lengths in metres.
  function siteHandles(site, k, cad) {
    const color = cad ? '#ff8a80' : '#2f6f99', fill = cad ? '#1f2428' : '#ffffff';
    let out = '';
    site.forEach((a, i) => {
      const b = site[(i + 1) % site.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      out += alongText(a, b, `${m1(len)} m`, 1.9 * k, color, -1.6 * k, 600) +
        `<g class="site-insert" data-insert="${i}" style="cursor:copy"><title>꼭짓점 추가</title>` +
        `<circle cx="${m[0]}" cy="${m[1]}" r="${2.2 * k}" fill="transparent"/>` +
        `<circle cx="${m[0]}" cy="${m[1]}" r="${1.1 * k}" fill="${fill}" stroke="${color}" stroke-width="${0.25 * k}" opacity=".9"/>` +
        `<path d="M${m[0] - 0.6 * k} ${m[1]}H${m[0] + 0.6 * k}M${m[0]} ${m[1] - 0.6 * k}V${m[1] + 0.6 * k}" stroke="${color}" stroke-width="${0.25 * k}"/></g>`;
    });
    site.forEach((p, i) => {
      out += `<g class="site-vertex" data-vertex="${i}" style="cursor:move"><title>P${i + 1} (${m1(p[0])}, ${m1(p[1])}) · 드래그 이동 · 더블클릭 삭제</title>` +
        `<circle cx="${p[0]}" cy="${p[1]}" r="${2.6 * k}" fill="transparent"/>` +
        `<rect x="${p[0] - 1.2 * k}" y="${p[1] - 1.2 * k}" width="${2.4 * k}" height="${2.4 * k}" fill="${fill}" stroke="${color}" stroke-width="${0.4 * k}"/>` +
        `<text x="${p[0] + 2 * k}" y="${p[1] - 2 * k}" font-size="${2.2 * k}" font-weight="700" fill="${color}" pointer-events="none">P${i + 1}</text></g>`;
    });
    return out;
  }

  // Full SVG markup for the map. opts: project, result, selected, viewBox,
  // heat (svg string), showDistances, mode ('plan' | 'cad').
  function draw(opts) {
    const { project, result: r, selected, viewBox, heat, showDistances } = opts;
    const cad = opts.mode === 'cad', T = cad ? THEMES.cad : THEMES.plan;
    // k keeps annotations a constant on-screen size: 1 k ≈ 5 px when the
    // caller passes metres per pixel, else a fraction of the view width.
    const k = opts.unitsPerPx > 0 ? opts.unitsPerPx * 5 : Math.max(0.35, viewBox[2] / 210);
    const site = project.site.polygon, rules = project.rules, area = heatLayer(heat, cad, k);
    let out = `<defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".18" fill="#d6e0d9"/></pattern>` +
      `<pattern id="rooms" width="5" height="4" patternUnits="userSpaceOnUse"><path d="M 0 0 H 5 V 4" fill="none" stroke="#fff" stroke-width=".22"/></pattern>` +
      `<pattern id="cadHatch" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.2" stroke="#f3c5d8" stroke-width=".18" opacity=".7"/></pattern>` +
      `<clipPath id="siteClip"><polygon points="${pts(site)}"/></clipPath></defs>` +
      `<rect x="-10000" y="-10000" width="20000" height="20000" fill="${T.bg}"/>` +
      (T.dot ? `<rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)"/>` : '') +
      `<polygon points="${pts(site)}" fill="${T.siteFill}" ${T.siteEdge ? `stroke="${T.siteEdge}" stroke-width=".4"` : ''}/>` +
      `<g clip-path="url(#siteClip)">${area.fill}</g>` +
      `<polygon points="${pts(site)}" fill="none" stroke="${T.site}" stroke-width="${(cad ? 0.6 : 0.5) * (cad ? k : 1)}" stroke-dasharray="${T.siteDash.split(' ').map(v => v * (cad ? k : 1)).join(' ')}"/>`;

    if (cad) {
      const inner = offsetPolygon(site, rules.setback);
      if (inner) {
        out += `<polygon points="${pts(inner)}" fill="none" stroke="${T.setback}" stroke-width="${0.25 * k}" stroke-dasharray="${1.4 * k} ${0.8 * k}"/>`;
        const a = inner[0], b = inner[1];
        out += alongText(a, b, `건축한계선 · 대지안의 공지 가정 ${rules.setback}m`, 1.5 * k, T.setback, -0.8 * k);
      }
      const a = site[0], b = site[1];
      out += alongText(a, b, '대지경계선', 1.6 * k, T.site, -1.2 * k);
    } else {
      if (!opts.siteEdit) site.forEach((p, i) => out += `<circle cx="${p[0]}" cy="${p[1]}" r=".7" fill="#fff" stroke="#6f9989" stroke-width=".4"/><text x="${p[0] + 1.6}" y="${p[1] - 1.6}" font-size="${2.2 * k}" fill="#8ca297">P${i + 1}</text>`);
    }

    const byId = new Map(r.buildings.map(q => [q.id, q]));
    for (const bl of project.buildings) {
      out += cad ? buildingCad(bl, byId.get(bl.id), bl.id === selected, k) : buildingPlan(bl, byId.get(bl.id), bl.id === selected, k);
    }
    const sel = project.buildings.find(bl => bl.id === selected);
    out += `<g clip-path="url(#siteClip)">${area.edge}</g>`;
    if (sel && heat && heat.ok) out += centerMark(sel, byId.get(sel.id).pass, k, cad);

    if (showDistances) {
      for (const pair of r.pairs) {
        if (!cad && pair.aId !== selected && pair.bId !== selected) continue;
        // The CAD sheet shows every facing pair; diagonal fallbacks only for the selection.
        if (cad && pair.basis.type === 'diagonal' && pair.aId !== selected && pair.bId !== selected) continue;
        out += cad ? cadPairLabel(pair, k) : planPairLabel(pair, k);
      }
    }

    if (cad) {
      for (const bl of project.buildings) {
        const q = byId.get(bl.id);
        if (rules.northEnabled && q.northFrom && q.northDistance > 0) {
          const need = q.height <= rules.northLowHeight ? `${rules.northLowSetback}m` : `${factorText(rules.northFactor)}, ${bl.floors}F=${mm(q.northRequired)}`;
          out += rayNote(q.northFrom, q.northTo, '정북', q.northDistance, need, q.northPass, k, q.northPass ? '#c9a7ff' : THEMES.cad.fail);
        }
        if (q.light && bl.id === selected) {
          out += rayNote(q.light.from, q.light.to, '채광', q.light.distance, `H/${rules.lightLimit.factor}=${mm(q.light.required)}`, q.light.pass, k, q.light.pass ? '#ffd27a' : THEMES.cad.fail);
        }
        out += hexTag(bl.x, bl.y + halfHeight(bl) + 6 * k, bl.name, `${bl.floors * bl.unitsPerFloor}세대`, k, '#d55fd5');
      }
    }

    if (opts.siteEdit) out += siteHandles(site, k, cad);
    else if (sel && !sel.locked) out += rotateHandle(sel, k, cad, !!opts.rotating);

    const nx = viewBox[0] + viewBox[2] - 12 * k, ny = viewBox[1] + 15 * k;
    out += `<g transform="translate(${nx} ${ny}) scale(${k})"><circle r="7" fill="${cad ? '#1f2428' : '#fff'}" stroke="${cad ? T.north : 'none'}" stroke-width=".3" opacity=".85"/><g transform="rotate(${rules.northAngle})"><path d="M0 -5 L-1.5 2 L0 1 L1.5 2Z" fill="${T.north}"/><text x="0" y="-7.6" text-anchor="middle" font-size="3" fill="${T.north}">N</text></g></g>`;
    const bar = [5, 10, 20, 50, 100, 200, 500, 1000].find(v => v >= 16 * k) || 1000, barColor = cad ? T.muted : '#7c9690';
    out += `<g transform="translate(${viewBox[0] + viewBox[2] - bar - 12 * k} ${viewBox[1] + viewBox[3] - 9 * k})"><path d="M0 ${-k} V${k} H${bar} V${-k} M${bar / 2} ${-k} V${k}" fill="none" stroke="${barColor}" stroke-width="${0.4 * k}"/><text x="${bar / 2}" y="${-2 * k}" text-anchor="middle" font-size="${2.1 * k}" fill="${barColor}">${bar} m</text></g>`;
    return out;
  }

  // Reference-style notes beside the CAD drawing: applied criteria, per-floor
  // height table and the height formula. Returns HTML.
  function overlay(project, result, presets) {
    const rules = project.rules, info = presets.describe(rules), p = info.preset;
    const rows = new Map();
    for (const bl of project.buildings) {
      const q = result.buildings.find(x => x.id === bl.id);
      const key = `${bl.floors}|${bl.floorHeight}|${bl.pilotiFull ? 1 : 0}`;
      if (!rows.has(key)) rows.set(key, { floors: bl.floors, floorHeight: bl.floorHeight, piloti: !!bl.pilotiFull, height: q.height, names: [] });
      rows.get(key).names.push(bl.name);
    }
    const table = [...rows.values()].sort((a, b) => a.floors - b.floors || a.floorHeight - b.floorHeight).map(row =>
      `<tr><td>${row.floors}층</td><td>${row.floorHeight}</td><td>${row.piloti ? '1층 전체' : '—'}</td><td>${mm(row.height)}</td><td>${mm(row.height / 2)}</td><td>${esc(row.names.join(', '))}</td></tr>`).join('');
    const link = p.url ? ` · <a href="${esc(p.url)}" target="_blank" rel="noopener">원문</a>` : '';
    return `<details class="cad-box" open><summary>■ 적용 기준 · ${esc(p.short || p.name)}</summary>` +
        `<p class="cad-meta">${esc(p.effective)}${link} · 확인 ${esc(info.checked)}</p>` +
        `<ol>${p.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` +
        (p.caution ? `<p class="cad-caution">${esc(p.caution)}</p>` : '') +
        `<p class="cad-caution">⚠ ${esc(presets.REVISION_NOTE)}</p>` +
        `<details class="cad-sub"><summary>미검토 항목 ${p.unreviewed.length}</summary><ul>${p.unreviewed.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` +
        `<p class="cad-meta">화면 판정은 입력 가정에 따른 기하 검토이며 법정 적합 판정이 아닙니다.</p></details>` +
      `<details class="cad-box" open><summary>■ 층별 높이 기준</summary><table><thead><tr><th>층수</th><th>층고</th><th>필로티</th><th>H</th><th>H/2</th><th>동</th></tr></thead><tbody>${table}</tbody></table></details>` +
      `<details class="cad-box" open><summary>■ 건축물 높이 산정 기준</summary><p>${esc(info.formula)}</p>${info.height ? `<p class="cad-meta">${esc(info.height.name)}</p>` : ''}</details>`;
  }

  return Object.freeze({ draw, overlay, offsetPolygon, basisNote, textWidth });
}));
