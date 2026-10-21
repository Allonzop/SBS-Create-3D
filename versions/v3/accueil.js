(function () {
  "use strict";
  var doux = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tactile = window.matchMedia("(pointer: coarse)").matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lisse = function (t) { return t * t * (3 - 2 * t); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var doucement = function (p, a, b) { return lisse(seg(p, a, b)); };

  /* v3 — une vraie tête d'impression : chariot sur le portique, radiateur
     à ailettes, bloc de chauffe, buse, et la pointe qui chauffe. */
  function teteImpression(c, bx, by, tx, ty, s, halo) {
    if (ty - by < 34 * s) by = ty - 34 * s;
    var h = ty - by;
    c.save(); c.lineJoin = "round"; c.shadowBlur = 0;
    c.fillStyle = "rgba(8,14,22,0.96)"; c.strokeStyle = "rgba(232,238,244,0.85)"; c.lineWidth = 1.2;
    c.beginPath(); c.rect(bx - 14 * s, by - 5 * s, 28 * s, 10 * s); c.fill(); c.stroke();           /* chariot */
    var y0 = by + 5 * s, y1 = y0 + (h - 5 * s) * 0.40;
    c.beginPath(); c.rect(tx - 8 * s, y0, 16 * s, y1 - y0); c.fill(); c.stroke();                   /* radiateur */
    c.strokeStyle = "rgba(232,238,244,0.42)"; c.lineWidth = 1; c.beginPath();
    for (var f = 1; f < 4; f++) { var yf = y0 + (y1 - y0) * f / 4; c.moveTo(tx - 8 * s, yf); c.lineTo(tx + 8 * s, yf); }
    c.stroke();
    var y2 = y1 + 2 * s, y3 = y2 + (h - 5 * s) * 0.24;
    c.fillStyle = "rgba(20,38,56,1)"; c.strokeStyle = "rgba(120,210,255,0.95)"; c.lineWidth = 1.2;
    c.beginPath(); c.rect(tx - 6.5 * s, y2, 13 * s, y3 - y2); c.fill(); c.stroke();                 /* bloc de chauffe */
    c.fillStyle = "#c9dbe9"; c.beginPath();                                                       /* buse */
    c.moveTo(tx - 4 * s, y3); c.lineTo(tx + 4 * s, y3); c.lineTo(tx + 1.1 * s, ty - 1.5); c.lineTo(tx - 1.1 * s, ty - 1.5); c.closePath(); c.fill();
    c.fillStyle = "#ffffff"; c.shadowColor = "rgba(0,216,252,0.95)"; c.shadowBlur = halo;           /* pointe chaude */
    c.beginPath(); c.arc(tx, ty, 2.2 * s, 0, 6.2832); c.fill();
    c.restore();
  }
  /* ————————————————————————————————————————————————
     LE RÉCIT.
     La pièce est le logo, reconstruit en primitives exactes (v9, 20/09).
     v2 : elle naît en maillage filaire, puis cinq étapes — modélisation,
     tranchage, impression, finitions laser, pièce finale qui s'allume.
     ———————————————————————————————————————————————— */
  var recit = document.getElementById("recit");
  var toile = document.getElementById("toile");
  var ctx = toile.getContext("2d");
  var motImg = document.getElementById("motReel");
  motImg.addEventListener("load", function () { relance(); });
  var frise = document.getElementById("frise");
  var crans = Array.prototype.slice.call(document.querySelectorAll("#frise li"));
  var rails = crans.map(function (li) { return li.querySelector(".frise__rail"); });
  var chapitres = Array.prototype.slice.call(document.querySelectorAll(".chapitre"));
  var consoleEl = document.getElementById("console"), consoleTxt = "";

  var leger = tactile, FLOU = tactile ? 0.30 : 1, L = 0, H = 0, dpr = 1;
  var visX = 0, visY = 0, cibX = 0, cibY = 0;

  var dernL = 0, dernH = 0;
  function taille(force) {
    var r = toile.getBoundingClientRect();
    var nl = Math.round(r.width), nh = Math.round(r.height);
    if (!force && dernL === nl && Math.abs(dernH - nh) < 140 && dernH) return;
    dernL = nl; dernH = nh;
    dpr = Math.min(tactile ? 1.25 : (leger ? 1.5 : 2), window.devicePixelRatio || 1);
    L = Math.max(1, nl); H = Math.max(1, nh);
    toile.width = Math.round(L * dpr); toile.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function flou(v) { ctx.shadowBlur = v * FLOU; }

  var GARDE = 0.07;                                  // l'ouverture tient pendant cette part du défilement
  var E0 = [0.00, 0.03, 0.19, 0.36, 0.55, 0.83];     // début de chaque chapitre, dans le récit
  var ETAPES = E0.map(function (v, i) { return i === 0 ? 0 : GARDE + v * (1 - GARDE); });

  /* Le récit se pose à chaque étape. Le défilement alterne des passages où la
     pièce se transforme et des paliers où elle reste immobile, le temps de lire.
     PALIERS : là où chaque étape est terminée (avant que son texte s'efface).
     Les poids sont relatifs : la hauteur de .recit dans commun.css fixe le total. */
  var PALIERS = [0.15, 0.33, 0.515, 0.80, 1];
  var COURSE = (function () {
    var pq = function (q) { return GARDE + q * (1 - GARDE); };
    var va = [1.2, 1.3, 1.5, 2.0, 1.5], tient = 0.55, segs = [[0.4, 0, GARDE]], avant = GARDE, tot = 0;
    for (var i = 0; i < PALIERS.length; i++) {
      var p = pq(PALIERS[i]);
      segs.push([va[i], avant, p]);
      segs.push([i === PALIERS.length - 1 ? 0.45 : tient, p, p]);
      avant = p;
    }
    segs.forEach(function (c) { tot += c[0]; });
    segs.forEach(function (c) { c[0] /= tot; });
    return segs;
  })();
  function deroule(s) {                              /* part du défilement → avancée du récit */
    for (var i = 0, a = 0; i < COURSE.length; i++) {
      var c = COURSE[i];
      if (s <= a + c[0] || i === COURSE.length - 1) {
        var t = clamp((s - a) / c[0], 0, 1);
        return c[1] + (c[2] - c[1]) * (0.5 * t + 0.5 * lisse(t));   /* ralentit en arrivant sur le palier */
      }
      a += c[0];
    }
    return 1;
  }

  var LOGO = {"corps":[[[0.12167,-0.72775],[0.76701,-0.35533],[0.7767,-0.3472],[0.78302,-0.33624],[0.78522,-0.32379],[0.78524,0.40035],[0.78293,0.41311],[0.77629,0.42426],[0.76616,0.43237],[0.17037,0.75491],[0.13991,0.74608],[0.10824,0.7445],[0.07706,0.75024],[0.04803,0.763],[0.02272,0.78209],[0.00247,0.80649],[-0.01162,0.83489],[-0.01881,0.86578],[-0.0187,0.89749],[-0.0113,0.92832],[0.00299,0.95662],[0.02341,0.98088],[0.04886,0.9998],[0.07797,1.01235],[0.1092,1.01788],[0.14085,1.01607],[0.17125,1.00704],[0.19875,0.99125],[0.22188,0.96957],[0.23941,0.94315],[0.25039,0.9134],[0.25424,0.88193],[0.83835,0.56571],[0.86638,0.54712],[0.89064,0.52383],[0.91037,0.49659],[0.92494,0.46627],[0.93386,0.43384],[0.93687,0.40034],[0.93685,-0.32379],[0.93399,-0.35645],[0.9255,-0.38812],[0.91165,-0.41783],[0.89284,-0.44468],[0.86965,-0.46786],[0.8428,-0.48666],[0.19746,-0.85908],[0.17531,-0.86757],[0.15162,-0.86881],[0.12871,-0.86267],[0.10882,-0.84975],[0.0939,-0.83131],[0.0854,-0.80916],[0.08416,-0.78547],[0.09031,-0.76256],[0.10323,-0.74267]],[[-0.12946,0.75274],[-0.7748,0.38032],[-0.78449,0.37219],[-0.79081,0.36124],[-0.79301,0.34878],[-0.79303,-0.37535],[-0.79072,-0.38812],[-0.78408,-0.39926],[-0.77395,-0.40737],[-0.17816,-0.72991],[-0.1477,-0.72109],[-0.11604,-0.71951],[-0.08485,-0.72525],[-0.05583,-0.738],[-0.03051,-0.7571],[-0.01026,-0.7815],[0.00383,-0.8099],[0.01101,-0.84078],[0.0109,-0.87249],[0.00351,-0.90332],[-0.01079,-0.93163],[-0.0312,-0.95589],[-0.05665,-0.9748],[-0.08577,-0.98736],[-0.11699,-0.99288],[-0.14865,-0.99108],[-0.17904,-0.98204],[-0.20654,-0.96626],[-0.22967,-0.94457],[-0.2472,-0.91815],[-0.25818,-0.88841],[-0.26203,-0.85693],[-0.84614,-0.54072],[-0.87417,-0.52212],[-0.89844,-0.49883],[-0.91817,-0.47159],[-0.93273,-0.44128],[-0.94166,-0.40885],[-0.94466,-0.37535],[-0.94464,0.34879],[-0.94178,0.38145],[-0.9333,0.41311],[-0.91944,0.44282],[-0.90063,0.46967],[-0.87745,0.49285],[-0.85059,0.51165],[-0.20525,0.88407],[-0.1831,0.89257],[-0.15941,0.89381],[-0.1365,0.88766],[-0.11661,0.87474],[-0.10169,0.8563],[-0.09319,0.83416],[-0.09195,0.81047],[-0.0981,0.78756],[-0.11102,0.76767]]],"trous":[[[0.20913,0.88116],[0.20541,0.90703],[0.19455,0.93081],[0.17743,0.95057],[0.15544,0.96471],[0.13035,0.97207],[0.10421,0.97207],[0.07913,0.96471],[0.05714,0.95057],[0.04002,0.93081],[0.02916,0.90703],[0.02544,0.88116],[0.02916,0.85528],[0.04002,0.8315],[0.05714,0.81174],[0.07913,0.79761],[0.10421,0.79024],[0.13035,0.79024],[0.15544,0.79761],[0.17743,0.81174],[0.19455,0.8315],[0.20541,0.85528]],[[-0.03323,-0.85616],[-0.03695,-0.83029],[-0.04781,-0.80651],[-0.06493,-0.78675],[-0.08692,-0.77262],[-0.112,-0.76525],[-0.13815,-0.76525],[-0.16323,-0.77262],[-0.18522,-0.78675],[-0.20234,-0.80651],[-0.2132,-0.83029],[-0.21692,-0.85616],[-0.2132,-0.88204],[-0.20234,-0.90582],[-0.18522,-0.92558],[-0.16323,-0.93971],[-0.13815,-0.94708],[-0.112,-0.94708],[-0.08692,-0.93971],[-0.06493,-0.92558],[-0.04781,-0.90582],[-0.03695,-0.88204]]],"barres":[[[-0.17877,0.52152],[0.41956,0.35372],[0.44026,0.34421],[0.45702,0.32877],[0.46818,0.3089],[0.47266,0.28656],[0.47001,0.26393],[0.4605,0.24322],[0.44506,0.22647],[0.4252,0.21531],[0.40286,0.21083],[0.38023,0.21347],[-0.2181,0.38127],[-0.23881,0.39078],[-0.25556,0.40623],[-0.26673,0.42609],[-0.2712,0.44843],[-0.26856,0.47106],[-0.25905,0.49177],[-0.24361,0.50852],[-0.22374,0.51968],[-0.2014,0.52416]],[[-0.59483,0.38099],[0.45792,0.08575],[0.47863,0.07624],[0.49538,0.0608],[0.50655,0.04093],[0.51102,0.01859],[0.50838,-0.00404],[0.49887,-0.02475],[0.48343,-0.0415],[0.46356,-0.05266],[0.44122,-0.05714],[0.41859,-0.0545],[-0.63416,0.24075],[-0.65487,0.25026],[-0.67162,0.2657],[-0.68278,0.28556],[-0.68726,0.3079],[-0.68462,0.33053],[-0.67511,0.35124],[-0.65966,0.36799],[-0.6398,0.37915],[-0.61746,0.38363]],[[-0.40593,0.09632],[0.64683,-0.19892],[0.66753,-0.20843],[0.68429,-0.22387],[0.69545,-0.24373],[0.69993,-0.26608],[0.69728,-0.28871],[0.68777,-0.30941],[0.67233,-0.32617],[0.65247,-0.33733],[0.63013,-0.34181],[0.6075,-0.33916],[-0.44526,-0.04392],[-0.46596,-0.03441],[-0.48272,-0.01897],[-0.49388,0.00089],[-0.49836,0.02323],[-0.49571,0.04587],[-0.4862,0.06657],[-0.47076,0.08333],[-0.4509,0.09449],[-0.42856,0.09897]],[[-0.34832,-0.14258],[0.25001,-0.31038],[0.27071,-0.31989],[0.28747,-0.33533],[0.29863,-0.3552],[0.30311,-0.37754],[0.30046,-0.40017],[0.29095,-0.42087],[0.27551,-0.43763],[0.25565,-0.44879],[0.23331,-0.45327],[0.21068,-0.45062],[-0.38765,-0.28282],[-0.40836,-0.27331],[-0.42511,-0.25787],[-0.43627,-0.23801],[-0.44075,-0.21567],[-0.43811,-0.19304],[-0.4286,-0.17233],[-0.41316,-0.15558],[-0.39329,-0.14441],[-0.37095,-0.13994]]]};
  var HAUT = 0.30;
  var CAM = { ax: 0.55, ay: -0.32, cx: 0, cy: 0, ech: 100, dist: 5.6 };

  function proj(x, y, z) {
    var c1 = Math.cos(CAM.ay), s1 = Math.sin(CAM.ay);
    var X = x * c1 - z * s1, Z = x * s1 + z * c1;
    var c2 = Math.cos(CAM.ax), s2 = Math.sin(CAM.ax);
    var Y = y * c2 - Z * s2, Z2 = y * s2 + Z * c2;
    var f = CAM.dist / (CAM.dist + Z2);
    return [CAM.cx + X * f * CAM.ech, CAM.cy + Y * f * CAM.ech, Z2];
  }
  function pp(pt, y) { return proj(pt[0], y, -pt[1]); }

  var PLEIN = LOGO.corps.concat(LOGO.trous);
  var BOITE = (function () {
    var x0 = 9, x1 = -9, z0 = 9, z1 = -9;
    for (var g = 0; g < LOGO.corps.length; g++) for (var i = 0; i < LOGO.corps[g].length; i++) {
      var p = LOGO.corps[g][i];
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1];
    }
    return { x0: x0, x1: x1, z0: z0, z1: z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  })();
  var tetePlan = null;
  var ANG_BARRE = -0.27344;
  var BARRES = LOGO.barres.map(function (poly) {
    var d = [Math.cos(ANG_BARRE), Math.sin(ANG_BARRE)], n = [-d[1], d[0]];
    var mx = 0, mz = 0, t0 = 9, t1 = -9;
    for (var i = 0; i < poly.length; i++) { mx += poly[i][0]; mz += poly[i][1]; }
    mx /= poly.length; mz /= poly.length;
    for (var j = 0; j < poly.length; j++) {
      var t = (poly[j][0] - mx) * d[0] + (poly[j][1] - mz) * d[1];
      if (t < t0) t0 = t; if (t > t1) t1 = t;
    }
    return { m: [mx, mz], d: d, n: n, t0: t0, t1: t1 };
  });

  function cheminGroupes(gs, y) {
    ctx.beginPath();
    for (var g = 0; g < gs.length; g++) {
      var poly = gs[g];
      for (var i = 0; i < poly.length; i++) {
        var q2 = pp(poly[i], y);
        if (i === 0) ctx.moveTo(q2[0], q2[1]); else ctx.lineTo(q2[0], q2[1]);
      }
      ctx.closePath();
    }
  }
  var LONG = (function () {
    var tot = 0, parts = [];
    for (var g = 0; g < LOGO.corps.length; g++) {
      var poly = LOGO.corps[g], l = 0, segs = [];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length];
        var d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push(d); l += d;
      }
      parts.push({ poly: poly, segs: segs, len: l }); tot += l;
    }
    return { parts: parts, tot: tot };
  })();

  function traceFil(y, t) {
    var reste = t * LONG.tot, tete = null;
    ctx.beginPath();
    for (var g = 0; g < LONG.parts.length; g++) {
      var P = LONG.parts[g];
      if (reste <= 0) break;
      var poly = P.poly, pris = Math.min(reste, P.len), parcouru = 0;
      var q0 = pp(poly[0], y);
      ctx.moveTo(q0[0], q0[1]);
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length], d = P.segs[i];
        if (parcouru + d <= pris) {
          var qb = pp(b, y); ctx.lineTo(qb[0], qb[1]); parcouru += d;
          tete = qb; tetePlan = b;
        } else {
          var f2 = (pris - parcouru) / d;
          var m = [a[0] + (b[0] - a[0]) * f2, a[1] + (b[1] - a[1]) * f2];
          var qm = pp(m, y); ctx.lineTo(qm[0], qm[1]); tete = qm; tetePlan = m;
          parcouru = pris; break;
        }
      }
      reste -= P.len;
    }
    return tete;
  }

  /* ——— LE MAILLAGE.
     Des génératrices réparties à pas constant le long du contour (pas aux
     sommets : les côtés droits n'en ont que deux), reliées en diagonale :
     c'est la face latérale triangulée, comme dans un fichier STL. ——— */
  var MAILLE = (function () {
    var out = [], pas = LONG.tot / (tactile ? 64 : 104), base = 0;
    for (var g = 0; g < LONG.parts.length; g++) {
      var P = LONG.parts[g], poly = P.poly, groupe = [], acc = 0, cible = 0;
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length], d = P.segs[i];
        while (cible <= acc + d && cible < P.len) {
          var f = d ? (cible - acc) / d : 0;
          groupe.push({ p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], f: (base + cible) / LONG.tot });
          cible += pas;
        }
        acc += d;
      }
      out.push(groupe); base += P.len;
    }
    return out;
  })();

  function filaire(alpha, t, temps) {
    if (alpha <= 0.004 || t <= 0) return;
    var y0 = 0, y1 = -HAUT;
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineJoin = "round"; flou(0);
    /* génératrices et diagonales */
    ctx.strokeStyle = "rgba(92,196,255,0.30)"; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (var g = 0; g < MAILLE.length; g++) {
      var M = MAILLE[g], prev = null;
      for (var j = 0; j < M.length; j++) {
        if (M[j].f > t) break;
        var a = pp(M[j].p, y0), b = pp(M[j].p, y1);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        if (prev) { var pa = pp(prev, y0); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(b[0], b[1]); }
        prev = M[j].p;
        if (t >= 1 && j === M.length - 1) { var a0 = pp(M[0].p, y1); ctx.moveTo(a[0], a[1]); ctx.lineTo(a0[0], a0[1]); }
      }
    }
    ctx.stroke();
    /* les alésages et les barres, une fois le contour bouclé */
    var fin = seg(t, 0.85, 1);
    if (fin > 0) {
      ctx.globalAlpha = alpha * fin;
      ctx.strokeStyle = "rgba(92,196,255,0.55)"; ctx.lineWidth = 0.9;
      cheminGroupes(LOGO.trous, y0); ctx.stroke();
      cheminGroupes(LOGO.trous, y1); ctx.stroke();
      ctx.strokeStyle = "rgba(92,196,255,0.40)";
      cheminGroupes(LOGO.barres, y1); ctx.stroke();
      ctx.beginPath();
      for (var h = 0; h < LOGO.trous.length; h++) {
        var tr = LOGO.trous[h];
        for (var k = 0; k < tr.length; k += 3) { var u = pp(tr[k], y0), v = pp(tr[k], y1); ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); }
      }
      ctx.strokeStyle = "rgba(92,196,255,0.22)"; ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    /* les arêtes, qui portent la lumière */
    ctx.strokeStyle = "rgba(120,210,255,0.95)"; ctx.lineWidth = 1.2;
    ctx.shadowColor = "rgba(48,168,240,0.8)"; flou(8);
    traceFil(y0, t); ctx.stroke();
    var tt = traceFil(y1, t); ctx.stroke();
    /* les nœuds du maillage, sur l'arête du haut */
    ctx.fillStyle = "rgba(200,236,255,0.85)"; flou(0);
    for (var g2 = 0; g2 < MAILLE.length; g2++) {
      for (var j2 = 0; j2 < MAILLE[g2].length; j2 += 4) {
        if (MAILLE[g2][j2].f > t) break;
        var nq = pp(MAILLE[g2][j2].p, y1);
        ctx.fillRect(nq[0] - 1, nq[1] - 1, 2, 2);
      }
    }
    if (t < 0.999 && tt) {
      ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(0,216,252,0.95)"; flou(16);
      ctx.beginPath(); ctx.arc(tt[0], tt[1], 2.6, 0, 6.2832); ctx.fill(); flou(0);
    }
    ctx.restore();
  }

  /* ——— LES COTES ——— */
  function etiquette(x, y, texte, alpha) {
    ctx.font = "11px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(texte).width + 10;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(2,4,7,0.9)"; ctx.fillRect(x - w / 2, y - 8, w, 16);
    ctx.fillStyle = "#c9dbe9"; ctx.fillText(texte, x, y);
    ctx.globalAlpha = 1;
  }
  function cote(a, b, y, ecart, texte, alpha) {
    var dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    var nx = -dz / l * ecart, nz = dx / l * ecart;
    var A = [a[0] + nx, a[1] + nz], B = [b[0] + nx, b[1] + nz];
    var pA = pp(A, y), pB = pp(B, y), qa = pp(a, y), qb = pp(b, y);
    ctx.globalAlpha = alpha; ctx.strokeStyle = "rgba(157,180,200,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(qa[0], qa[1]); ctx.lineTo(pA[0] + (pA[0] - qa[0]) * 0.12, pA[1] + (pA[1] - qa[1]) * 0.12);
    ctx.moveTo(qb[0], qb[1]); ctx.lineTo(pB[0] + (pB[0] - qb[0]) * 0.12, pB[1] + (pB[1] - qb[1]) * 0.12);
    ctx.moveTo(pA[0], pA[1]); ctx.lineTo(pB[0], pB[1]);
    var ux = (pB[0] - pA[0]), uy = (pB[1] - pA[1]), ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    var tx = (ux - uy) * 4, ty = (ux + uy) * 4;
    ctx.moveTo(pA[0] - tx, pA[1] - ty); ctx.lineTo(pA[0] + tx, pA[1] + ty);
    ctx.moveTo(pB[0] - tx, pB[1] - ty); ctx.lineTo(pB[0] + tx, pB[1] + ty);
    ctx.stroke();
    etiquette((pA[0] + pB[0]) / 2, (pA[1] + pB[1]) / 2, texte, alpha);
  }
  function coteAngle(sommet, a0, a1, r, y, texte, alpha, rayons) {
    ctx.globalAlpha = alpha; ctx.strokeStyle = "rgba(157,180,200,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath();
    if (rayons) {
      var o = pp(sommet, y), r0 = pp([sommet[0] + Math.cos(a0) * (r + 0.08), sommet[1] + Math.sin(a0) * (r + 0.08)], y);
      var r1 = pp([sommet[0] + Math.cos(a1) * (r + 0.08), sommet[1] + Math.sin(a1) * (r + 0.08)], y);
      ctx.moveTo(o[0], o[1]); ctx.lineTo(r0[0], r0[1]); ctx.moveTo(o[0], o[1]); ctx.lineTo(r1[0], r1[1]);
    }
    for (var k = 0; k <= 12; k++) {
      var an = a0 + (a1 - a0) * k / 12;
      var pt = pp([sommet[0] + Math.cos(an) * r, sommet[1] + Math.sin(an) * r], y);
      if (k === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
    }
    ctx.stroke();
    var am = (a0 + a1) / 2, pm = pp([sommet[0] + Math.cos(am) * (r + 0.13), sommet[1] + Math.sin(am) * (r + 0.13)], y);
    etiquette(pm[0], pm[1], texte, alpha);
  }
  function repere(a, b, y, texte, dxTexte, alpha) {
    var pa = pp(a, y), pb = pp(b, y);
    ctx.globalAlpha = alpha; ctx.strokeStyle = "rgba(157,180,200,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    etiquette(pb[0] + dxTexte, pb[1], texte, alpha);
  }
  function cotes(alpha, y, large) {
    var B = BOITE;
    cote([B.x0, B.z1], [B.x1, B.z1], y, 0.22, "L", alpha);
    coteAngle([0.861, 0.467], 1.5708, 2.646, 0.26, y, "60°", alpha, true);
    repere([0.123, 0.868], [0.62, 1.12], y, "Ø 0,15 L", 36, alpha);
    if (!large) { ctx.globalAlpha = 1; return; }
    cote([B.x1, B.z0], [B.x1, B.z1], y, -0.22, "1,07 L", alpha);
    cote([0.785, 0.02], [0.937, 0.02], y, -0.34, "ép. 0,08 L", alpha);
    if (L > 1700) repere([0.861, -0.389], [1.26, -0.64], y, "R 0,10 L", 32, alpha);   /* sinon elle bute sur la frise */
    ctx.globalAlpha = 1;
  }

  /* le plateau : une grille, pas un décor */
  function plateau(alpha) {
    if (alpha <= 0.01) return;
    ctx.save(); flou(0); ctx.lineWidth = 1;
    var n = 12, ext = 1.5;
    for (var i = 0; i <= n; i++) {
      var v = -ext + (2 * ext) * i / n;
      var bord = 1 - Math.pow(Math.abs(v) / ext, 2);
      ctx.globalAlpha = alpha * (0.15 + 0.6 * bord);
      ctx.strokeStyle = "rgba(90,137,173,0.35)";
      var a = proj(v, 0, -ext), b = proj(v, 0, ext), c = proj(-ext, 0, v), d = proj(ext, 0, v);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }
    ctx.restore();
  }

  function dessine(p, intro, temps) {
    if (!L) return;
    ctx.clearRect(0, 0, L, H);
    var large = L > 900 || L > H * 1.2;                    /* ordinateur, ou téléphone / tablette en paysage */
    var q = seg(p, GARDE, 1);

    var maille = intro;                                       // le filaire se dessine au chargement
    var cotesA = doucement(q, 0.03, 0.11) * (1 - doucement(q, 0.16, 0.22));
    var tranches = doucement(q, 0.19, 0.325);
    var matiere = doucement(q, 0.36, 0.51);
    var bascule = doucement(q, 0.55, 0.65);
    var coupe = doucement(q, 0.62, 0.70);
    var chute = doucement(q, 0.70, 0.74);
    var grave = doucement(q, 0.74, 0.795);
    var boitier = doucement(q, 0.83, 0.90);
    var lumiere = doucement(q, 0.89, 0.96);
    var mot = doucement(q, 0.94, 1.00);
    var allume = lumiere * (((lumiere > 0.07 && lumiere < 0.115) || (lumiere > 0.17 && lumiere < 0.205)) ? 0.22 : 1);
    /* le filaire reste en fantôme pendant l'impression : c'est la cible */
    var filA = 1 - 0.74 * doucement(q, 0.19, 0.30) - 0.26 * doucement(q, 0.50, 0.56);

    /* cadrage */
    if (large) {
      var serre = 1 - clamp((L - 1024) / 416, 0, 1);        /* sous 1440 px, la pièce se pousse à droite et rapetisse un peu */
      CAM.cx = L * 0.655 + 40 * serre;                      /* la pièce laisse de l'air au titre, à gauche */
      CAM.cy = H * (0.52 - 0.09 * mot);                     /* on remonte pour laisser la place au mot-symbole */
      CAM.ech = Math.min(L * 0.5, H) * (0.35 - 0.05 * serre) * (1 - 0.06 * bascule) * (1 - 0.08 * mot);
    } else {
      var ouv = 1 - doucement(q, 0.0, 0.07);
      CAM.cx = L * 0.5;
      CAM.cy = H * (0.33 - 0.08 * ouv - 0.08 * mot);
      CAM.ech = Math.min(L * 0.42, H * 0.20) * (1 - 0.26 * ouv - 0.12 * bascule - 0.22 * mot);
    }

    var ouvre = boitier * (1 - lumiere * 0.9);
    var tour = (1 - doucement(q, 0, 0.10)) * Math.sin(temps / 4200) * 0.42;     /* le filaire tourne sur son plateau */
    var souffle = Math.sin(temps / 2700) * 0.045 * (1 - 0.7 * lumiere);
    CAM.ax = 0.55 + (1.5708 - 0.55) * bascule - 0.30 * ouvre + visY * 0.04;
    CAM.ay = -0.32 * (1 - bascule) + souffle + tour + visX * 0.07 * (1 - 0.45 * bascule);

    var N = tactile ? 9 : (leger ? 14 : 24);
    var yFace = -HAUT;
    var yHaut = -HAUT * matiere;

    ctx.save();
    plateau((1 - bascule) * 0.9);
    if (cotesA > 0.01) cotes(cotesA, 0, L > 1360);        /* les cotes de droite seulement quand la frise a de la marge */
    filaire(filA * (1 - bascule), maille, temps);

    /* 04 — la plaque dans laquelle on découpe ; contour fermé, la chute tombe */
    var plaque = doucement(q, 0.60, 0.635) * (1 - chute);
    if (plaque > 0.002) {
      var tombe = 1.9 * chute * chute, rot = 0.11 * chute * chute;
      var cr = Math.cos(rot), sr = Math.sin(rot);
      var emporte = function (pt) {
        var dx = pt[0] - BOITE.cx, dz = pt[1] - BOITE.cz;
        return [BOITE.cx + dx * cr - dz * sr, BOITE.cz + dx * sr + dz * cr + tombe];
      };
      var mx = 0.44, mz = 0.30;
      var coins = [[BOITE.x0 - mx, BOITE.z0 - mz], [BOITE.x1 + mx, BOITE.z0 - mz], [BOITE.x1 + mx, BOITE.z1 + mz], [BOITE.x0 - mx, BOITE.z1 + mz]];
      ctx.save(); ctx.globalAlpha = plaque;
      ctx.beginPath();
      for (var ci = 0; ci < 4; ci++) { var cp = pp(emporte(coins[ci]), yFace); if (ci === 0) ctx.moveTo(cp[0], cp[1]); else ctx.lineTo(cp[0], cp[1]); }
      ctx.closePath();
      for (var gp = 0; gp < PLEIN.length; gp++) {
        var pol = PLEIN[gp];
        for (var ip = 0; ip < pol.length; ip++) { var qp = pp(emporte(pol[ip]), yFace); if (ip === 0) ctx.moveTo(qp[0], qp[1]); else ctx.lineTo(qp[0], qp[1]); }
        ctx.closePath();
      }
      ctx.fillStyle = "rgba(10,22,34,0.8)"; ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(90,137,173,0.42)"; ctx.lineWidth = 1; ctx.stroke();
      if (chute > 0.01 && chute < 0.99) {
        ctx.strokeStyle = "rgba(77,188,255," + (0.5 * (1 - chute)).toFixed(2) + ")"; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var gk = 0; gk < LOGO.corps.length; gk++) {
          var pk = LOGO.corps[gk];
          for (var ik = 0; ik < pk.length; ik++) { var qk = pp(emporte(pk[ik]), yFace); if (ik === 0) ctx.moveTo(qk[0], qk[1]); else ctx.lineTo(qk[0], qk[1]); }
          ctx.closePath();
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* 02 et 03 — les strates, puis la matière couche après couche.
       La matière est sombre : c'est la lumière qui est bleue, pas la pièce. */
    if (tranches > 0.001) {
      var ep = HAUT / N, faites = matiere * N;
      for (var i2 = 0; i2 <= N; i2++) {
        var prevue = clamp(tranches * N - i2, 0, 1);
        if (prevue <= 0) continue;
        var imprimee = clamp(faites - i2, 0, 1);
        var y2 = -i2 * ep;
        if (imprimee <= 0 && matiere > 0.02 && y2 < yHaut) continue;
        cheminGroupes(PLEIN, y2);
        if (imprimee > 0) { ctx.fillStyle = "rgba(14,30,46," + (0.55 + 0.35 * imprimee).toFixed(3) + ")"; ctx.fill("evenodd"); }
        var chaude = imprimee > 0 && imprimee < 1;
        ctx.lineWidth = chaude ? 1.8 : 1;
        ctx.strokeStyle = chaude ? "#bfe9ff"
          : "rgba(140,200,240," + ((0.14 + 0.30 * imprimee + 0.12 * prevue) * (1 - 0.45 * bascule)).toFixed(3) + ")";
        if (chaude) { ctx.shadowColor = "rgba(0,216,252,0.95)"; flou(14); }
        ctx.stroke(); flou(0);
      }
      if (matiere > 0.02) {
        cheminGroupes(PLEIN, yHaut);
        ctx.fillStyle = "rgba(20,38,56,0.98)"; ctx.fill("evenodd");
        ctx.strokeStyle = "rgba(122,196,247,0.45)"; ctx.lineWidth = 1; ctx.stroke();
      }
      if (matiere > 0.004 && matiere < 0.996) {
        var tb = traceFil(yHaut, (faites % 1));
        if (tb) {
          var sT = clamp(CAM.ech / 130, 0.8, 1.35);
          teteImpression(ctx, tb[0], tb[1] - 46 * sT, tb[0], tb[1], sT, 14 * FLOU);
        }
      }
    }

    /* 04 — la découpe suit le contour ; 05 — c'est lui qui s'allume */
    var vif = coupe;
    ctx.strokeStyle = lumiere > 0
      ? "rgb(" + Math.round(48 + 150 * allume) + "," + Math.round(168 + 70 * allume) + "," + Math.round(240 + 15 * allume) + ")"
      : "rgba(48,168,240," + (0.4 + 0.6 * vif).toFixed(3) + ")";
    ctx.lineWidth = 1.6 + 1.6 * coupe + 2.2 * allume;
    ctx.shadowColor = "rgba(0,216,252," + (0.5 * coupe + 0.95 * allume).toFixed(2) + ")";
    flou(10 * coupe + 30 * allume);
    if (coupe > 0.002 && coupe < 0.998) {
      var tc = traceFil(yFace, coupe); ctx.stroke();
      ctx.save(); ctx.strokeStyle = "rgba(48,168,240,0.2)"; ctx.lineWidth = 1; flou(0);
      cheminGroupes(LOGO.corps, yFace); ctx.stroke(); ctx.restore();
      if (tc) {
        ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(0,216,252,0.95)"; flou(22);
        ctx.beginPath(); ctx.arc(tc[0], tc[1], 3.2, 0, 6.2832); ctx.fill();
        for (var sp = 0; sp < 6; sp++) {
          var sa = (sp / 6) * 6.2832 + coupe * 30, dd2 = 5 + (sp % 3) * 5;
          ctx.globalAlpha = 0.5 - (sp % 3) * 0.14;
          ctx.beginPath(); ctx.arc(tc[0] + Math.cos(sa) * dd2, tc[1] + Math.sin(sa) * dd2, 1.3, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else if (coupe > 0.9 || lumiere > 0) {
      cheminGroupes(PLEIN, yFace);
      if (lumiere > 0.02) { ctx.fillStyle = "rgba(210,238,255," + (0.42 * allume).toFixed(2) + ")"; ctx.fill("evenodd"); }
      if (allume > 0.05) {
        var ph = (temps / 6400) % 1;
        if (ph < 0.42) {
          var pc0 = proj(0, yFace, 0), off = (ph / 0.42 * 2 - 1) * CAM.ech * 2.4;
          ctx.save(); ctx.clip("evenodd"); flou(0);
          var gr = ctx.createLinearGradient(pc0[0] + off - CAM.ech * 0.55, pc0[1] - CAM.ech, pc0[0] + off + CAM.ech * 0.55, pc0[1] + CAM.ech);
          gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255," + (0.20 * allume).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gr; ctx.fillRect(0, 0, L, H);
          ctx.restore();
        }
      }
      ctx.stroke();
    }
    flou(0);

    /* 05 — montage en éclaté : fond de caisson, couronne de LED, câblage */
    if (boitier > 0.01) {
      var recul = 0.62 * (1 - doucement(boitier, 0, 0.7));
      var yFond = yFace + 0.26 + recul, yLed = yFace + 0.22 + recul;
      ctx.globalAlpha = boitier * 0.8 * (1 - 0.7 * lumiere);
      ctx.strokeStyle = "rgba(90,137,173,0.7)"; ctx.lineWidth = 1.1; flou(0);
      cheminGroupes(LOGO.corps, yFond); ctx.stroke();
      if (recul > 0.01) {
        ctx.strokeStyle = "rgba(90,137,173,0.28)"; ctx.setLineDash([3, 5]);
        ctx.beginPath();
        var cA = pp([BOITE.x1, BOITE.z0], yFace), cB = pp([BOITE.x1, BOITE.z0], yFond);
        var cC = pp([BOITE.x0, BOITE.z1], yFace), cD = pp([BOITE.x0, BOITE.z1], yFond);
        ctx.moveTo(cA[0], cA[1]); ctx.lineTo(cB[0], cB[1]); ctx.moveTo(cC[0], cC[1]); ctx.lineTo(cD[0], cD[1]);
        ctx.stroke(); ctx.setLineDash([]);
      }
      var NL = 9, cable = doucement(boitier, 0.15, 0.55);
      if (cable > 0.01) {
        ctx.strokeStyle = "rgba(157,180,200,0.55)"; ctx.lineWidth = 1; ctx.globalAlpha = boitier * 0.8 * (1 - doucement(lumiere, 0, 0.5));
        ctx.beginPath();
        var nseg = Math.max(1, Math.round(cable * NL * 4));
        for (var cs = 0; cs <= nseg; cs++) {
          var ac = (cs / (NL * 4)) * 6.2832 - 6.2832 / NL * 0.5;
          var pcb = proj(Math.cos(ac) * 0.62, yLed, Math.sin(ac) * 0.62);
          if (cs === 0) ctx.moveTo(pcb[0], pcb[1]); else ctx.lineTo(pcb[0], pcb[1]);
        }
        if (cable > 0.98) { var pal = proj(Math.cos(-6.2832 / NL * 0.5) * 0.62, yLed, Math.sin(-6.2832 / NL * 0.5) * 0.62), pal2 = proj(1.16, yLed, 0.30); ctx.moveTo(pal[0], pal[1]); ctx.lineTo(pal2[0], pal2[1]); }
        ctx.stroke();
      }
      for (var l2 = 0; l2 < NL; l2++) {
        var avl = clamp(doucement(boitier, 0.5, 1) * 1.35 * NL - l2, 0, 1);
        if (avl <= 0) continue;
        var angl = (l2 / NL) * 6.2832;
        var pl2 = proj(Math.cos(angl) * 0.62, yLed, Math.sin(angl) * 0.62);
        ctx.globalAlpha = avl * 0.95 * (1 - 0.55 * lumiere);
        ctx.fillStyle = "#5cc4ff"; ctx.shadowColor = "rgba(0,216,252,0.9)"; flou(13 * avl);
        ctx.beginPath(); ctx.arc(pl2[0], pl2[1], 3.1 + 0.5 * avl * (1 + Math.sin(temps / 520 + l2 * 1.3)), 0, 6.2832); ctx.fill();
      }
      flou(0); ctx.globalAlpha = 1;
    }

    /* 04 bis — la gravure : les quatre barres entrent dans la matière */
    if (grave > 0.001) {
      for (var b3 = 0; b3 < LOGO.barres.length; b3++) {
        var avb = clamp(grave * 4.2 - b3 * 0.85, 0, 1);
        if (avb <= 0) continue;
        ctx.save();
        cheminGroupes([LOGO.barres[b3]], yFace);
        ctx.clip();
        var bb = BARRES[b3];
        var tCour = bb.t0 + (bb.t1 - bb.t0) * avb;
        var loc = function (t, u) { return [bb.m[0] + bb.d[0] * t + bb.n[0] * u, bb.m[1] + bb.d[1] * t + bb.n[1] * u]; };
        ctx.beginPath();
        var c1p = pp(loc(bb.t0 - 0.05, -0.3), yFace), c2p = pp(loc(tCour, -0.3), yFace);
        var c3p = pp(loc(tCour, 0.3), yFace), c4p = pp(loc(bb.t0 - 0.05, 0.3), yFace);
        ctx.moveTo(c1p[0], c1p[1]); ctx.lineTo(c2p[0], c2p[1]); ctx.lineTo(c3p[0], c3p[1]); ctx.lineTo(c4p[0], c4p[1]); ctx.closePath();
        ctx.fillStyle = lumiere > 0
          ? "rgb(" + Math.round(150 + 105 * allume) + "," + Math.round(215 + 40 * allume) + ",255)"
          : "rgba(180,226,255," + (0.45 + 0.4 * avb).toFixed(2) + ")";
        ctx.shadowColor = "rgba(0,216,252," + (0.9 * allume).toFixed(2) + ")"; flou(26 * allume);
        ctx.fill(); flou(0);
        ctx.restore();
        if (avb < 1) {
          var tp = pp(loc(tCour, 0), yFace);
          ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(0,216,252,0.95)"; flou(18);
          ctx.beginPath(); ctx.arc(tp[0], tp[1], 2.6, 0, 6.2832); ctx.fill(); flou(0);
        }
      }
    }

    /* le halo */
    if (lumiere > 0.01) {
      var pc = proj(0, yFace, 0);
      ctx.globalAlpha = allume;
      var halo = ctx.createRadialGradient(pc[0], pc[1], CAM.ech * 0.1, pc[0], pc[1], CAM.ech * 2.8);
      halo.addColorStop(0, "rgba(48,168,240,0.34)");
      halo.addColorStop(1, "rgba(48,168,240,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, L, H);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* le mot-symbole vient se poser sous la marque */
    if (mot > 0.005 && motImg.complete && motImg.naturalWidth) {
      var pcl = proj(0, yFace, 0);
      var wT = Math.min(CAM.ech * 3.6, L - 44, motImg.naturalWidth * 1.3 / dpr);
      var yT = pcl[1] + CAM.ech * 1.18, rf = frise.getBoundingClientRect(), rt = toile.getBoundingClientRect();
      if (large && yT + wT * 0.09 > rf.top - rt.top && yT < rf.bottom - rt.top)       /* à la hauteur de la frise : il s'arrête avant elle */
        wT = Math.max(120, Math.min(wT, 2 * (rf.left - rt.left - 18 - pcl[0])));
      var hT = wT * motImg.naturalHeight / motImg.naturalWidth;
      ctx.save();
      ctx.globalAlpha = mot;
      ctx.shadowColor = "rgba(48,168,240,0.85)"; flou(22);
      ctx.drawImage(motImg, pcl[0] - wT / 2, pcl[1] + CAM.ech * 1.18 + (1 - mot) * 14, wT, hT);
      flou(0); ctx.restore();
    }

    frise.classList.toggle("visible", p > GARDE * 0.6);

    /* la console : la machine dit ce qu'elle fait */
    if (consoleEl && large) {
      var xy = tetePlan ? "X" + tetePlan[0].toFixed(3) + " Y" + (-tetePlan[1]).toFixed(3) : "";
      var lignes;
      if (mot > 0.3) lignes = null;
      else if (lumiere > 0.02) lignes = ["; mise sous tension", allume < lumiere ? "; <b>…</b>" : "; pièce <b>allumée</b>"];
      else if (boitier > 0.02) lignes = ["; montage du module", "; LED <b>" + Math.min(9, Math.ceil(doucement(boitier, 0.5, 1) * 1.35 * 9)) + "/9</b> · câblage " + (doucement(boitier, 0.15, 0.55) > 0.98 ? "<b>ok</b>" : "…")];
      else if (grave > 0.02) lignes = ["; gravure — puissance réduite", "; barre <b>" + Math.min(4, Math.floor(grave * 4.2 / 0.85) + 1) + "/4</b>"];
      else if (chute > 0.02) lignes = ["; contour fermé", "; <b>chute évacuée</b>"];
      else if (coupe > 0.002) lignes = ["; découpe laser — contour " + Math.round(coupe * 100) + " %", "G1 <b>" + xy + "</b>"];
      else if (matiere > 0.02) lignes = ["; impression — couche <b>" + Math.min(N, Math.ceil(matiere * N)) + "/" + N + "</b>", "G1 <b>" + xy + "</b> E" + (matiere * N * LONG.tot).toFixed(1)];
      else if (tranches > 0.02) lignes = ["; tranchage — <b>" + Math.round(tranches * N) + "/" + N + "</b> couches", "; hauteur de couche " + (HAUT / N).toFixed(4)];
      else if (p > GARDE * 0.6) lignes = ["; modélisation — maillage <b>" + (MAILLE[0].length + MAILLE[1].length) * 2 + "</b> facettes", "; contour <b>fermé</b>"];
      else lignes = null;
      var txt = lignes ? lignes.join("\n") : "";
      if (txt !== consoleTxt) { consoleTxt = txt; consoleEl.innerHTML = txt; }
      consoleEl.classList.toggle("visible", !!txt);
    }

    /* chapitres et frise */
    var actif = 0;
    for (var s2 = 0; s2 < ETAPES.length; s2++) if (p >= ETAPES[s2]) actif = s2;
    for (var c3 = 0; c3 < chapitres.length; c3++) {
      var d3 = ETAPES[c3];
      var fin3 = c3 + 1 < ETAPES.length ? ETAPES[c3 + 1] : 1.04;
      var m1 = 0.004, m2 = 0.024;
      var entre = c3 === 0 ? 1 : lisse(seg(p, d3 + m1, d3 + m2));
      var part2 = 1 - lisse(seg(p, fin3 - m2, fin3 - m1));
      var a3 = entre * part2;
      var el = chapitres[c3];
      el.style.opacity = a3.toFixed(3);
      el.style.transform = "translateY(" + ((1 - a3) * 16).toFixed(1) + "px)";
      el.classList.toggle("actif", a3 > 0.5);
    }
    for (var e = 0; e < crans.length; e++) {
      var deb2 = ETAPES[e + 1], fin4 = e + 2 < ETAPES.length ? ETAPES[e + 2] : 1;
      var rem = seg(p, deb2, fin4);
      rails[e].style.setProperty("--r", rem.toFixed(3));
      crans[e].classList.toggle("ici", actif === e + 1);
      crans[e].classList.toggle("fait", rem >= 1);
    }
  }

  /* ————————————————————————————————————————————————
     LE 1 m³.
     Le volume de fabrication en filaire, coté, qui se remplit couche par
     couche pendant qu'on le fait tourner. Le chiffre est au milieu.
     ———————————————————————————————————————————————— */
  var grand = document.getElementById("grand-format");
  var cube = document.getElementById("cube"), cx = cube.getContext("2d");
  var cubeA = document.getElementById("cubeAvant"), cxA = cubeA.getContext("2d");   /* v3 : la tête passe devant le chiffre */
  var grandValeur = document.getElementById("grandValeur");
  var capas = Array.prototype.slice.call(document.querySelectorAll(".capa"));
  var CL = 0, CH = 0, cdpr = 1, dCL = 0, dCH = 0;
  function tailleCube(force) {
    var r = cube.getBoundingClientRect(), nl = Math.round(r.width), nh = Math.round(r.height);
    if (!force && dCL === nl && Math.abs(dCH - nh) < 140 && dCH) return;
    dCL = nl; dCH = nh;
    cdpr = Math.min(tactile ? 1.25 : 2, window.devicePixelRatio || 1);
    CL = Math.max(1, nl); CH = Math.max(1, nh);
    cube.width = Math.round(CL * cdpr); cube.height = Math.round(CH * cdpr);
    cx.setTransform(cdpr, 0, 0, cdpr, 0, 0);
    cubeA.width = cube.width; cubeA.height = cube.height; cxA.setTransform(cdpr, 0, 0, cdpr, 0, 0);
  }
  var CC = { ax: 0.46, ay: -0.6, cx: 0, cy: 0, ech: 100, dist: 6 };
  function pc3(x, y, z) {
    var c1 = Math.cos(CC.ay), s1 = Math.sin(CC.ay);
    var X = x * c1 - z * s1, Z = x * s1 + z * c1;
    var c2 = Math.cos(CC.ax), s2 = Math.sin(CC.ax);
    var Y = y * c2 - Z * s2, Z2 = y * s2 + Z * c2;
    var f = CC.dist / (CC.dist + Z2);
    return [CC.cx + X * f * CC.ech, CC.cy + Y * f * CC.ech];
  }
  function ligneC(a, b, t) {
    var A = pc3(a[0], a[1], a[2]), B = pc3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    cx.moveTo(A[0], A[1]); cx.lineTo(B[0], B[1]);
  }
  var zoneValeur = null;                                 /* le cadre du chiffre : aucune étiquette ne vient dessus */
  function etiquetteC(x, y, texte) {
    if (zoneValeur && x > zoneValeur.x0 && x < zoneValeur.x1 && y > zoneValeur.y0 && y < zoneValeur.y1) return;
    cx.font = "11px ui-monospace, Menlo, Consolas, monospace"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var w = cx.measureText(texte).width + 12;
    cx.fillStyle = "rgba(2,4,7,0.92)"; cx.fillRect(x - w / 2, y - 9, w, 18);
    cx.fillStyle = "#c9dbe9"; cx.fillText(texte, x, y);
  }
  function coteC(a, b, dec, texte, alpha) {
    var A = [a[0] + dec[0], a[1] + dec[1], a[2] + dec[2]], B = [b[0] + dec[0], b[1] + dec[1], b[2] + dec[2]];
    cx.globalAlpha = alpha; cx.strokeStyle = "rgba(157,180,200,0.6)"; cx.lineWidth = 1;
    cx.beginPath(); ligneC(a, A, 1.15); ligneC(b, B, 1.15); ligneC(A, B, 1); cx.stroke();
    var pa = pc3(A[0], A[1], A[2]), pb = pc3(B[0], B[1], B[2]);
    etiquetteC((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, texte);
    cx.globalAlpha = 1;
  }
  function dessineCube(pc, temps, apparition) {
    if (!CL) return;
    cx.clearRect(0, 0, CL, CH); cxA.clearRect(0, 0, CL, CH);
    var large = CL > 760;
    CC.cx = CL / 2; CC.cy = large ? CH * 0.52 : CH * 0.38;
    CC.ech = large ? Math.min(CL * 0.2, CH * 0.27) : Math.min(CL * 0.3, CH * 0.2);
    CC.ay = -0.95 + 1.1 * pc + Math.sin(temps / 3400) * 0.03;
    CC.ax = 0.42 + 0.08 * pc;

    var bords = Math.max(apparition, doucement(pc, 0.0, 0.2)), cotA = doucement(pc, 0.16, 0.3), plein = doucement(pc, 0.22, 0.88);
    var S = [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]];
    var A = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

    /* le plateau, quadrillé */
    cx.lineWidth = 1; cx.strokeStyle = "rgba(90,137,173,0.16)"; cx.beginPath();
    for (var g = -4; g <= 4; g++) { var v = g / 4; ligneC([v, 1, -1], [v, 1, 1], bords); ligneC([-1, 1, v], [1, 1, v], bords); }
    cx.stroke();

    /* les couches déjà déposées : un volume qui se remplit */
    var NC = tactile ? 26 : 44, faites = plein * NC;
    for (var k = 0; k < NC; k++) {
      var r = clamp(faites - k, 0, 1);
      if (r <= 0) break;
      var y = 1 - 2 * (k + 1) / NC, chaude = r < 1 || k === Math.floor(faites) - 1 && plein < 0.999;
      cx.beginPath();
      var c0 = pc3(-0.86, y, -0.86), c1 = pc3(0.86, y, -0.86), c2 = pc3(0.86, y, 0.86), c3 = pc3(-0.86, y, 0.86);
      cx.moveTo(c0[0], c0[1]); cx.lineTo(c1[0], c1[1]); cx.lineTo(c2[0], c2[1]); cx.lineTo(c3[0], c3[1]); cx.closePath();
      if (chaude) {
        cx.fillStyle = "rgba(48,168,240,0.05)"; cx.fill();
        cx.strokeStyle = "rgba(0,216,252,0.95)"; cx.lineWidth = 1.4; cx.shadowColor = "rgba(0,216,252,0.9)"; cx.shadowBlur = tactile ? 6 : 14;
      } else {
        cx.strokeStyle = "rgba(92,196,255," + (0.07 + 0.10 * (k / NC)).toFixed(3) + ")"; cx.lineWidth = 1; cx.shadowBlur = 0;
      }
      cx.stroke(); cx.shadowBlur = 0;
    }
    /* le portique suit la couche en cours */
    if (plein > 0.002 && plein < 0.998) {
      var yP = 1 - 2 * plein, zt = Math.sin(temps / 380) * 0.8, hx = Math.cos(temps / 520) * 0.75;
      var sC = clamp(CC.ech / 95, 1, 1.7), yG = yP - 0.34;
      cx.strokeStyle = "rgba(232,238,244,0.8)"; cx.lineWidth = 1.2; cx.beginPath();
      ligneC([-1, yG, zt], [1, yG, zt], 1); cx.stroke();                                   /* le portique */
      cx.strokeStyle = "rgba(232,238,244,0.25)"; cx.beginPath();
      ligneC([-1, yG, -1], [-1, yG, 1], 1); ligneC([1, yG, -1], [1, yG, 1], 1); cx.stroke();   /* ses rails */
      var hB = pc3(hx, yG, zt), hT = pc3(hx, yP, zt);
      teteImpression(cxA, hB[0], hB[1], hT[0], hT[1], sC, tactile ? 6 : 14);
    }
    /* les douze arêtes du volume */
    cx.strokeStyle = "rgba(120,210,255,0.9)"; cx.lineWidth = 1.2; cx.shadowColor = "rgba(48,168,240,0.8)"; cx.shadowBlur = tactile ? 4 : 10;
    cx.beginPath();
    for (var a = 0; a < A.length; a++) ligneC(S[A[a][0]], S[A[a][1]], bords);
    cx.stroke(); cx.shadowBlur = 0;
    /* coins */
    cx.fillStyle = "rgba(200,236,255,0.9)";
    for (var s = 0; s < 8 && bords > 0.98; s++) { var ps = pc3(S[s][0], S[s][1], S[s][2]); cx.fillRect(ps[0] - 2, ps[1] - 2, 4, 4); }
    /* cotes */
    if (cotA > 0.01) {
      var rv = grandValeur.getBoundingClientRect(), rc = cube.getBoundingClientRect();
      zoneValeur = { x0: rv.left - rc.left - 10, x1: rv.right - rc.left + 10, y0: rv.top - rc.top - 6, y1: rv.bottom - rc.top + 6 };
      coteC([-1, 1, 1], [1, 1, 1], [0, 0.0, 0.34], "1 m", cotA);
      coteC([1, 1, 1], [1, 1, -1], [0.34, 0, 0], "1 m", cotA);
      var gauche = null, xg = 1e9;                         /* l'arête verticale la plus à gauche, pour ne pas barrer le chiffre */
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) { var x = pc3(c[0], 0, c[1])[0]; if (x < xg) { xg = x; gauche = c; } });
      coteC([gauche[0], 1, gauche[1]], [gauche[0], -1, gauche[1]], [gauche[0] * 0.24, 0, gauche[1] * 0.24], "1 m", cotA);
    }

    var aT = Math.max(doucement(pc, 0.12, 0.3), doucement(apparition, 0.4, 1));
    grandValeur.style.setProperty("--a", aT.toFixed(3));
    for (var i = 0; i < capas.length; i++) capas[i].style.setProperty("--a", doucement(pc, 0.3 + i * 0.07, 0.42 + i * 0.07).toFixed(3));
  }

  /* ——— boucle ——— */
  function derouleCube(s) { return clamp(s / 0.8, 0, 1); }   /* le cube rempli reste à l'écran sur le dernier cinquième */
  function progression(el) {
    var r = el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return r.top < 0 ? 1 : 0;
    return clamp(-r.top / total, 0, 1);
  }

  var visRecit = true, visGrand = false, tourne = false;
  var cibleR = 0, courantR = 0, cibleG = 0, courantG = 0;
  var cadres = 0, releves = [], verifiee = false, debutIntro = 0, intro = 0, debutCube = 0, introCube = 0;

  function image(t) {
    tourne = false;
    var t0 = performance.now();
    if (!debutIntro) debutIntro = t;
    intro = lisse(clamp((t - debutIntro) / 2200, 0, 1));
    cibleR = deroule(progression(recit)); cibleG = derouleCube(progression(grand));
    courantR += (cibleR - courantR) * 0.12; courantG += (cibleG - courantG) * 0.11;
    visX += (cibX - visX) * 0.05; visY += (cibY - visY) * 0.05;
    if (Math.abs(cibleR - courantR) < 0.0002) courantR = cibleR;
    if (Math.abs(cibleG - courantG) < 0.0002) courantG = cibleG;
    if (visRecit) dessine(courantR, intro, t);
    if (visGrand) {
      if (!debutCube && grand.getBoundingClientRect().top < window.innerHeight * 0.55) debutCube = t;
      introCube = debutCube ? lisse(clamp((t - debutCube) / 1600, 0, 1)) : 0;
      dessineCube(courantG, t, introCube);
    }
    if (!verifiee && visRecit) {
      cadres++;
      if (cadres > 15) releves.push(performance.now() - t0);
      if (releves.length === 45) {
        verifiee = true;
        releves.sort(function (a, b) { return a - b; });
        if (releves[Math.floor(releves.length / 2)] > 15) { leger = true; FLOU = 0.45; taille(true); }
      }
    }
    var reste = intro < 1 || (debutCube && introCube < 1) || Math.abs(cibleR - courantR) > 0.0001 || Math.abs(cibleG - courantG) > 0.0001
      || Math.abs(cibX - visX) > 0.002 || Math.abs(cibY - visY) > 0.002;
    if (visRecit || visGrand || reste) relance();
  }
  function relance() { if (!tourne && !doux) { tourne = true; requestAnimationFrame(image); } }

  function surDefilement() { relance(); }

  if (!doux && "IntersectionObserver" in window) {
    var vue = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.target === recit) visRecit = e.isIntersecting;
        if (e.target === grand) visGrand = e.isIntersecting;
      });
      if (visRecit || visGrand) relance();
    }, { rootMargin: "200px 0px" });
    vue.observe(recit); vue.observe(grand);
  } else { visGrand = true; }

  /* clavier : un lien qui prend le focus dans une étape cachée amène la page sur le palier de cette étape */
  function palierDe(k) {                             /* centre du palier de l'étape k, en part du défilement */
    var i = k === 0 ? 0 : 2 * k, a = 0;
    for (var j = 0; j < i; j++) a += COURSE[j][0];
    return a + COURSE[i][0] / 2;
  }
  chapitres.forEach(function (c, k) {
    c.addEventListener("focusin", function () {
      if (doux || +c.style.opacity > 0.9) return;
      var r = recit.getBoundingClientRect(), course = recit.offsetHeight - window.innerHeight;
      window.scrollTo({ top: Math.round(window.scrollY + r.top + palierDe(k) * course), behavior: "instant" });
      courantR = cibleR = deroule(progression(recit)); relance();
    });
  });

  window.addEventListener("scroll", surDefilement, { passive: true });
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", function (e) {
      cibX = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      cibY = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
      relance();
    }, { passive: true });
  }
  window.addEventListener("resize", function () { taille(false); tailleCube(false); relance(); });
  window.addEventListener("orientationchange", function () { setTimeout(function () { taille(true); tailleCube(true); relance(); }, 260); });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { taille(true); tailleCube(true); relance(); }); }

  taille(true); tailleCube(true); surDefilement();
  if (doux) {
    dessine(0.97, 1, 0);
    dessineCube(1, 0, 1);
    chapitres.forEach(function (c) { c.style.opacity = "1"; c.classList.add("actif"); });
  } else {
    courantR = cibleR = deroule(progression(recit));
    courantG = cibleG = derouleCube(progression(grand));
    relance();
  }
})();
