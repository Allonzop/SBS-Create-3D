(function () {
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
