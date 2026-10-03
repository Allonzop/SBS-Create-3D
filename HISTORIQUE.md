# Historique des versions — SBS Create 3D

Chaque version de la maquette est conservée telle qu'elle a été montrée, dans son propre dossier, avec ses images et ses polices (aucune version ne dépend d'une autre).

| Version | Date | Dossier | Ce qui change |
|---|---|---|---|
| v2 | 03/10/2026 | `versions/v2/` | DA sombre / industrielle d'après le retour de Servan du 02/10 : ouverture en maillage filaire, 5 étapes avec frise, menu complet, 3 activités avec fiches, section 1 m³ en 3D, réalisations en grand, atelier (photos à fournir), formulaire de devis. |
| v1 | 24/09/2026 | `versions/v1/` | Scrollytelling « d'une idée à l'enseigne allumée », 7 étapes, galerie horizontale. Version envoyée à Servan (avec le correctif téléphone). |

- Page de navigation entre les versions : `versions/index.html` (en ligne : `/versions/`).
- La racine du site (`index.html`) est la version que Servan a reçue. Elle ne change que sur décision explicite ; avant de la remplacer, la version en place est déjà archivée dans `versions/`.
- Repère git : la v1 correspond au commit `733cf6b` (24/09), la v2 au commit qui crée `versions/v2/`.

## Règle pour la suite

Nouvelle version = nouveau dossier `versions/vN/` copié depuis la précédente, une ligne dans ce tableau, une entrée dans `versions/index.html`. On ne retouche jamais une version déjà montrée.
