# NOVANOD 2.5.20 — console d'administration

La console administrateur reçoit :
- un en-tête mobile centré dont le badge ne déborde plus ;
- une analyse du dernier audit GitHub Actions (Playwright + Lighthouse) sur le bouton principal ;
- des graphiques de scores Lighthouse mobile/ordinateur et un anneau de répartition Playwright ;
- une gestion des lignes TablesDB (lecture, création, modification, suppression) ;
- un moniteur des fonctions Appwrite et de leurs exécutions.

## Fonction Appwrite associée

Utiliser l'archive de fonction NOVANOD 2.5.20 fournie séparément. Les rapports, passkeys et challenges utilisent maintenant TablesDB. Ajouter le scope Appwrite `functions.read` pour le nouveau moniteur, en plus des scopes déjà nécessaires aux opérations activées.

La base configurée par `NOVA_TABLES_DATABASE_ID` doit contenir les tables `nova_reports`, `nova_webauthn_credentials`, `nova_webauthn_challenges` et `nova_security_events`. Les tables privées doivent activer Row Security et ne pas avoir de permission de lecture au niveau table.

Les graphiques utilisent les données Lighthouse et Playwright réellement reçues. Aucune géolocalisation GPS n'est inventée : une position ne s'affiche que si un événement contient des coordonnées valides et leur source.

## Validation

La mise à jour du site statique ne déploie pas automatiquement la fonction Appwrite. Déployer séparément l'archive 2.5.20 puis tester depuis la console admin avec un audit GitHub récent.
