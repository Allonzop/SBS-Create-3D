# -*- coding: utf-8 -*-
"""Génère versions/v3/ (multi-pages) à partir de la v2.

v3 — retouches du 19/10/2026 (Allonzo) :
  - plusieurs pages au lieu d'un one page ;
  - défilement plus court (récit et 1 m³) ;
  - logo plus grand dans la barre sur ordinateur ;
  - lien vers Polycomm ;
  - slogan avec « impression 3D » (exemple, à travailler avec Servan) ;
  - une vraie tête d'impression à la place du point sur l'imprimante.

Usage : python3 outils/build-v3.py   (depuis la racine du dépôt)
"""
import pathlib, re

RACINE = pathlib.Path(__file__).resolve().parent.parent
V2 = (RACINE / "versions/v2/index.html").read_text(encoding="utf-8")
SORTIE = RACINE / "versions/v3"
SORTIE.mkdir(parents=True, exist_ok=True)


def entre(txt, debut, fin, depuis=0):
    a = txt.index(debut, depuis)
    b = txt.index(fin, a + len(debut))
    return txt[a + len(debut):b], b


# ————————————————————————————————————————————— CSS
css, _ = entre(V2, "<style>\n  @font-face", "</style>")
css = "  @font-face" + css


def rep(t, old, new, n=1):
    assert t.count(old) == n, (old[:70], t.count(old))
    return t.replace(old, new)


# défilement plus court
css = rep(css, ".recit { position: relative; height: 760svh; }", ".recit { position: relative; height: 420svh; }")
css = rep(css, "    .recit { height: 600svh; }", "    .recit { height: 360svh; }")
css = rep(css, ".grand { position: relative; height: 280svh; background: var(--noir); }",
          ".grand { position: relative; height: 170svh; background: var(--noir); }")
css = rep(css, "    .grand { height: 240svh; }", "    .grand { height: 150svh; }")
css = rep(css, ".bloc { padding-block: clamp(80px, 12vw, 152px); }", ".bloc { padding-block: clamp(64px, 9vw, 116px); }")
# logo plus grand, menu de pages
css = rep(css, ".barre__logo img { height: 30px; width: auto; }",
          ".barre__logo img { height: 36px; width: auto; transition: height 300ms var(--courbe); }")
css = rep(css, ".menu { display: flex; align-items: center; gap: 28px; }", ".menu { display: flex; align-items: center; gap: 24px; }")

css += r"""
  /* ——— v3 ——— */
  @media (min-width: 1061px) {
    :root { --haut-barre: 84px; }
    .barre__logo img { height: 56px; }
    .barre.solide .barre__logo img { height: 46px; }
  }
  .menu a.ici { color: var(--encre); box-shadow: 0 1px 0 var(--led); }

  /* slogan : découpé en lignes qui tiennent à toutes les largeurs */
  .slogan { font-size: clamp(34px, 3.6vw, 52px) !important; line-height: 1.0; }
  .grand__toile--avant { z-index: 2; pointer-events: none; }
  @media (min-width: 901px) { .scene__texte { width: min(100%, 640px); } }
  .slogan span { display: block; }
  .slogan .lumiere { color: var(--led); text-shadow: 0 0 28px rgba(48,168,240,0.45); }
  @media (max-width: 900px) { .slogan { font-size: clamp(32px, 9vw, 44px) !important; } }
  @media (max-width: 900px) and (max-height: 720px) { .slogan { font-size: 30px !important; } }

  /* cartes d'activité : toute la carte mène à la page */
  a.activite { color: inherit; text-decoration: none; }
  .activite__lien { justify-self: start; margin-top: 8px; display: inline-flex; align-items: center; gap: 12px; color: var(--encre);
    font: 700 12px/16px var(--texte); letter-spacing: 0.1em; text-transform: uppercase; }
  .activite__lien::before { content: "→"; display: inline-grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--trait-fort); font: 400 15px/1 var(--texte); transition: border-color 200ms, box-shadow 200ms, color 200ms; }
  a.activite:hover .activite__lien::before, a.activite:focus-visible .activite__lien::before { border-color: var(--led); color: var(--led); box-shadow: 0 0 14px rgba(48,168,240,0.45); }

  /* en-tête des pages intérieures */
  .tete-page { position: relative; padding: calc(var(--haut-barre) + clamp(48px, 7vw, 96px)) 0 clamp(40px, 5vw, 72px);
    border-bottom: 1px solid var(--trait); background: radial-gradient(60% 80% at 80% 0%, #07111b 0%, var(--noir) 70%); overflow: hidden; }
  .tete-page .titre--xl { margin-top: 18px; }
  .fil { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pale); margin: 0 0 22px; }
  .fil a { color: var(--douce); text-decoration: none; } .fil a:hover { color: var(--led); }

  /* page d'activité */
  .act { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(28px, 5vw, 72px); align-items: start; }
  .act__photo { position: relative; margin: 0; aspect-ratio: 4 / 5; overflow: hidden; border: 1px solid var(--trait); background: var(--acier); }
  .act__photo img { width: 100%; height: 100%; object-fit: cover; }
  .act__corps { display: grid; gap: 4px; }
  .act__corps .fiche__groupe { padding: 22px 0; }
  .act__corps .fiche__groupe h2 { margin: 0 0 8px; font: 700 15px/22px var(--texte); letter-spacing: 0.02em; }
  .act__corps .fiche__groupe p { margin: 0; color: var(--douce); }
  .act__corps .actions { margin-top: 24px; }
  @media (max-width: 860px) { .act { grid-template-columns: 1fr; } .act__photo { aspect-ratio: 4 / 3; } }

  /* aperçus de réalisations */
  .apercus { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: var(--trait); border: 1px solid var(--trait); }
  .apercu { position: relative; display: block; background: var(--noir); color: inherit; text-decoration: none; aspect-ratio: 4 / 5; overflow: hidden; }
  .apercu img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.7) saturate(0.9); transition: transform 800ms var(--courbe), filter 500ms var(--courbe); }
  .apercu::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(2,4,7,0) 45%, rgba(2,4,7,0.92) 100%); }
  .apercu:hover img, .apercu:focus-visible img { transform: scale(1.05); filter: brightness(0.85) saturate(1); }
  .apercu__txt { position: absolute; left: 22px; right: 22px; bottom: 20px; z-index: 1; display: grid; gap: 8px; }
  .apercu .a-fournir { position: absolute; inset: 0; }
  .bas-bloc { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 20px 32px; margin-bottom: 28px; }
  @media (max-width: 860px) { .apercus { grid-template-columns: 1fr; } .apercu { aspect-ratio: 4 / 3; } }

  /* bandeau d'appel */
  .appel { border-top: 1px solid var(--trait); background: var(--nuit); }
  .appel .enveloppe { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 24px; padding-block: clamp(48px, 7vw, 88px); }

  /* entreprise sœur */
  .soeur { margin-top: 40px; padding: 22px 24px; border: 1px solid var(--trait); background: var(--nuit); display: grid; gap: 8px; }
  .soeur p:not(.label) { margin: 0; color: var(--douce); font-size: 15px; line-height: 24px; }
  .soeur a { justify-self: start; margin-top: 6px; }
  .pied .soeur-lien { color: var(--douce); }
"""
(SORTIE / "commun.css").write_text(css, encoding="utf-8")

# ————————————————————————————————————————————— JS
js, _ = entre(V2, "<script>\n(function () {", "</script>")
i_recit = js.index("  /* ————————————————————————————————————————————————\n     LE RÉCIT.")
recit_js = js[i_recit:]
recit_js = rep(recit_js, "  function surDefilement() {\n    barre.classList.toggle(\"solide\", window.scrollY > 24);\n    relance();\n  }",
               "  function surDefilement() { relance(); }")
recit_js = rep(recit_js, "taille(false); tailleCube(false); idxR = -1; majReals(); relance();", "taille(false); tailleCube(false); relance();")
recit_js = recit_js.rstrip()
assert recit_js.endswith("})();"), recit_js[-40:]
recit_js = recit_js[:-len("})();")].rstrip()   # fermeture de l'IIFE d'origine, remise plus bas

TETE = r"""
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
"""
recit_js = TETE + recit_js
# récit : l'ancienne buse trapézoïdale devient la tête d'impression
old_buse = """        if (tb) {
          ctx.strokeStyle = "#e8eef4"; ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tb[0] - 11, tb[1] - 32); ctx.lineTo(tb[0] + 11, tb[1] - 32);
          ctx.lineTo(tb[0] + 4, tb[1] - 12); ctx.lineTo(tb[0] - 4, tb[1] - 12); ctx.closePath(); ctx.stroke();
          ctx.strokeStyle = "rgba(0,216,252,0.95)"; ctx.lineWidth = 1.6;
          ctx.shadowColor = "rgba(0,216,252,0.9)"; flou(12);
          ctx.beginPath(); ctx.moveTo(tb[0], tb[1] - 12); ctx.lineTo(tb[0], tb[1] - 1); ctx.stroke(); flou(0);
        }"""
new_buse = """        if (tb) {
          var sT = clamp(CAM.ech / 130, 0.8, 1.35);
          teteImpression(ctx, tb[0], tb[1] - 46 * sT, tb[0], tb[1], sT, 14 * FLOU);
        }"""
recit_js = rep(recit_js, old_buse, new_buse)
# 1 m³ : le point sur le portique devient la tête d'impression
old_cube = """      var yP = 1 - 2 * plein, zt = Math.sin(temps / 380) * 0.8;
      cx.strokeStyle = "rgba(232,238,244,0.8)"; cx.lineWidth = 1.2; cx.beginPath();
      ligneC([-1, yP - 0.06, zt], [1, yP - 0.06, zt], 1); cx.stroke();
      var tH = pc3(Math.cos(temps / 520) * 0.75, yP - 0.06, zt);
      cx.fillStyle = "#ffffff"; cx.shadowColor = "rgba(0,216,252,0.95)"; cx.shadowBlur = 14;
      cx.beginPath(); cx.arc(tH[0], tH[1], 3, 0, 6.2832); cx.fill(); cx.shadowBlur = 0;"""
new_cube = """      var yP = 1 - 2 * plein, zt = Math.sin(temps / 380) * 0.8, hx = Math.cos(temps / 520) * 0.75;
      var sC = clamp(CC.ech / 95, 1, 1.7), yG = yP - 0.34;
      cx.strokeStyle = "rgba(232,238,244,0.8)"; cx.lineWidth = 1.2; cx.beginPath();
      ligneC([-1, yG, zt], [1, yG, zt], 1); cx.stroke();                                   /* le portique */
      cx.strokeStyle = "rgba(232,238,244,0.25)"; cx.beginPath();
      ligneC([-1, yG, -1], [-1, yG, 1], 1); ligneC([1, yG, -1], [1, yG, 1], 1); cx.stroke();   /* ses rails */
      var hB = pc3(hx, yG, zt), hT = pc3(hx, yP, zt);
      teteImpression(cxA, hB[0], hB[1], hT[0], hT[1], sC, tactile ? 6 : 14);"""
recit_js = rep(recit_js, old_cube, new_cube)
recit_js = rep(recit_js, 'var cube = document.getElementById("cube"), cx = cube.getContext("2d");',
               'var cube = document.getElementById("cube"), cx = cube.getContext("2d");\n  var cubeA = document.getElementById("cubeAvant"), cxA = cubeA.getContext("2d");   /* v3 : la tête passe devant le chiffre */')
recit_js = rep(recit_js, "    cx.setTransform(cdpr, 0, 0, cdpr, 0, 0);\n  }",
               "    cx.setTransform(cdpr, 0, 0, cdpr, 0, 0);\n    cubeA.width = cube.width; cubeA.height = cube.height; cxA.setTransform(cdpr, 0, 0, cdpr, 0, 0);\n  }")
recit_js = rep(recit_js, "    cx.clearRect(0, 0, CL, CH);\n", "    cx.clearRect(0, 0, CL, CH); cxA.clearRect(0, 0, CL, CH);\n")

accueil = """(function () {
  "use strict";
  var doux = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tactile = window.matchMedia("(pointer: coarse)").matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lisse = function (t) { return t * t * (3 - 2 * t); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var doucement = function (p, a, b) { return lisse(seg(p, a, b)); };
""" + recit_js + "\n})();\n"
(SORTIE / "accueil.js").write_text(accueil, encoding="utf-8")

commun_js = r"""(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var doux = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* apparitions */
  var aVoir = document.querySelectorAll(".dep");
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vu"); obs.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    aVoir.forEach(function (el) { obs.observe(el); });
  } else { aVoir.forEach(function (el) { el.classList.add("vu"); }); }

  /* compteurs */
  if ("IntersectionObserver" in window && !doux) {
    var obsN = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; obsN.unobserve(el);
        var cible = parseInt(el.getAttribute("data-compte"), 10), t0 = performance.now();
        var depart = cible > 100 ? cible - 40 : 0;
        (function pas(t) {
          var pr = Math.min(1, (t - t0) / 1100);
          el.textContent = Math.round(depart + (cible - depart) * (1 - Math.pow(1 - pr, 3)));
          if (pr < 1) requestAnimationFrame(pas);
        })(t0);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-compte]").forEach(function (el) { obsN.observe(el); });
  }

  /* barre et menu */
  var barre = document.getElementById("barre"), burger = document.getElementById("burger"), menu = document.getElementById("menu");
  function solide() { barre.classList.toggle("solide", window.scrollY > 24 || !document.body.classList.contains("accueil")); }
  window.addEventListener("scroll", solide, { passive: true }); solide();
  function fermeMenu() { barre.classList.remove("ouverte"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Ouvrir le menu"); }
  burger.addEventListener("click", function () {
    var o = barre.classList.toggle("ouverte");
    burger.setAttribute("aria-expanded", o ? "true" : "false");
    burger.setAttribute("aria-label", o ? "Fermer le menu" : "Ouvrir le menu");
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) fermeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermeMenu(); });

  /* formulaire (maquette : rien ne part) */
  var form = document.getElementById("formulaire");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); document.getElementById("formRetour").hidden = false; });

  /* réalisations */
  var reals = document.getElementById("reals");
  if (reals) {
    var prec = document.getElementById("realsPrec"), suiv = document.getElementById("realsSuiv");
    var compteR = document.getElementById("realsCompte"), nbR = reals.children.length, idxR = -1;
    var majReals = function () {
      var i = Math.round(reals.scrollLeft / Math.max(1, reals.clientWidth));
      if (i === idxR) return; idxR = i;
      compteR.innerHTML = "<b>" + ("0" + (i + 1)).slice(-2) + "</b> / " + ("0" + nbR).slice(-2);
      prec.disabled = i <= 0; suiv.disabled = i >= nbR - 1;
    };
    var vaR = function (d) { reals.scrollTo({ left: (idxR + d) * reals.clientWidth, behavior: doux ? "auto" : "smooth" }); };
    prec.addEventListener("click", function () { vaR(-1); });
    suiv.addEventListener("click", function () { vaR(1); });
    reals.addEventListener("scroll", majReals, { passive: true });
    reals.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); vaR(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); vaR(-1); }
    });
    window.addEventListener("resize", function () { idxR = -1; majReals(); });
    var cible = location.hash && document.querySelector(location.hash + ".real");
    if (cible) reals.scrollLeft = Array.prototype.indexOf.call(reals.children, cible) * reals.clientWidth;
    majReals();
  }
})();
"""
(SORTIE / "commun.js").write_text(commun_js, encoding="utf-8")

# ————————————————————————————————————————————— gabarit HTML
PAGES = [("index.html", "Accueil"), ("impression-3d.html", "Impression 3D"), ("laser.html", "Laser"),
         ("enseignes.html", "Enseignes"), ("realisations.html", "Réalisations"), ("atelier.html", "L’atelier"),
         ("contact.html", "Contact")]


def page(fichier, titre, description, corps, accueil=False):
    menu = "\n".join(
        '      <a href="{f}"{c}>{n}</a>'.format(f=f, n=n, c=' class="ici" aria-current="page"' if f == fichier else "")
        for f, n in PAGES)
    titre_doc = "SBS Create 3D" if accueil else titre + " · SBS Create 3D"
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>{titre_doc}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#020407">
<meta property="og:title" content="{titre_doc}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="website">
<style>html,body{{margin:0;background:#020407}}
[hidden]:not([hidden="until-found"]){{display:none!important}}</style>
<link rel="stylesheet" href="commun.css">
</head>
<body{' class="accueil"' if accueil else ''}>

<header class="barre" id="barre">
  <div class="enveloppe barre__inner">
    <a class="barre__logo" href="index.html" aria-label="SBS Create 3D — accueil"><img src="logo-blanc.png" alt="SBS Create 3D" width="520" height="358"></a>
    <nav class="menu" id="menu" aria-label="Navigation principale">
{menu}
      <a class="bouton bouton--led" href="contact.html">Demander un devis</a>
    </nav>
    <button class="burger" id="burger" type="button" aria-controls="menu" aria-expanded="false" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
  </div>
</header>

<main id="haut">
{corps}
</main>

<footer class="pied">
  <div class="enveloppe pied__inner">
    <img src="logo-blanc.png" alt="SBS Create 3D" width="520" height="358">
    <span>Conception · Impression 3D · Laser · Enseignes · Trophées — Ardennes</span>
    <span>Entreprise sœur : <a class="soeur-lien" href="https://www.polycomm.fr/" rel="noopener">Polycomm</a></span>
    <span>Mentions légales · <span class="a-remplir">[SIRET]</span></span>
    <span>Maquette v3 · 21/10/2026 · <a href="../">historique des versions</a></span>
  </div>
</footer>

<script src="commun.js" defer></script>
{'<script src="accueil.js" defer></script>' if accueil else ''}
</body>
</html>
"""


def tete_page(fil, label, titre, chapeau):
    return f"""  <section class="tete-page">
    <div class="enveloppe">
      <p class="fil"><a href="index.html">Accueil</a> / {fil}</p>
      <p class="label label--led dep">{label}</p>
      <h1 class="titre titre--xl dep" style="--i:1">{titre}</h1>
      <p class="chapeau dep" style="--i:2">{chapeau}</p>
    </div>
  </section>
"""


APPEL = """  <section class="appel">
    <div class="enveloppe">
      <div class="entete-bloc" style="margin: 0;">
        <p class="label">Un projet ?</p>
        <h2 class="titre titre--l">Parlons-en</h2>
      </div>
      <a class="bouton bouton--led" href="contact.html">Demander un devis <span class="fleche"></span></a>
    </div>
  </section>
"""

# ——— blocs repris de la v2
recit_html, _ = entre(V2, '  <section class="recit"', "  </section>\n")
recit_html = '  <section class="recit"' + recit_html + "  </section>\n"
ancienne_ouv = """            <h1 class="titre" style="margin-top: 22px;">Nous donnons forme à vos idées</h1>
            <p class="ouverture__sous">De l’idée <b>à la matière.</b></p>"""
nouvelle_ouv = """            <h1 class="titre slogan" style="margin-top: 22px;"><span>Donner forme</span><span>à l’idée,</span><span>la révéler</span><span class="lumiere">en impression 3D</span></h1>
            <p class="ouverture__sous">Jusqu’à <b>1 m³</b> d’un seul tenant, dans les Ardennes.</p>"""
recit_html = rep(recit_html, ancienne_ouv, nouvelle_ouv)
recit_html = recit_html.replace('href="#contact"', 'href="contact.html"').replace('href="#realisations"', 'href="realisations.html"')

atouts_html, _ = entre(V2, '  <section class="atouts"', "  </section>\n")
atouts_html = '  <section class="atouts"' + atouts_html + "  </section>\n"
grand_html, _ = entre(V2, '  <section class="grand"', "  </section>\n")
grand_html = '  <section class="grand"' + grand_html + "  </section>\n"
grand_html = rep(grand_html, '      <ul class="grand__capas" id="capas">',
                 '      <canvas class="grand__toile grand__toile--avant" id="cubeAvant" aria-hidden="true"></canvas>\n      <ul class="grand__capas" id="capas">')

ACTS = [
    ("impression-3d.html", "impression-provisoire.jpg", "01", "Impression 3D", "Prototypes, pièces techniques, grand format.", True, ""),
    ("laser.html", "trophee-sedan.jpg", "02", "Découpe &amp; gravure laser", "Trophées, plaques, objets personnalisés.", False, ' style="object-position: 50% 62%;"'),
    ("enseignes.html", "led-couleur.jpg", "03", "Enseignes &amp; signalétique", "Lettres en relief, caissons lumineux, totems.", False, ""),
]
cartes = []
for k, (f, img, num, nom, txt, prov, style) in enumerate(ACTS):
    cartes.append(f"""        <a class="activite dep" href="{f}" style="--i:{k}">
          <img class="activite__photo" src="{img}" alt="" loading="lazy" decoding="async"{style}>
          {'<span class="provisoire">Visuel provisoire · photo à fournir</span>' if prov else ''}
          <div class="activite__corps">
            <p class="label label--led">{num}</p>
            <h3 class="titre titre--m">{nom}</h3>
            <p>{txt}</p>
            <span class="activite__lien">Découvrir</span>
          </div>
        </a>""")
activites_html = f"""  <section class="bloc" id="activites">
    <div class="enveloppe">
      <div class="entete-bloc">
        <p class="label dep">Nos activités</p>
        <h2 class="titre titre--l dep" style="--i:1">Trois métiers, un seul atelier</h2>
      </div>
      <div class="activites">
{chr(10).join(cartes)}
      </div>
    </div>
  </section>
"""

# les huit réalisations de la v2, avec un identifiant pour pouvoir y pointer
reals_html, _ = entre(V2, '    <div class="reals" id="reals"', "\n    </div>\n  </section>")
reals_html = '    <div class="reals" id="reals"' + reals_html + "\n    </div>\n"
IDS = ["facade", "polymoulages", "led", "bazeilles", "sedan-sprint", "us-bazeilles", "disque-plexi", "disque-retroeclaire"]
morceaux = reals_html.split('      <article class="real">')
reals_html = morceaux[0] + "".join('      <article class="real" id="{}">'.format(IDS[i]) + m for i, m in enumerate(morceaux[1:]))
nav_reals, _ = entre(V2, '        <div class="reals__nav">', "        </div>\n      </div>\n    </div>\n    <div class=\"reals\"")
nav_reals = '        <div class="reals__nav">' + nav_reals + "        </div>\n"


def apercus(liste):
    out = []
    for k, (rid, img, label, nom) in enumerate(liste):
        if img:
            out.append(f"""        <a class="apercu dep" href="realisations.html#{rid}" style="--i:{k}">
          <img src="{img}" alt="" loading="lazy" decoding="async">
          <span class="apercu__txt"><span class="label label--led">{label}</span><span class="titre titre--m">{nom}</span></span>
        </a>""")
        else:
            out.append(f"""        <div class="apercu dep" style="--i:{k}">
          <figure class="a-fournir" style="margin:0;"><span><b>Photo à fournir</b>{nom}</span></figure>
        </div>""")
    return '      <div class="apercus">\n' + "\n".join(out) + "\n      </div>\n"


# ————————————————————————————————————————————— pages
acc = recit_html + atouts_html + activites_html + grand_html + f"""  <section class="bloc" id="realisations">
    <div class="enveloppe">
      <div class="bas-bloc">
        <div class="entete-bloc" style="margin: 0;">
          <p class="label dep">Réalisations</p>
          <h2 class="titre titre--l dep" style="--i:1">Sorties de l’atelier</h2>
        </div>
        <a class="bouton dep" href="realisations.html" style="--i:2">Toutes les réalisations <span class="fleche"></span></a>
      </div>
{apercus([("polymoulages", "polymoulages.jpg", "Enseigne", "Polymoulages"), ("sedan-sprint", "trophee-sedan.jpg", "Trophée", "Sedan Sprint Club"), ("disque-retroeclaire", "enseigne-sbs.jpg", "Enseigne lumineuse", "Disque rétroéclairé")])}    </div>
  </section>
""" + APPEL
(SORTIE / "index.html").write_text(page("index.html", "Accueil",
    "SBS Create 3D, Ardennes : conception, impression 3D jusqu'à 1 m³, découpe et gravure laser, enseignes et trophées.", acc, accueil=True), encoding="utf-8")


def page_activite(fichier, menu_nom, label, titre, chapeau, img, alt, provisoire, groupes, apercu_liste, style_img=""):
    grp = "\n".join(f'          <div class="fiche__groupe dep" style="--i:{k}"><h2>{h}</h2><p>{p}</p></div>' for k, (h, p) in enumerate(groupes))
    corps = tete_page(menu_nom, label, titre, chapeau) + f"""  <section class="bloc">
    <div class="enveloppe act">
      <figure class="act__photo dep"><img src="{img}" alt="{alt}" loading="lazy" decoding="async"{style_img}>{'<span class="provisoire">Visuel provisoire · photo à fournir</span>' if provisoire else ''}</figure>
      <div class="act__corps">
{grp}
        <div class="actions"><a class="bouton bouton--led" href="contact.html">Parler de mon projet <span class="fleche"></span></a><a class="bouton" href="realisations.html">Voir les réalisations</a></div>
      </div>
    </div>
  </section>
  <section class="bloc" style="padding-top: 0;">
    <div class="enveloppe">
      <div class="entete-bloc"><p class="label">Exemples</p><h2 class="titre titre--l">Sorti de l’atelier</h2></div>
{apercus(apercu_liste)}    </div>
  </section>
""" + APPEL
    (SORTIE / fichier).write_text(page(fichier, menu_nom, chapeau, corps), encoding="utf-8")


page_activite("impression-3d.html", "Impression 3D", "01 — Impression 3D", "Du prototype à la pièce finale",
              "Petites pièces de précision ou grand format jusqu’à 1 m³ d’un seul tenant, sans moule ni outillage.",
              "impression-provisoire.jpg", "", True,
              [("Petit format", "Prototypes, pièces mécaniques, outillage, objets de décoration."),
               ("Grand format, jusqu’à 1 m³", "Structures, maquettes d’architecture, mobilier, enseignes, pièces industrielles."),
               ("Conception", "Modélisation 3D et prototypage à partir d’un croquis, d’un plan ou d’une pièce existante.")],
              [("", "", "", "Une pièce imprimée en grand format"), ("", "", "", "Un prototype technique"), ("", "", "", "Une maquette d’architecture")])
page_activite("laser.html", "Laser", "02 — Découpe &amp; gravure laser", "La précision du faisceau",
              "Bois, acrylique, plastique, cuir, métal : une découpe nette, une gravure qui ne s’efface pas.",
              "trophee-sedan.jpg", "Trophée en acrylique bleu gravé, Sedan Sprint Club", False,
              [("Matières", "Bois, acrylique, plastique, cuir, métal."),
               ("Découpe", "Formes complexes, lettres, logos, pièces industrielles ou décoratives."),
               ("Gravure", "Trophées, plaques signalétiques, objets publicitaires, goodies personnalisés.")],
              [("sedan-sprint", "trophee-sedan.jpg", "Trophée", "Sedan Sprint Club"), ("us-bazeilles", "trophee-bazeilles.jpg", "Trophée", "U.S. Bazeilles"),
               ("disque-plexi", "disque-plexi.jpg", "Signalétique", "Disque plexi")], ' style="object-position: 50% 62%;"')
page_activite("enseignes.html", "Enseignes", "03 — Enseignes &amp; signalétique", "Être vu, de jour comme de nuit",
              "Lettres en relief, caissons lumineux, pré-enseignes : conçus, fabriqués et éclairés à l’atelier.",
              "led-couleur.jpg", "Lettrage rétroéclairé L.E.D avec néon bleu", False,
              [("Lettres en relief", "Lettres boîtier LED, lettres végétales, éclairées ou rétroéclairées."),
               ("Caissons &amp; drapeaux", "Simple ou double face, éclairage LED."),
               ("Pré-enseignes", "Panneaux, caissons, totems.")],
              [("polymoulages", "polymoulages.jpg", "Enseigne", "Polymoulages"), ("bazeilles", "bazeilles.jpg", "Enseigne lumineuse", "Bazeilles"),
               ("facade", "facade.jpg", "Enseigne", "SBS Create 3D")])

real_page = tete_page("Réalisations", "Réalisations", "Sorties de l’atelier",
                      "Enseignes, trophées, signalétique : une réalisation par écran, avec ce qui a été fabriqué et comment.") + f"""  <section class="bloc" style="padding-top: clamp(32px, 4vw, 56px);">
    <div class="enveloppe">
      <div class="reals__haut" style="justify-content: flex-end;">
{nav_reals}      </div>
    </div>
{reals_html}  </section>
""" + APPEL
(SORTIE / "realisations.html").write_text(page("realisations.html", "Réalisations", "Les réalisations de SBS Create 3D : enseignes, trophées, signalétique.", real_page), encoding="utf-8")

atelier_bloc, _ = entre(V2, '      <div class="mosaique dep" style="--i:3">', "    </div>\n  </section>")
atelier_page = tete_page("L’atelier", "L’atelier", "Fabrication de précision",
                         "Conception, impression, laser et montage sous le même toit, dans les Ardennes.") + f"""  <section class="bloc">
    <div class="enveloppe">
      <div class="mosaique dep">{atelier_bloc}    </div>
  </section>
""" + APPEL
(SORTIE / "atelier.html").write_text(page("atelier.html", "L’atelier", "L'atelier de SBS Create 3D dans les Ardennes.", atelier_page), encoding="utf-8")

contact_bloc, _ = entre(V2, '    <div class="enveloppe contact">', "\n  </section>\n\n</main>")
contact_bloc = '    <div class="enveloppe contact">' + contact_bloc
contact_bloc = rep(contact_bloc, """          <div><dt>Réseaux</dt><dd><a href="https://www.instagram.com/sbs_create_3D" rel="noopener">Instagram</a> · Facebook — sbs_create_3D</dd></div>
        </dl>""", """          <div><dt>Réseaux</dt><dd><a href="https://www.instagram.com/sbs_create_3D" rel="noopener">Instagram</a> · Facebook — sbs_create_3D</dd></div>
        </dl>
        <div class="soeur dep" style="--i:4">
          <p class="label label--led">Entreprise sœur</p>
          <p><b style="color: var(--encre);">Polycomm</b> fabrique à Bazeilles des jardinières, du mobilier et des accessoires en polyester.</p>
          <a class="bouton" href="https://www.polycomm.fr/" rel="noopener">Découvrir Polycomm <span class="fleche"></span></a>
        </div>""")
contact_bloc = contact_bloc.replace('<h2 class="titre titre--l dep" style="--i:1">Parlons de votre projet</h2>',
                                    '<h1 class="titre titre--l dep" style="--i:1">Parlons de votre projet</h1>')
contact_page = f"""  <section class="bloc" id="contact" style="padding-top: calc(var(--haut-barre) + clamp(48px, 7vw, 96px));">
{contact_bloc}
  </section>
"""
(SORTIE / "contact.html").write_text(page("contact.html", "Contact", "Contacter SBS Create 3D : devis, impression 3D, laser, enseignes.", contact_page), encoding="utf-8")

print("v3 générée :", sorted(p.name for p in SORTIE.glob("*.html")))
