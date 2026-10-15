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

  function footprint(building) {
    if (!building || typeof building !== 'object') throw new TypeError('Building is invalid');
    const x = number(building.x, 'Building x');
    const y = number(building.y, 'Building y');
    const width = number(building.width, 'Building width', EPS);
    const depth = number(building.depth, 'Building depth', EPS);
    const angle = number(building.rotation, 'Building rotation') * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return [[-width / 2, -depth / 2], [width / 2, -depth / 2],
      [width / 2, depth / 2], [-width / 2, depth / 2]].map(([px, py]) =>
      [x + px * cos - py * sin, y + px * sin + py * cos]);
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
  const FACING_DEFAULTS = Object.freeze({ lightFactor: 1, southLowTall: 0.8, southLowLow: 1, sideToSide: 4 });

  function validateRules(rules) {
    if (!rules || typeof rules !== 'object') throw new TypeError('Rules are required');
    for (const key of ['setback', 'minDistance', 'distanceFactor', 'northFactor',
      'northLowHeight', 'northLowSetback', 'coverageLimit', 'farLimit']) number(rules[key], `Rule ${key}`, 0);
    number(rules.northAngle, 'Rule northAngle');
    if (typeof rules.northEnabled !== 'boolean') throw new TypeError('Rule northEnabled must be boolean');
    if (rules.height !== undefined) {
      if (!rules.height || typeof rules.height !== 'object') throw new TypeError('Rule height must be an object');
      for (const key of ['base', 'parapet']) {
        if (rules.height[key] !== undefined) number(rules.height[key], `Rule height.${key}`, 0);
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
  }

  // H = base + floors × floorHeight + parapet (e.g. 고양삼송: 0.6 + n × 2.8 + 0.25).
  function buildingHeight(b, rules) {
    const h = rules.height || {};
    return (h.base || 0) + b.floors * b.floorHeight + (h.parapet || 0);
  }

  // Rectangle faces in footprint order. Long edges are treated as window
  // (채광) faces and short edges as side walls (측벽); a square has only window faces.
  function faces(b, poly) {
    const longest = Math.max(b.width, b.depth), center = [b.x, b.y];
    return poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length], length = magnitude(sub(q, p));
      const t = [(q[0] - p[0]) / length, (q[1] - p[1]) / length];
      let n = [t[1], -t[0]];
      if (dot(n, sub(lerp(p, q, 0.5), center)) < 0) n = [-n[0], -n[1]];
      return { p, t, n, length, kind: length >= longest - 1e-6 ? 'light' : 'side' };
    });
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

  function uniformPair(A, B, rules, closest, type) {
    const tall = A.height >= B.height ? A : B;
    const raw = rules.distanceFactor * tall.height;
    const required = Math.max(rules.minDistance, raw);
    const text = `${type === 'diagonal' ? '대각 · 단순 가정' : '단순'} ${fmtFactor(rules.distanceFactor)} ${label(tall)} ${tall.building.floors}F` +
      (required > raw + EPS ? ` (최소 ${rules.minDistance} m)` : '');
    return { ...closest, required, basis: { type, faces: null, factor: rules.distanceFactor, text } };
  }

  // Requirement for one building pair. In the facing profile each face that sees
  // the other building gets its own requirement; the pair is governed by the
  // smallest margin. Non-facing (diagonal) pairs fall back to the uniform rule.
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
    const southLow = low.height < tall.height - EPS &&
      dot(sub(low.center, tall.center), north) < 0 &&
      hits.some(h => h.X === low && h.f.kind === 'light' && dot(h.f.n, north) > Math.SQRT1_2);
    let governing = null;
    for (const h of hits) {
      let raw, type, text, factor = null;
      if (h.f.kind === 'side' && h.g.kind === 'side') {
        raw = cfg.sideToSide; type = 'side-side'; text = `측벽↔측벽 ${cfg.sideToSide} m`;
      } else if (southLow) {
        raw = Math.max(cfg.southLowTall * tall.height, cfg.southLowLow * low.height); type = 'south-low';
        text = `남측저층 ${fmtFactor(cfg.southLowTall)} ${label(tall)} / ${fmtFactor(cfg.southLowLow)} ${label(low)}`;
      } else {
        const owner = h.f.kind === 'light' ? h.X : h.Y;
        raw = cfg.lightFactor * owner.height; factor = cfg.lightFactor;
        type = h.f.kind === 'light' && h.g.kind === 'light' ? 'light-light' : 'light-side';
        text = `${type === 'light-light' ? '채광↔채광' : '채광↔측벽'} ${fmtFactor(cfg.lightFactor)} ${label(owner)} ${owner.building.floors}F`;
      }
      const required = Math.max(rules.minDistance, raw);
      if (required > raw + EPS) text += ` (최소 ${rules.minDistance} m)`;
      const margin = h.distance - required;
      if (!governing || margin < governing.margin) {
        const pairFaces = h.X === A ? [h.f.kind, h.g.kind] : [h.g.kind, h.f.kind];
        const ends = h.X === A ? { a: h.a, b: h.b } : { a: h.b, b: h.a };
        governing = { margin, distance: h.distance, ...ends, required,
          basis: { type, faces: pairFaces, factor, text } };
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
      max = Math.max(max, cfg.lightFactor * h, cfg.southLowTall * h, cfg.southLowLow * h, cfg.sideToSide);
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
    return { poly, height: buildingHeight(b, rules), area: b.width * b.depth,
      building: b, center: [b.x, b.y], faces: faces(b, poly) };
  }

  function boundaryCheck(id, geometry, outline, rules, north) {
    const { poly, height } = geometry;
    const contained = fullyInside(poly, outline);
    const setback = boundaryDistance(poly, outline).distance;
    const setbackPass = contained && setback + EPS >= rules.setback;
    // Four vertex rays are a screening proxy, not full-face/legal analysis.
    const northDistance = Math.min(...poly.map(p => rayClearance(p, north, outline)));
    const northRequired = height <= rules.northLowHeight ? rules.northLowSetback : height * rules.northFactor;
    const northPass = !rules.northEnabled || (contained && northDistance + EPS >= northRequired);
    return { id, inside: contained, setback, setbackPass, northDistance,
      northRequired, northPass, pass: contained && setbackPass && northPass, height };
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
