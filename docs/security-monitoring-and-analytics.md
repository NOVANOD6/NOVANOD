# NOVANOD — sécurité, alertes et données statistiques

## Portée préparée

Cette branche ajoute à la console administrateur :
- une courbe X/Y construite uniquement à partir de points numériques structurés renvoyés par le backend ;
- un histogramme construit uniquement à partir de mesures numériques structurées ;
- un emplacement pour les coordonnées géographiques des événements, avec validation des limites latitude/longitude ;
- la police Tahoma pour les réponses de Gemini, Groq et la synthèse de l'assistant.

Le rendu ne tente pas d'extraire des chiffres dans du texte libre généré par une IA. Si le backend ne renvoie pas de données structurées, l'interface affiche explicitement qu'il n'y a pas assez de données.

## Contrat de données attendu par le tableau de bord

Exemple de forme attendue pour les graphiques (les valeurs ci-dessous sont fictives et servent uniquement à documenter le format ; elles ne sont pas injectées dans l'application) :

```json
{
  "chartData": {
    "points": [
      { "x": "2026-11-20", "y": 12 },
      { "x": "2026-11-21", "y": 18 }
    ],
    "metrics": [
      { "label": "Erreurs", "value": 12 },
      { "label": "Alertes", "value": 3 }
    ]
  }
}
```

Pour les coordonnées géographiques, le backend peut renvoyer `geoCoordinates` avec `label`, `latitude`, `longitude` et `accuracy`, ou `securityEvents` avec `location.latitude` et `location.longitude`.

**Important :** une localisation déduite d'une adresse IP est approximative et ne doit jamais être présentée comme une position GPS précise. Il faut conserver la source, l'incertitude et une durée de rétention limitée. Ne pas collecter de géolocalisation précise des visiteurs sans nécessité, information claire et base légale appropriée.

## Architecture de surveillance requise avant activation des alertes

Le dépôt contient l'identifiant de la fonction Appwrite existante, mais la source complète de cette fonction n'est pas présente dans les fichiers inspectés de la branche. Le collecteur ne doit donc pas être remplacé ou modifié à l'aveugle.

L'intégration backend devra :
1. lire les journaux/audits Appwrite accessibles pour Authentication, Databases, Storage et Functions ;
2. normaliser les événements avec date UTC, catégorie, sévérité, ressource et identifiant d'incident ;
3. dédupliquer les incidents et appliquer des seuils configurables afin d'éviter les rafales de notifications ;
4. envoyer une notification Push Appwrite aux appareils administrateurs abonnés ;
5. envoyer un e-mail aux deux comptes administrateurs approuvés, via un fournisseur e-mail configuré ;
6. conserver une trace des alertes envoyées et des échecs de livraison ;
7. exposer à la console un endpoint administrateur authentifié pour consulter les incidents et leurs coordonnées approximatives lorsqu'elles existent.

Les identifiants administrateurs autorisés restent :
- `6af9b373003931cb00bd`
- `6af9a471001fa1cac5b9`

Aucun secret API, mot de passe, jeton Push ou clé fournisseur ne doit être placé dans le navigateur ou dans ce dépôt. Les secrets devront être ajoutés aux variables d'environnement de la fonction Appwrite.

## Limites de détection à respecter

- Les journaux Appwrite ne représentent pas nécessairement toutes les requêtes HTTP reçues par GitHub Pages.
- Les échecs de connexion, les refus d'autorisation, les erreurs de fonction et les modifications de ressources doivent être vérifiés selon les événements réellement disponibles dans le projet.
- Pour détecter les scans, bots et attaques au niveau HTTP sur le site statique GitHub Pages, un service périphérique/WAF (par exemple Cloudflare, si le domaine est placé derrière lui) doit fournir ses propres événements. Les journaux Appwrite seuls ne suffisent pas.
- La disponibilité des journaux et leur durée de rétention dépendent du plan et de la configuration Appwrite.
- Une API key doit recevoir uniquement les scopes nécessaires au collecteur et à l'envoi des messages. Ne pas accorder `keys.write`, `functions.write` ou des droits globaux par défaut.

## Validation avant mise en production

- Vérifier la source de la fonction Appwrite existante et ses tests.
- Ajouter le collecteur sans supprimer les actions métier existantes.
- Configurer et tester séparément les fournisseurs Push et e-mail.
- Tester les alertes avec des événements de test explicitement marqués, puis vérifier déduplication, seuils et journal d'envoi.
- Vérifier que les coordonnées sont sourcées et approximatives.
- Vérifier que les deux administrateurs reçoivent bien les deux canaux.
- Confirmer que les graphiques s'affichent à partir de vrais résultats du backend et restent vides avec un message explicite sinon.
