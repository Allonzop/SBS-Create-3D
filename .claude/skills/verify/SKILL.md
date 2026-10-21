---
name: verify
description: Vérifier une modification du site SBS Create 3D en le faisant tourner dans un vrai navigateur (Playwright) — rendu, défilement du récit, console, débordement.
---

# Vérifier le site SBS Create 3D

Site statique, aucun build. La version en cours est dans `versions/<vN>/` ; on ne touche jamais aux versions déjà montrées (v1, v2, racine).

## Lancer
```bash
python3 -m http.server 8123 --bind 127.0.0.1 &      # depuis la racine du dépôt
# puis http://127.0.0.1:8123/versions/v3/index.html
```
Playwright est installé globalement : `NODE_PATH=$(npm root -g) node script.js`. Chromium est déjà là (ne pas lancer `playwright install`).

## Ce qu'il faut regarder (règles du dépôt)
- 1440×900 (ordinateur) et 390×844 en `isMobile`/`hasTouch`/`deviceScaleFactor: 2` (iPhone) : zéro erreur console, `scrollWidth === clientWidth`.
- Les 7 pages : index, impression-3d, laser, enseignes, realisations, atelier, contact.
- L'accueil : récit en 5 étapes (canvas `#toile`) et cube 1 m³ (`#cube` + `#cubeAvant`, tête d'impression).

## Piloter le récit
- Défiler **à la molette** (`page.mouse.wheel(0, 120)` + ~650 ms) : c'est ce que fait un visiteur. `scrollTo` saute les transitions.
- Progression lisible sans toucher au code : somme des `--r` des `.frise__rail` (0 → 5). Valeur figée sur plusieurs crans = palier.
- Paliers attendus (centre, en part du défilement de `#recit`) : 0,178 · 0,353 · 0,547 · 0,789 · 0,979 (tableau `COURSE` de `accueil.js`). Cube : plein à partir de 0,8 de `#grand-format`.
- Attendre ~2,5 s après le chargement : le filaire se dessine en intro.

## Pièges
- Les hauteurs du récit sont en `svh` : redimensionner change la position de chaque étape.
- Écrans bas (≤ 520 px, téléphone en paysage) : mise en page « ordinateur » compactée, noms de frise masqués.
- `prefers-reduced-motion` : tout s'affiche en pile, sans animation (tester avec `reducedMotion: 'reduce'`).
- Détecteur impeccable en navigateur : root sans sandbox → lanceur `exec <chromium> --no-sandbox "$@"` dans `IMPECCABLE_BROWSER`.
