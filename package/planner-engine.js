/* PLANBY planner engine bundle: PlannerEngine, PlannerState, PlannerPresets, PlannerImport.
   Node: const { PlannerEngine } = require('./planner-engine.js'); Browser: <script src>. */
/* engine.js */
(function (module) {
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerEngine = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Planning proxies only: metres, square metres, percentages; x right, y down.
  // The optional "facing" profile classifies rectangle faces (long = window,
  // short = side wall) as a screening assumption, not a legal determination.
  // No legal applicability, terrain correction, sunlight,
  // balconies, floor-area exemptions, or section-specific heights are inferred.
  const EPS = 1e-8;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const magnitude = a => Math.hypot(a[0], a[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const samePoint = (a, b) => magnitude(sub(a, b)) <= EPS;
  const clamp = t => Math.max(0, Math.min(1, t));

  function number(value, label, minimum, integer) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${label} must be a finite number`);
    }
    if (minimum !== undefined && value < minimum) {
      throw new RangeError(`${label} is invalid; expected ${minimum === 0 ? 'nonnegative' : 'positive'} value`);
    }
    if (integer && !Number.isInteger(value)) throw new RangeError(`${label} must be an integer`);
    return value;
  }

  function point(value, label) {
    if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${label} must be [x, y]`);
    number(value[0], `${label}.x`);
    number(value[1], `${label}.y`);
  }

  function polygon(value, label) {
    if (!Array.isArray(value) || value.length < 3) throw new TypeError(`${label} polygon needs at least 3 points`);
    value.forEach((p, i) => point(p, `${label}[${i}]`));
    const result = samePoint(value[0], value[value.length - 1]) ? value.slice(0, -1) : value;
    if (result.length < 3) throw new TypeError(`${label} polygon needs at least 3 distinct points`);
    return result;
  }

  function areaOf(poly) {
    // Translate to a nearby origin to reduce cancellation at large map coordinates.
    let twiceArea = 0;
    for (let i = 1; i < poly.length - 1; i++) {
      twiceArea += cross(sub(poly[i], poly[0]), sub(poly[i + 1], poly[0]));
    }
    return Math.abs(twiceArea) / 2;
  }

  function polygonArea(points) {
    return areaOf(polygon(points, 'Input'));
  }

  // Local → world transform of a building (rotation about its centre x, y).
  function placement(building) {
    if (!building || typeof building !== 'object') throw new TypeError('Building is invalid');
    const x = number(building.x, 'Building x');
    const y = number(building.y, 'Building y');
    const angle = number(building.rotation, 'Building rotation') * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return ([px, py]) => [x + px * cos - py * sin, y + px * sin + py * cos];
  }

  // World outline: the imported shape outline (local metres around the centre)
  // when present, otherwise the width × depth rectangle.
  function footprint(building) {
    const place = placement(building);
    const width = number(building.width, 'Building width', EPS);
    const depth = number(building.depth, 'Building depth', EPS);
    if (building.shape && building.shape.outline) {
      return polygon(building.shape.outline, 'Building shape').map(place);
    }
    return [[-width / 2, -depth / 2], [width / 2, -depth / 2],
      [width / 2, depth / 2], [-width / 2, depth / 2]].map(place);
  }

  function pointOnSegment(p, a, b) {
    const ab = sub(b, a), ap = sub(p, a);
    const length = magnitude(ab);
    if (length <= EPS) return samePoint(p, a);
    return Math.abs(cross(ab, ap)) <= EPS * length &&
      dot(ap, ab) >= -EPS * length && dot(sub(p, b), ab) <= EPS * length;
  }

  function inside(p, poly) {
    let contained = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j], b = poly[i];
      if (pointOnSegment(p, a, b)) return true;
      if ((a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) {
        contained = !contained;
      }
    }
    return contained;
  }

  // Boundary points count as inside. Pairwise boundary touching is a collision.
  function insidePolygon(p, poly) {
    point(p, 'Point');
    return inside(p, polygon(poly, 'Input'));
  }

  function segmentIntersection(a, b, c, d) {
    const r = sub(b, a), s = sub(d, c), ca = sub(c, a);
    const rr = dot(r, r), ss = dot(s, s);
    if (rr <= EPS * EPS) return pointOnSegment(a, c, d) ? { point: a.slice(), t: 0 } : null;
    if (ss <= EPS * EPS) {
      return pointOnSegment(c, a, b) ? { point: c.slice(), t: clamp(dot(ca, r) / rr) } : null;
    }
    const denominator = cross(r, s);
    if (Math.abs(denominator) <= EPS * Math.sqrt(rr * ss)) {
      if (Math.abs(cross(ca, r)) > EPS * Math.sqrt(rr)) return null;
      const t0 = dot(ca, r) / rr, t1 = dot(sub(d, a), r) / rr;
      const start = Math.max(0, Math.min(t0, t1)), end = Math.min(1, Math.max(t0, t1));
      return start <= end + EPS ? { point: lerp(a, b, clamp(start)), t: clamp(start) } : null;
    }
    const t = cross(ca, s) / denominator, u = cross(ca, r) / denominator;
    if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
    return { point: lerp(a, b, clamp(t)), t: clamp(t) };
  }

  function boundaryIntersection(a, b) {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        const hit = segmentIntersection(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]);
        if (hit) return hit.point;
      }
    }
    return null;
  }

  function intersection(a, b) {
    return boundaryIntersection(a, b) || (inside(a[0], b) ? a[0].slice() : null) ||
      (inside(b[0], a) ? b[0].slice() : null);
  }

  function polygonsIntersect(a, b) {
    return intersection(polygon(a, 'First'), polygon(b, 'Second')) !== null;
  }

  function closestPoint(p, a, b) {
    const ab = sub(b, a), denominator = dot(ab, ab);
    return denominator <= EPS * EPS ? a.slice() : lerp(a, b, clamp(dot(sub(p, a), ab) / denominator));
  }

  function boundaryDistance(a, b) {
    let result = { distance: Infinity, a: null, b: null };
    function consider(pa, pb) {
      const distance = magnitude(sub(pa, pb));
      if (distance < result.distance) result = { distance, a: pa.slice(), b: pb.slice() };
    }
    for (let i = 0; i < a.length; i++) {
      const pa = a[i], qa = a[(i + 1) % a.length];
      for (let j = 0; j < b.length; j++) {
        const pb = b[j], qb = b[(j + 1) % b.length];
        const hit = segmentIntersection(pa, qa, pb, qb);
        if (hit) return { distance: 0, a: hit.point, b: hit.point.slice() };
        consider(pa, closestPoint(pa, pb, qb));
        consider(qa, closestPoint(qa, pb, qb));
        consider(closestPoint(pb, pa, qa), pb);
        consider(closestPoint(qb, pa, qa), qb);
      }
    }
    return result;
  }

  // Distance between filled polygons is zero for both crossing and containment.
  // Setback uses boundaryDistance separately, since the building is inside site.
  function distanceBetween(a, b) {
    const hit = intersection(a, b);
    return hit ? { distance: 0, a: hit.slice(), b: hit.slice() } : boundaryDistance(a, b);
  }

  function polygonDistance(a, b) {
    return distanceBetween(polygon(a, 'First'), polygon(b, 'Second'));
  }

  function assertSimple(poly) {
    if (areaOf(poly) <= EPS) throw new RangeError('Site polygon must have positive area');
    for (let i = 0; i < poly.length; i++) {
      const next = (i + 1) % poly.length;
      if (samePoint(poly[i], poly[next])) throw new RangeError('Site polygon has a zero-length edge');
      for (let j = i + 1; j < poly.length; j++) {
        if (j === next || (j + 1) % poly.length === i) continue;
        if (segmentIntersection(poly[i], poly[next], poly[j], poly[(j + 1) % poly.length])) {
          throw new RangeError('Site polygon must be simple, without self-intersection');
        }
      }
    }
  }

  function fullyInside(building, site) {
    if (!building.every(p => inside(p, site))) return false;
    // Split each edge at every site crossing, including a reflex vertex touch.
    // A midpoint in every resulting interval catches concave cut-outs even when
    // all building corners and the unsplit edge midpoint happen to be inside.
    for (let i = 0; i < building.length; i++) {
      const a = building[i], b = building[(i + 1) % building.length];
      const ab = sub(b, a), lengthSquared = dot(ab, ab), splits = [0, 1];
      for (let j = 0; j < site.length; j++) {
        const c = site[j], d = site[(j + 1) % site.length];
        const hit = segmentIntersection(a, b, c, d);
        if (hit) splits.push(hit.t);
        if (pointOnSegment(c, a, b)) splits.push(clamp(dot(sub(c, a), ab) / lengthSquared));
      }
      splits.sort((x, y) => x - y);
      for (let j = 0; j < splits.length - 1; j++) {
        if (splits[j + 1] - splits[j] > EPS && !inside(lerp(a, b, (splits[j] + splits[j + 1]) / 2), site)) {
          return false;
        }
      }
    }
    return true;
  }

  function rayClearance(origin, direction, site) {
    let nearest = Infinity;
    for (let i = 0; i < site.length; i++) {
      const a = site[i], b = site[(i + 1) % site.length];
      const edge = sub(b, a), offset = sub(a, origin), denominator = cross(direction, edge);
      if (Math.abs(denominator) <= EPS * magnitude(edge)) {
        if (Math.abs(cross(offset, direction)) <= EPS) {
          const t0 = dot(offset, direction), t1 = dot(sub(b, origin), direction);
          if (Math.max(t0, t1) >= -EPS) nearest = Math.min(nearest, Math.max(0, Math.min(t0, t1)));
        }
        continue;
      }
      const t = cross(offset, edge) / denominator, u = cross(offset, direction) / denominator;
      if (t >= -EPS && u >= -EPS && u <= 1 + EPS) nearest = Math.min(nearest, Math.max(0, t));
    }
    return Number.isFinite(nearest) ? nearest : 0;
  }

  // Optional rule extensions; absent fields reproduce the original uniform model.
  const FACING_DEFAULTS = Object.freeze({ lightFactor: 1, southLowTall: 0.8, southLowLow: 1, southLowMin: 0, sideToSide: 4 });

  function validateRules(rules) {
    if (!rules || typeof rules !== 'object') throw new TypeError('Rules are required');
    for (const key of ['setback', 'minDistance', 'distanceFactor', 'northFactor',
      'northLowHeight', 'northLowSetback', 'coverageLimit', 'farLimit']) number(rules[key], `Rule ${key}`, 0);
    number(rules.northAngle, 'Rule northAngle');
    if (typeof rules.northEnabled !== 'boolean') throw new TypeError('Rule northEnabled must be boolean');
    if (rules.height !== undefined) {
      if (!rules.height || typeof rules.height !== 'object') throw new TypeError('Rule height must be an object');
      for (const key of ['base', 'parapet', 'first']) {
        if (rules.height[key] !== undefined) number(rules.height[key], `Rule height.${key}`, 0);
      }
      if (rules.height.top !== undefined) {
        if (!Array.isArray(rules.height.top)) throw new TypeError('Rule height.top must be an array');
        rules.height.top.forEach((v, i) => number(v, `Rule height.top[${i}]`, 0));
      }
    }
    if (rules.profile !== undefined && rules.profile !== 'uniform' && rules.profile !== 'facing') {
      throw new RangeError('Rule profile must be uniform or facing');
    }
    if (rules.facing !== undefined) {
      if (!rules.facing || typeof rules.facing !== 'object') throw new TypeError('Rule facing must be an object');
      for (const key of Object.keys(FACING_DEFAULTS)) {
        if (rules.facing[key] !== undefined) number(rules.facing[key], `Rule facing.${key}`, 0);
      }
    }
    if (rules.lightLimit !== undefined) {
      if (!rules.lightLimit || typeof rules.lightLimit !== 'object') throw new TypeError('Rule lightLimit must be an object');
      if (typeof rules.lightLimit.enabled !== 'boolean') throw new TypeError('Rule lightLimit.enabled must be boolean');
      number(rules.lightLimit.factor, 'Rule lightLimit.factor', EPS);
    }
  }

  // H = base + first floor + typical floors × floorHeight + top floors + parapet.
  // first defaults to floorHeight and top to none, so the default is
  // base + floors × floorHeight + parapet (고양삼송: 0.6 + n × 2.8 + 0.25).
  // pilotiFull drops a fully open ground floor (청주월명 AG-109:
  // 3.5 + (n − 3) × 2.8 + 3.0 + 3.0 + 0.4, or the same without the 3.5 m floor).
  function buildingHeight(b, rules) {
    const h = rules.height || {};
    const top = (h.top || []).slice(0, Math.max(0, b.floors - 1));
    const first = h.first === undefined ? b.floorHeight : h.first;
    const typical = Math.max(0, b.floors - 1 - top.length);
    return (h.base || 0) + (b.pilotiFull ? 0 : first) + typical * b.floorHeight +
      top.reduce((sum, v) => sum + v, 0) + (h.parapet || 0);
  }

  // Rectangle faces in footprint order. Long edges are treated as window
  // (채광) faces and short edges as side walls (측벽); a square has only window faces.
  // An imported shape instead marks a face as a window face when one of its
  // window segments lies on that edge (overlap ≥ 0.2 m); others are side walls.
  function faces(b, poly) {
    if (b.shape && b.shape.outline) return shapeFaces(b, poly);
    const longest = Math.max(b.width, b.depth), center = [b.x, b.y];
    return poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length], length = magnitude(sub(q, p));
      const t = [(q[0] - p[0]) / length, (q[1] - p[1]) / length];
      let n = [t[1], -t[0]];
      if (dot(n, sub(lerp(p, q, 0.5), center)) < 0) n = [-n[0], -n[1]];
      return { p, q, t, n, length, kind: length >= longest - 1e-6 ? 'light' : 'side' };
    });
  }

  function shapeFaces(b, poly) {
    const place = placement(b), outward = areaSign(poly);
    const windows = (b.shape.windows || []).map(w => [place(w.a), place(w.b)]);
    return poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length], length = magnitude(sub(q, p));
      const t = [(q[0] - p[0]) / length, (q[1] - p[1]) / length];
      const n = outward > 0 ? [t[1], -t[0]] : [-t[1], t[0]];
      const lit = windows.some(([a, c]) => {
        if (Math.abs(dot(sub(a, p), n)) > 0.05 || Math.abs(dot(sub(c, p), n)) > 0.05) return false;
        const s0 = dot(sub(a, p), t), s1 = dot(sub(c, p), t);
        return Math.min(length, Math.max(s0, s1)) - Math.max(0, Math.min(s0, s1)) >= 0.2;
      });
      return { p, q, t, n, length, kind: lit ? 'light' : 'side' };
    });
  }

  function areaSign(poly) {
    let a = 0;
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; });
    return a >= 0 ? 1 : -1;
  }

  // Nearest point of poly inside the strip swept perpendicular from face f.
  // Distance is linear along each clipped edge, so interval ends suffice.
  function faceClearance(f, poly) {
    const tol = 1e-6;
    let best = null;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const s0 = dot(sub(a, f.p), f.t), s1 = dot(sub(b, f.p), f.t);
      const d0 = dot(sub(a, f.p), f.n), d1 = dot(sub(b, f.p), f.n);
      let lo = 0, hi = 1;
      for (const [v0, v1, min, max] of [[s0, s1, tol, f.length - tol], [d0, d1, EPS, Infinity]]) {
        const dv = v1 - v0;
        if (Math.abs(dv) <= EPS) { if (v0 < min || v0 > max) { lo = 1; hi = 0; } continue; }
        const u0 = (min - v0) / dv, u1 = (max - v0) / dv;
        lo = Math.max(lo, Math.min(u0, u1)); hi = Math.min(hi, Math.max(u0, u1));
      }
      if (lo > hi) continue;
      for (const u of [lo, hi]) {
        const s = lerp(a, b, u), d = dot(sub(s, f.p), f.n);
        if (!best || d < best.distance) best = { distance: d, a: [s[0] - f.n[0] * d, s[1] - f.n[1] * d], b: s };
      }
    }
    return best;
  }

  const label = g => g.building.name || String(g.building.id);
  const fmtFactor = v => `${Math.round(v * 100) / 100}H`;
  // One requirement term "factor × H of a building", kept for drawing annotations.
  const term = (g, factor) => ({ id: g.building.id, name: label(g), floors: g.building.floors,
    height: g.height, factor, value: factor * g.height });

  // Applies the minDistance floor and records it on the basis when it governs.
  function finish(raw, rules, basis) {
    const required = Math.max(rules.minDistance, raw);
    if (required > raw + EPS) {
      basis.min = rules.minDistance;
      basis.text += ` (최소 ${rules.minDistance} m)`;
    }
    return required;
  }

  function uniformPair(A, B, rules, closest, type) {
    const tall = A.height >= B.height ? A : B;
    const basis = { type, faces: null, factor: rules.distanceFactor, terms: [term(tall, rules.distanceFactor)], fixed: null,
      text: `${type === 'diagonal' ? '대각 · 단순 가정' : '단순'} ${fmtFactor(rules.distanceFactor)} ${label(tall)} ${tall.building.floors}F` };
    const required = finish(rules.distanceFactor * tall.height, rules, basis);
    return { ...closest, required, basis };
  }

  // Requirement for one building pair. In the facing profile each face that sees
  // the other building gets its own requirement; the pair is governed by the
  // smallest margin. Non-facing (diagonal) pairs fall back to the uniform rule.
  // South-low follows 시행령 제86조제3항제2호나목: the lower building lies in the
  // half-plane from 정동 clockwise to 정서 of the taller one, and a window face
  // (main opening) of the taller building faces it.
  function evaluatePair(A, B, rules, north) {
    const closest = distanceBetween(A.poly, B.poly);
    if (rules.profile !== 'facing') return uniformPair(A, B, rules, closest, 'uniform');
    const cfg = { ...FACING_DEFAULTS, ...(rules.facing || {}) };
    const hits = [];
    for (const [X, Y] of [[A, B], [B, A]]) {
      for (const f of X.faces) {
        const hit = faceClearance(f, Y.poly);
        if (!hit) continue;
        const g = Y.faces.reduce((m, h) => dot(h.n, f.n) < dot(m.n, f.n) ? h : m);
        hits.push({ X, Y, f, g, ...hit });
      }
    }
    if (!hits.length) return uniformPair(A, B, rules, closest, 'diagonal');
    const tall = A.height >= B.height ? A : B, low = tall === A ? B : A;
    const toLow = sub(low.center, tall.center);
    const southLow = low.height < tall.height - EPS && dot(toLow, north) < -EPS &&
      hits.some(h => h.X === tall && h.f.kind === 'light' && dot(h.f.n, toLow) > EPS);
    let governing = null;
    for (const h of hits) {
      let raw, basis;
      if (h.f.kind === 'side' && h.g.kind === 'side') {
        raw = cfg.sideToSide;
        basis = { type: 'side-side', factor: null, terms: [], fixed: cfg.sideToSide, text: `측벽↔측벽 ${cfg.sideToSide} m` };
      } else if (southLow) {
        const terms = [cfg.southLowTall > 0 && term(tall, cfg.southLowTall), term(low, cfg.southLowLow)].filter(Boolean);
        raw = Math.max(cfg.southLowMin, ...terms.map(t => t.value));
        const parts = [cfg.southLowMin > 0 && `${cfg.southLowMin} m`, ...terms.map(t => `${fmtFactor(t.factor)} ${t.name}`)];
        basis = { type: 'south-low', factor: cfg.southLowLow, terms, fixed: cfg.southLowMin > 0 ? cfg.southLowMin : null,
          text: `남측저층 ${parts.filter(Boolean).join(' / ')}` };
      } else {
        const owner = h.f.kind === 'light' ? h.X : h.Y;
        const type = h.f.kind === 'light' && h.g.kind === 'light' ? 'light-light' : 'light-side';
        raw = cfg.lightFactor * owner.height;
        basis = { type, factor: cfg.lightFactor, terms: [term(owner, cfg.lightFactor)], fixed: null,
          text: `${type === 'light-light' ? '채광↔채광' : '채광↔측벽'} ${fmtFactor(cfg.lightFactor)} ${label(owner)} ${owner.building.floors}F` };
      }
      basis.faces = h.X === A ? [h.f.kind, h.g.kind] : [h.g.kind, h.f.kind];
      const required = finish(raw, rules, basis);
      const margin = h.distance - required;
      if (!governing || margin < governing.margin) {
        const ends = h.X === A ? { a: h.a, b: h.b } : { a: h.b, b: h.a };
        governing = { margin, distance: h.distance, ...ends, required, basis };
      }
    }
    // Overlap or contact always fails, whatever face strips report.
    if (closest.distance <= EPS) return { ...closest, required: governing.required, basis: governing.basis };
    const { margin, ...result } = governing;
    return result;
  }

  // Upper bound on any requirement evaluatePair can return, for box culling.
  function maxRequirement(A, B, rules) {
    const h = Math.max(A.height, B.height);
    let max = Math.max(rules.minDistance, rules.distanceFactor * h);
    if (rules.profile === 'facing') {
      const cfg = { ...FACING_DEFAULTS, ...(rules.facing || {}) };
      max = Math.max(max, cfg.lightFactor * h, cfg.southLowTall * h, cfg.southLowLow * h, cfg.southLowMin, cfg.sideToSide);
    }
    return max;
  }

  function buildingGeometry(b, ids, rules) {
    const poly = footprint(b);
    if (!((typeof b.id === 'string' && b.id.length > 0) || (typeof b.id === 'number' && Number.isFinite(b.id)))) {
      throw new TypeError('Building id must be a nonempty string or finite number');
    }
    if (ids.has(b.id)) throw new RangeError('Building ids must be unique; duplicate id');
    ids.add(b.id);
    number(b.floors, 'Building floors', 1, true);
    number(b.floorHeight, 'Building floorHeight', EPS);
    number(b.baseElevation, 'Building baseElevation');
    number(b.unitsPerFloor, 'Building unitsPerFloor', 0, true);
    number(b.unitArea, 'Building unitArea', 0);
    number(b.coreArea, 'Building coreArea', 0);
    return { poly, height: buildingHeight(b, rules), area: areaOf(poly),
      building: b, center: [b.x, b.y], faces: faces(b, poly) };
  }

  function shortestRay(points, direction, outline) {
    let best = null;
    for (const p of points) {
      const distance = rayClearance(p, direction, outline);
      if (!best || distance < best.distance) {
        best = { distance, from: p.slice(), to: [p[0] + direction[0] * distance, p[1] + direction[1] * distance] };
      }
    }
    return best;
  }

  function boundaryCheck(id, geometry, outline, rules, north) {
    const { poly, height } = geometry;
    const contained = fullyInside(poly, outline);
    const setback = boundaryDistance(poly, outline).distance;
    const setbackPass = contained && setback + EPS >= rules.setback;
    // Four vertex rays are a screening proxy, not full-face/legal analysis.
    const north0 = shortestRay(poly, north, outline);
    const northDistance = north0.distance;
    const northRequired = height <= rules.northLowHeight ? rules.northLowSetback : height * rules.northFactor;
    const northPass = !rules.northEnabled || (contained && northDistance + EPS >= northRequired);
    // 시행령 제86조제3항제1호: height ≤ factor × horizontal distance from a window
    // face to the adjacent site boundary. Ends and midpoint of each window face are
    // sampled; roads (centre-line rule) and partial heights are not modelled.
    let light = null;
    const limit = rules.lightLimit;
    if (limit && limit.enabled) {
      for (const f of geometry.faces.filter(f => f.kind === 'light')) {
        const ray = shortestRay([f.p, lerp(f.p, f.q, 0.5), f.q], f.n, outline);
        if (!light || ray.distance < light.distance) light = ray;
      }
      if (light) {
        light.required = height / limit.factor;
        light.pass = contained && light.distance + EPS >= light.required;
      }
    }
    const lightPass = !light || light.pass;
    return { id, inside: contained, setback, setbackPass, northDistance, northFrom: north0.from, northTo: north0.to,
      northRequired, northPass, light, lightPass, pass: contained && setbackPass && northPass && lightPass, height };
  }

  function bounds(poly) {
    return [Math.min(...poly.map(p => p[0])), Math.min(...poly.map(p => p[1])),
      Math.max(...poly.map(p => p[0])), Math.max(...poly.map(p => p[1]))];
  }

  // Candidate-only heatmap query. O(N) in stationary building count; no pairs
  // between stationary buildings and no project-wide coverage/FAR calculation.
  // Its boolean equals the candidate's building.pass in evaluateSite, not the
  // whole site's pass. Inputs are read on every call, so edits cannot stale a cache.
  function canPlace(site, candidate, others, rules) {
    const outline = polygon(Array.isArray(site) ? site : site && site.polygon, 'Site');
    assertSimple(outline);
    validateRules(rules);
    if (!Array.isArray(others)) throw new TypeError('Other buildings must be an array');
    const ids = new Set();
    const current = buildingGeometry(candidate, ids, rules);
    const stationary = others.map(b => buildingGeometry(b, ids, rules));
    const angle = rules.northAngle * Math.PI / 180;
    const north = [Math.sin(angle), -Math.cos(angle)];
    if (!boundaryCheck(candidate.id, current, outline, rules, north).pass) return false;
    const box = bounds(current.poly);
    for (const other of stationary) {
      const otherBox = bounds(other.poly);
      const lowerBound = Math.hypot(Math.max(0, box[0] - otherBox[2], otherBox[0] - box[2]),
        Math.max(0, box[1] - otherBox[3], otherBox[1] - box[3]));
      // Bounding boxes are only used to prove separation; close boxes still get
      // the same evaluatePair used by evaluateSite.
      if (lowerBound > EPS && lowerBound + EPS >= maxRequirement(current, other, rules)) continue;
      const pair = evaluatePair(current, other, rules, north);
      if (pair.distance <= EPS || pair.distance + EPS < pair.required) return false;
    }
    return true;
  }

  function evaluateSite(site, buildings, rules) {
    const outline = polygon(Array.isArray(site) ? site : site && site.polygon, 'Site');
    assertSimple(outline);
    validateRules(rules);
    if (!Array.isArray(buildings)) throw new TypeError('Buildings must be an array');
    const ids = new Set();
    const angle = rules.northAngle * Math.PI / 180;
    const north = [Math.sin(angle), -Math.cos(angle)];
    let footprintArea = 0, grossFloorArea = 0, households = 0;
    const geometries = [], checks = [];
    for (const b of buildings) {
      const geometry = buildingGeometry(b, ids, rules);
      footprintArea += geometry.area;
      grossFloorArea += geometry.area * b.floors;
      households += b.floors * b.unitsPerFloor;
      geometries.push(geometry);
      checks.push(boundaryCheck(b.id, geometry, outline, rules, north));
    }
    const pairs = [];
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const result = evaluatePair(geometries[i], geometries[j], rules, north);
        const pass = result.distance > EPS && result.distance + EPS >= result.required;
        pairs.push({ aId: buildings[i].id, bId: buildings[j].id, ...result, pass });
        if (!pass) { checks[i].pass = false; checks[j].pass = false; }
      }
    }
    const area = areaOf(outline), coverage = footprintArea / area * 100, far = grossFloorArea / area * 100;
    return { area, footprintArea, grossFloorArea, coverage, far, households, pairs, buildings: checks,
      pass: checks.every(b => b.pass) && coverage <= rules.coverageLimit + EPS && far <= rules.farLimit + EPS };
  }

  return Object.freeze({ polygonArea, footprint, polygonsIntersect, polygonDistance, insidePolygon, evaluateSite, canPlace,
    buildingHeight: (b, rules) => { validateRules(rules); return buildingHeight(b, rules); } });
}));

}).call(globalThis, undefined);
/* state.js */
(function (module) {
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PlannerState=api;})(this,function(){
 'use strict'; const clone=o=>JSON.parse(JSON.stringify(o));
 function createProject(){return {schema:'apartment-planner/1',coordinateUnit:'m',revision:1,name:'공동주택 초기 검토 · 시나리오 A',site:{name:'예시 대지 · 실제 사업지 아님',polygon:[[15,20],[165,20],[190,55],[190,145],[155,165],[15,165]]},rules:{setback:3,minDistance:10,distanceFactor:0.5,northEnabled:false,northFactor:0.5,northLowHeight:10,northLowSetback:1.5,northAngle:0,coverageLimit:30,farLimit:250,parkingPerUnit:1.2,jurisdiction:'미지정',basis:'사용자 가정 · 법규 미확정'},buildings:[{id:'b101',name:'101동',x:53,y:62,width:43,depth:13,rotation:0,floors:20,floorHeight:2.9,baseElevation:0,unitsPerFloor:4,unitArea:74,coreArea:50,locked:false},{id:'b102',name:'102동',x:132,y:64,width:44,depth:14,rotation:0,floors:24,floorHeight:2.9,baseElevation:0,unitsPerFloor:4,unitArea:84,coreArea:52,locked:false},{id:'b103',name:'103동',x:70,y:119,width:43,depth:13,rotation:0,floors:18,floorHeight:2.9,baseElevation:0,unitsPerFloor:4,unitArea:74,coreArea:50,locked:false}],units:[],typologies:[]};}
 function num(v,min,max,label){if(!Number.isFinite(v)||v<min||v>max)throw Error(label+' 값의 범위를 확인하세요.');}
 function simple(poly){const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);for(let i=0;i<poly.length;i++)for(let j=i+1;j<poly.length;j++){if(j===i+1||i===0&&j===poly.length-1)continue;const a=poly[i],b=poly[(i+1)%poly.length],c=poly[j],d=poly[(j+1)%poly.length];if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))return false;}return true;}
 // Imported building shape (local metres around the building centre).
function checkShape(sh){const pt=(p,label)=>{if(!Array.isArray(p)||p.length!==2)throw Error(label+' 좌표 오류');num(p[0],-500,500,label);num(p[1],-500,500,label);};const list=(v,max,label)=>{if(!Array.isArray(v)||v.length>max)throw Error(label+' 개수 오류');return v;};if(!sh||typeof sh!=='object')throw Error('동 형상 오류');list(sh.outline,500,'동 외곽').forEach(p=>pt(p,'동 외곽'));if(sh.outline.length<3)throw Error('동 외곽은 꼭짓점 3개 이상이어야 합니다.');list(sh.windows||[],2000,'창').forEach(w=>{if(!w)throw Error('창 정보 오류');pt(w.a,'창');pt(w.b,'창');});list(sh.units||[],60,'세대 외곽').forEach(u=>list(u.outline||[],500,'세대 외곽').forEach(p=>pt(p,'세대 외곽')));if(sh.core){list(sh.core.parts||[],60,'코어 부품').forEach(c=>{if(!Array.isArray(c.rect)||c.rect.length!==4)throw Error('코어 부품 오류');c.rect.forEach(v=>num(v,-500,500,'코어 부품'));});}}
function validateProject(p){if(!p||p.schema!=='apartment-planner/1'||p.coordinateUnit!=='m')throw Error('이 편집기의 m 단위 프로젝트 JSON이 아닙니다.');num(p.revision,0,1e9,'개정');if(!Number.isInteger(p.revision))throw Error('개정 번호는 정수여야 합니다.');if(typeof p.name!=='string'||p.name.length>180)throw Error('프로젝트 이름을 확인하세요.');const poly=p.site?.polygon;if(!Array.isArray(poly)||poly.length<3||poly.length>100)throw Error('대지 경계는 3~100개 꼭짓점이 필요합니다.');poly.forEach(a=>{if(!Array.isArray(a)||a.length!==2)throw Error('대지 좌표 형식 오류');a.forEach(v=>num(v,-10000,10000,'대지 좌표'));});let area=0;poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length];area+=a[0]*b[1]-b[0]*a[1]});if(Math.abs(area)<2||!simple(poly))throw Error('대지 경계가 교차하거나 면적이 부족합니다.');if(!Array.isArray(p.buildings)||p.buildings.length>60)throw Error('최대 60개 동까지 지원합니다.');const ids=new Set();p.buildings.forEach(b=>{if(typeof b.id!=='string'||!b.id.trim()||b.id.length>100||ids.has(b.id))throw Error('동 ID가 중복되거나 누락되었습니다.');ids.add(b.id);if(typeof b.name!=='string'||b.name.length>60)throw Error('동 이름 오류');for(const k of ['x','y'])num(b[k],-10000,10000,k);for(const k of ['width','depth'])num(b[k],1,500,k);num(b.rotation,-3600,3600,'회전');num(b.floors,1,100,'층수');if(!Number.isInteger(b.floors))throw Error('층수는 정수여야 합니다.');num(b.floorHeight,2,8,'층고');num(b.baseElevation,-1000,10000,'표고');num(b.unitsPerFloor,1,30,'층당 세대');if(!Number.isInteger(b.unitsPerFloor))throw Error('층당 세대 수는 정수여야 합니다.');num(b.unitArea,10,400,'전용면적');num(b.coreArea,0,2000,'공용면적');if(typeof b.locked!=='boolean')throw Error('잠금 정보 오류');if(b.pilotiFull!==undefined&&typeof b.pilotiFull!=='boolean')throw Error('필로티 정보 오류');if(b.shape!==undefined)checkShape(b.shape);});const r=p.rules;if(!r)throw Error('검토 조건이 없습니다.');for(const k of ['setback','minDistance','northLowHeight','northLowSetback'])num(r[k],0,100,k);for(const k of ['distanceFactor','northFactor'])num(r[k],0,5,k);num(r.northAngle,-360,360,'정북');if(r.height!==undefined){if(!r.height||typeof r.height!=='object')throw Error('높이 산정식 설정 오류');for(const k of ['base','parapet','first'])if(r.height[k]!==undefined)num(r.height[k],0,100,'높이 산정식');if(r.height.top!==undefined){if(!Array.isArray(r.height.top)||r.height.top.length>5)throw Error('최상부 층고 목록 오류');r.height.top.forEach(v=>num(v,0,20,'최상부 층고'));}}if(r.profile!==undefined&&!['uniform','facing'].includes(r.profile))throw Error('인동거리 규칙 방식 오류');if(r.facing!==undefined){if(!r.facing||typeof r.facing!=='object')throw Error('면 구분 규칙 설정 오류');for(const k of ['lightFactor','southLowTall','southLowLow'])if(r.facing[k]!==undefined)num(r.facing[k],0,5,'면 구분 계수');if(r.facing.sideToSide!==undefined)num(r.facing.sideToSide,0,100,'측벽 간 거리');if(r.facing.southLowMin!==undefined)num(r.facing.southLowMin,0,100,'남측 저층 최소 거리');}if(r.lightLimit!==undefined){if(!r.lightLimit||typeof r.lightLimit!=='object'||typeof r.lightLimit.enabled!=='boolean')throw Error('채광방향 높이제한 설정 오류');num(r.lightLimit.factor,0.5,10,'채광방향 배수');}if(r.preset!==undefined&&(typeof r.preset!=='string'||r.preset.length>60))throw Error('기준 프리셋 오류');if(r.heightPreset!==undefined&&(typeof r.heightPreset!=='string'||r.heightPreset.length>60))throw Error('높이 산정 프리셋 오류');num(r.coverageLimit,1,100,'건폐율');num(r.farLimit,1,2000,'용적률');num(r.parkingPerUnit,0,10,'주차');if(typeof r.northEnabled!=='boolean')throw Error('정북 검토 설정 오류');if(!Array.isArray(p.units)||p.units.length>100||!Array.isArray(p.typologies)||p.typologies.length>200)throw Error('유형 데이터 오류');const unitIds=new Set();for(const u of p.units){if(!u||typeof u.id!=='string'||!u.id.trim()||unitIds.has(u.id)||![59,74,84].includes(u.type)||typeof u.name!=='string'||u.name.length>100)throw Error('세대 유형 정보 오류');unitIds.add(u.id);num(u.width,1,500,'세대 폭');num(u.depth,1,500,'세대 깊이');const roomIds=new Set();if(!u.reference||typeof u.reference!=='object')throw Error('세대 참고 정보 오류');if(!Array.isArray(u.rooms)||u.rooms.length>80)throw Error('실 데이터 오류');for(const room of u.rooms){if(typeof room.id!=='string'||!room.id.trim()||roomIds.has(room.id)||typeof room.locked!=='boolean')throw Error('실 ID 또는 잠금 정보 오류');roomIds.add(room.id);for(const k of ['x','y','width','depth'])num(room[k],k==='width'||k==='depth'?0.1:-500,500,'실 치수');if(typeof room.name!=='string'||room.name.length>80)throw Error('실 이름 오류');}}const typeIds=new Set();for(const t of p.typologies){if(!t||typeof t.id!=='string'||!t.id.trim()||typeIds.has(t.id)||typeof t.name!=='string'||t.name.length>100)throw Error('동 유형 정보 오류');typeIds.add(t.id);num(t.width,1,500,'동 유형 폭');num(t.depth,1,500,'동 유형 깊이');num(t.unitsPerFloor,1,30,'층당 세대');if(!Number.isInteger(t.unitsPerFloor))throw Error('층당 세대 수는 정수여야 합니다.');num(t.unitArea,10,400,'전용면적');num(t.coreArea,0,2000,'공용면적');if(!Array.isArray(t.sourceUnitIds)||t.sourceUnitIds.some(id=>typeof id!=='string'))throw Error('세대 연결 정보 오류');}if(p.layouts!==undefined){if(!Array.isArray(p.layouts)||p.layouts.length>30)throw Error('배치안 버전은 30개까지 저장할 수 있습니다.');const lids=new Set();for(const L of p.layouts){if(!L||typeof L.id!=='string'||!L.id||L.id.length>60||lids.has(L.id)||typeof L.name!=='string'||!L.name.trim()||L.name.length>80||typeof L.createdAt!=='string'||L.createdAt.length>40||(L.note!==undefined&&(typeof L.note!=='string'||L.note.length>500)))throw Error('배치안 버전 정보 오류');lids.add(L.id);validateProject({...p,buildings:L.buildings,layouts:undefined});}}return clone(p);}
 function applyPatch(project,patch){if(patch?.schema!=='apartment-planner-patch/1'||patch.baseRevision!==project.revision)throw Error('결과의 기준 버전이 현재 프로젝트와 다릅니다. 최신 요청으로 다시 만들어 주세요.');if(!Array.isArray(patch.changes)||patch.changes.length>60)throw Error('변경 목록 오류');const p=clone(project),seen=new Set();for(const c of patch.changes){if(seen.has(c.id))throw Error('변경 대상 중복');seen.add(c.id);const b=p.buildings.find(b=>b.id===c.id);if(!b)throw Error('존재하지 않는 동입니다.');if(b.locked)throw Error('잠긴 동은 변경할 수 없습니다.');for(const k of Object.keys(c)){if(!['id','x','y','rotation','floors'].includes(k))throw Error('지원하지 않는 변경 항목: '+k);if(k!=='id')b[k]=c[k];}}p.revision++;return validateProject(p);}
 return {createProject,validateProject,applyPatch,clone};
});

}).call(globalThis, undefined);
/* presets.js */
(function (module) {
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerPresets = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Rule presets transcribed from official text or reference drawings, checked
  // 2026-10-15. They configure the screening engine; they are not a legal
  // determination. Applicability (zoning, roads, exceptions) stays unreviewed.
  const CHECKED = '2026-10-15';
  const REVISION_NOTE = `법령·조례는 개정될 수 있습니다. 원문 확인일(${CHECKED}) 이후의 개정 여부를 적용 시점에 원문에서 다시 확인하세요.`;

  const NATIONAL_UNREVIEWED = [
    '제86조제3항제2호 다목: 건축물과 부대시설·복리시설이 마주보는 경우 부대·복리시설 높이의 1배',
    '라목: 채광창(0.5㎡ 이상)이 없는 벽면과 측벽이 마주보는 경우 8m (면별 창 유무 미입력)',
    '제2호 단서: 동지 9~15시 연속 2시간 이상 일조 확보 시 거리 갈음',
    '제3호: 단지 내 도로를 사이에 둔 경우 도로 중심선 기준 채광방향 적용',
    '정북·인동 높이의 지반 고저차 보정, 부분 높이, 용도지역 적용 여부'
  ];

  const RULE_PRESETS = Object.freeze([
    {
      id: 'custom',
      name: '사용자 정의',
      effective: '사용자 가정 · 법규 미확정',
      rules: null,
      lines: ['설정 창에서 입력한 계수와 거리를 그대로 사용합니다.'],
      unreviewed: NATIONAL_UNREVIEWED
    },
    {
      id: 'national-2026',
      name: '건축법 시행령 제86조 (조례 위임 하한)',
      short: '시행령 제86조',
      effective: '시행 2026-10-06 · 대통령령 제36746호',
      url: 'https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0086&lsiSeq=290833&urlMode=lsScJoRltInfoR',
      caution: '가목·나목은 "0.5배 이상의 범위에서 건축조례로 정하는 거리"입니다. 대상 지자체 조례로 상향될 수 있습니다.',
      rules: {
        profile: 'facing', distanceFactor: 0.5, minDistance: 4,
        northEnabled: true, northLowHeight: 10, northLowSetback: 1.5, northFactor: 0.5,
        facing: { lightFactor: 0.5, southLowTall: 0, southLowLow: 0.5, southLowMin: 10, sideToSide: 4 },
        lightLimit: { enabled: true, factor: 2 }
      },
      lines: [
        '제1항 정북: 높이 10m 이하 부분 1.5m 이상, 10m 초과 부분 해당 높이의 1/2 이상',
        '제3항제1호 채광방향: 각 부분 높이 ≤ 채광창 벽면→인접대지경계 수평거리 × 2 (근린상업·준주거 4배)',
        '제3항제2호 가목: 채광창 벽면 직각방향 0.5H 이상 범위에서 조례',
        '나목: 높은 동의 주된 개구부가 남측(정동→정서) 낮은 동을 향하면 10m 이상 + 낮은 동 0.5H 이상 범위에서 조례',
        '마목: 측벽과 측벽이 마주보는 경우 4m 이상'
      ],
      unreviewed: NATIONAL_UNREVIEWED
    },
    {
      id: 'cheongju-2026',
      name: '청주시 건축 조례 제35조',
      short: '청주시 조례 제35조',
      effective: '시행 2026-04-10 · 청주시조례 제1775호',
      url: 'https://www.law.go.kr/자치법규/청주시건축조례',
      caution: '정북 기준 높이는 2023-12-22 개정으로 10m입니다. AG-109(2023.08) 도면은 개정 전 9m 기준입니다.',
      rules: {
        profile: 'facing', distanceFactor: 1, minDistance: 4,
        northEnabled: true, northLowHeight: 10, northLowSetback: 1.5, northFactor: 0.5,
        facing: { lightFactor: 1, southLowTall: 0, southLowLow: 1, southLowMin: 10, sideToSide: 4 },
        lightLimit: { enabled: true, factor: 2 }
      },
      lines: [
        '① 정북: 높이 10m 이하 부분 1.5m 이상, 10m 초과 부분 해당 높이의 1/2 이상',
        '② 영 제86조제3항 단서의 거리 1.5m (다세대주택 채광방향 특례)',
        '③-1 채광창 벽면 직각방향 건축물 각 부분 높이의 1.0배 이상 (도시형 생활주택 0.5배)',
        '③-2 높은 동(축 정동→정서)의 주된 개구부가 낮은 동을 향하면 10m 이상 + 낮은 동 높이의 1.0배 이상',
        '시행령 제86조: 측벽↔측벽 4m, 채광방향 높이 ≤ 경계거리 × 2'
      ],
      unreviewed: NATIONAL_UNREVIEWED
    },
    {
      id: 'samsong-2016',
      name: '고양삼송 A00-008 도면 기준',
      short: '삼송 A00-008 (2016)',
      effective: '2016 참고도면 표기 · 현행 고양시 조례 미확인',
      caution: '참고도면의 당시 기준입니다. 현행 법령(정북 10m, 나목 10m 하한)과 다를 수 있습니다.',
      rules: {
        profile: 'facing', distanceFactor: 1, minDistance: 4,
        northEnabled: true, northLowHeight: 9, northLowSetback: 1.5, northFactor: 0.5,
        facing: { lightFactor: 1, southLowTall: 0.8, southLowLow: 1, southLowMin: 0, sideToSide: 4 },
        lightLimit: { enabled: true, factor: 2 }
      },
      lines: [
        '정북: 높이 9m 이하 1.5m, 9m 초과 높이의 1/2 이상',
        '채광창 벽면 직각방향 인접대지경계까지 수평거리의 2배 이하',
        '마주보는 동 1.0H, 남측이 낮은 경우 높은 동 0.8H 이상 + 낮은 동 1.0H 이상',
        '채광창 없는 벽면↔측벽 8m, 측벽↔측벽 4m, 대지안의 공지 아파트 3m'
      ],
      unreviewed: NATIONAL_UNREVIEWED
    }
  ]);

  const HEIGHT_PRESETS = Object.freeze([
    { id: 'simple', name: '층수 × 층고', height: {} },
    { id: 'ag109-penthouse', name: '청주월명 AG-109 · 펜트하우스', height: { first: 3.5, top: [3, 3], parapet: 0.4 } },
    { id: 'ag109', name: '청주월명 AG-109 · 펜트하우스 아님', height: { first: 3.5, top: [3], parapet: 0.4 } },
    { id: 'samsong', name: '고양삼송 A00-008', height: { base: 0.6, parapet: 0.25 } }
  ]);

  const clone = value => JSON.parse(JSON.stringify(value));
  const find = (list, id) => list.find(p => p.id === id) || null;
  const num = v => String(Math.round(v * 100) / 100);

  function applyRulePreset(rules, id) {
    const preset = find(RULE_PRESETS, id);
    if (!preset) throw new RangeError(`Unknown rule preset ${id}`);
    const next = { ...clone(rules), preset: id };
    if (preset.rules) Object.assign(next, clone(preset.rules));
    return next;
  }

  function applyHeightPreset(rules, id) {
    const preset = find(HEIGHT_PRESETS, id);
    if (!preset) throw new RangeError(`Unknown height preset ${id}`);
    return { ...clone(rules), height: clone(preset.height), heightPreset: id };
  }

  // Human-readable formula for a height configuration, e.g.
  // "H = 1층 3.5 + (층수 − 3) × 기준층고 + 3 + 3 + 파라펫 0.4".
  function heightFormula(height) {
    const h = height || {}, top = h.top || [];
    const parts = [];
    if (h.base) parts.push(`지반 ${num(h.base)}`);
    if (h.first !== undefined) parts.push(`1층 ${num(h.first)}`);
    const skip = (h.first !== undefined ? 1 : 0) + top.length;
    parts.push(skip ? `(층수 − ${skip}) × 기준층고` : '층수 × 층고');
    top.forEach(v => parts.push(num(v)));
    if (h.parapet) parts.push(`파라펫 ${num(h.parapet)}`);
    return `H = ${parts.join(' + ')}` + (h.first !== undefined ? ' · 1층 전체 필로티 동은 1층 제외' : '');
  }

  function describe(rules) {
    return {
      preset: find(RULE_PRESETS, rules.preset) || RULE_PRESETS[0],
      height: find(HEIGHT_PRESETS, rules.heightPreset),
      formula: heightFormula(rules.height),
      checked: CHECKED
    };
  }

  return Object.freeze({ RULE_PRESETS, HEIGHT_PRESETS, applyRulePreset, applyHeightPreset, heightFormula, describe, CHECKED, REVISION_NOTE });
}));

}).call(globalThis, undefined);
/* building-import.js */
(function (module) {
/* Import of Stage 2 building plans (schema apartment-planner-building/1) into
   site-plan buildings. Each candidate becomes a building whose `shape` holds
   the footprint outline, unit outlines, core parts and window segments in local
   metres centred on the outline's bounding box (x east, y south). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerImport = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 'apartment-planner-building/1';
  const r3 = v => Math.round(v * 1000) / 1000;
  const finite = v => typeof v === 'number' && Number.isFinite(v);

  function areaOf(poly) {
    let a = 0;
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; });
    return a / 2;
  }

  // Outline of the union of axis-aligned rectangles [x1, y1, x2, y2]. Cells of
  // the compressed grid are filled when covered; boundary edges are linked into
  // loops and the largest loop is the footprint (courtyards are not kept).
  function unionOutline(rects) {
    const xs = [...new Set(rects.flatMap(r => [r3(r[0]), r3(r[2])]))].sort((a, b) => a - b);
    const ys = [...new Set(rects.flatMap(r => [r3(r[1]), r3(r[3])]))].sort((a, b) => a - b);
    const nx = xs.length - 1, ny = ys.length - 1;
    const filled = (i, j) => {
      if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      return rects.some(r => cx > Math.min(r[0], r[2]) && cx < Math.max(r[0], r[2]) && cy > Math.min(r[1], r[3]) && cy < Math.max(r[1], r[3]));
    };
    const grid = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) grid[j * nx + i] = filled(i, j);
    const at = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && grid[j * nx + i];
    // Directed edges keep the filled side on the right (clockwise on screen).
    const edges = new Map(), key = (i, j) => `${i},${j}`;
    const add = (a, b) => { const k = key(...a); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!at(i, j)) continue;
        if (!at(i, j - 1)) add([i, j], [i + 1, j]);
        if (!at(i + 1, j)) add([i + 1, j], [i + 1, j + 1]);
        if (!at(i, j + 1)) add([i + 1, j + 1], [i, j + 1]);
        if (!at(i - 1, j)) add([i, j + 1], [i, j]);
      }
    }
    const loops = [];
    while (edges.size) {
      const startKey = edges.keys().next().value;
      const loop = [];
      let cur = startKey.split(',').map(Number);
      for (let guard = 0; guard < 100000; guard++) {
        const k = key(...cur), out = edges.get(k);
        if (!out || !out.length) break;
        const next = out.shift();
        if (!out.length) edges.delete(k);
        loop.push([xs[cur[0]], ys[cur[1]]]);
        cur = next;
        if (key(...cur) === startKey) break;
      }
      if (loop.length >= 3) loops.push(simplify(loop));
    }
    loops.sort((a, b) => Math.abs(areaOf(b)) - Math.abs(areaOf(a)));
    return { outline: loops[0] || [], loops: loops.length };
  }

  // Drops collinear vertices.
  function simplify(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
      if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 1e-9) out.push(b);
    }
    return out;
  }

  function rectsOf(candidate) {
    const g = candidate.geometry || {};
    const units = Array.isArray(g.units) ? g.units : [];
    const rects = units.flatMap(u => Array.isArray(u.rects) ? u.rects : []);
    // The core's overall rectangle closes the gaps between its parts.
    const c = g.core || {};
    const core = (Array.isArray(c.rects) ? c.rects : []).concat([c.x, c.y, c.width, c.depth].every(finite) ? [[c.x, c.y, c.x + c.width, c.y + c.depth]] : []);
    return rects.concat(core).filter(r => Array.isArray(r) && r.length === 4 && r.every(finite));
  }

  // One candidate → building fields (without id, name, position).
  function toBuilding(candidate, floors) {
    const rects = rectsOf(candidate);
    if (rects.length < 1) throw new Error(`${candidate.name || '후보'}: 세대·코어 형상이 없습니다.`);
    const { outline, loops } = unionOutline(rects);
    if (outline.length < 3) throw new Error(`${candidate.name || '후보'}: 동 외곽을 만들 수 없습니다.`);
    const minX = Math.min(...outline.map(p => p[0])), maxX = Math.max(...outline.map(p => p[0]));
    const minY = Math.min(...outline.map(p => p[1])), maxY = Math.max(...outline.map(p => p[1]));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, L = p => [r3(p[0] - cx), r3(p[1] - cy)];
    const g = candidate.geometry;
    const units = (g.units || []).map(u => ({
      id: String(u.id ?? ''), type: u.type, name: String(u.name ?? `${u.type}형`), facing: String(u.facing ?? ''),
      outline: (u.outline || []).map(L)
    }));
    const windows = (g.units || []).flatMap(u => (u.windows || []).map(w => ({
      a: L(w.a), b: L(w.b), dir: w.dir, room: String(w.room ?? ''), category: String(w.category ?? ''), unit: String(u.id ?? '')
    })));
    const core = g.core ? { parts: (g.core.parts || []).map(p => ({ kind: String(p.kind ?? ''), name: String(p.name ?? ''),
      rect: [r3(p.rect[0] - cx), r3(p.rect[1] - cy), r3(p.rect[2] - cx), r3(p.rect[3] - cy)] })) } : null;
    const footprintArea = Math.abs(areaOf(outline));
    return {
      width: r3(maxX - minX), depth: r3(maxY - minY), rotation: 0,
      floors: Math.max(1, Math.min(100, Math.round(floors || candidate.core?.floors || 15))),
      unitsPerFloor: Math.max(1, Math.round(candidate.unitsPerFloor || units.length || 1)),
      unitArea: Math.max(10, Math.min(400, candidate.unitArea || 59)),
      coreArea: Math.max(0, Math.min(2000, candidate.coreArea || 0)),
      shape: {
        outline: outline.map(L), units, core, windows,
        source: { schema: SCHEMA, id: String(candidate.id ?? ''), name: String(candidate.name ?? ''),
          unitMix: (candidate.unitMix || []).map(m => `${m.type}×${m.count}`).join(' + '),
          footprintArea: r3(footprintArea), loops }
      }
    };
  }

  // Parsed file → { floors, candidates: [{ name, building, warnings }] }.
  function parseBuildingFile(raw) {
    if (!raw || raw.schema !== SCHEMA) throw new Error('동평면 파일 형식(apartment-planner-building/1)이 아닙니다.');
    if (raw.coordinateUnit !== 'm') throw new Error('좌표 단위가 m가 아닙니다.');
    const list = Array.isArray(raw.candidates) ? raw.candidates : [];
    if (!list.length) throw new Error('후보 동평면이 없습니다.');
    if (list.length > 60) throw new Error('후보가 너무 많습니다 (최대 60).');
    const floors = raw.settings && finite(raw.settings.floors) ? raw.settings.floors : undefined;
    return {
      floors,
      note: String(raw.note ?? ''),
      candidates: list.map(c => {
        const building = toBuilding(c, c.core?.floors || floors);
        const warnings = [];
        if (building.shape.source.loops > 1) warnings.push('떨어진 부분이 있어 가장 큰 외곽만 사용했습니다.');
        if (!building.shape.windows.length) warnings.push('창 정보가 없어 모든 면을 측벽으로 봅니다.');
        return { name: String(c.name ?? c.id ?? '후보'), building, warnings };
      })
    };
  }

  return Object.freeze({ SCHEMA, unionOutline, parseBuildingFile, toBuilding });
}));

}).call(globalThis, undefined);
if (typeof module === 'object' && module.exports) module.exports = { PlannerEngine: globalThis.PlannerEngine, PlannerState: globalThis.PlannerState, PlannerPresets: globalThis.PlannerPresets, PlannerImport: globalThis.PlannerImport };
