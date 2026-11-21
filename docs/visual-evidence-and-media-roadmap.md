# NOVANOD — preuves visuelles des tests et feuille de route médias

## Preuves visuelles pour les analyses et tests

La configuration Playwright conserve déjà :
- une capture d'écran lors d'un échec (`screenshot: only-on-failure`) ;
- une vidéo lors d'un échec (`video: retain-on-failure`) ;
- une trace lors d'un échec (`trace: retain-on-failure`).

Le rapport HTML Playwright est maintenant généré dans `artifacts/playwright-report`, en plus du rapport JSON. Les captures, vidéos et traces associées aux tests échoués peuvent être consultées dans ce rapport lorsque les tests ont effectivement été exécutés.

**Limite actuelle :** cela ne transmet pas encore automatiquement les photos par Push ou e-mail. Pour cela, le workflow CI doit publier les artefacts de test, puis un service backend authentifié doit les stocker dans Appwrite Storage et transmettre aux administrateurs un lien temporaire sécurisé. Ne pas envoyer une capture brute ou un lien public permanent. Le branchement à la fonction Appwrite existante attend l'accès à son code source afin de ne pas casser les actions actuelles.

Les captures doivent montrer la page, le viewport et l'étape du test en échec ; les informations sensibles (mots de passe, données personnelles, jetons) doivent être masquées avant stockage ou envoi.

## Médias dans les pages publiques — reporté

Fonction demandée mais volontairement non activée maintenant :
- téléverser des images dans certaines sections ;
- téléverser des vidéos dans certaines sections ;
- choisir la section cible depuis l'administration ;
- prévisualiser, remplacer, réordonner et retirer un média ;
- stocker les fichiers dans Appwrite Storage avec contrôles de taille/type et permissions.

Aucun bouton d'upload ni stockage média n'est ajouté à cette livraison. Cette évolution sera planifiée séparément, avec choix des emplacements précis et des limites de fichiers.

## En-tête et logo

- La console administrateur reprend le style centré du logo utilisé sur `index.html`, avec le libellé « ADMINISTRATEUR ».
- L'ombre portée derrière le logo public de `index.html` est supprimée.
