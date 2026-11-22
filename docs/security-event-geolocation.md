# Géolocalisation des événements de sécurité — NOVANOD 2.5.20

La table `nova_security_events` stocke l'événement en JSON dans la colonne texte `event`. Le champ optionnel `location` accepte :
- `latitude` : nombre entre -90 et 90 ;
- `longitude` : nombre entre -180 et 180 ;
- `source` : source déclarée et obligatoire quand les coordonnées sont fournies ;
- `accuracy` : précision optionnelle non négative ;
- `city`, `region`, `country` : libellés facultatifs.

Exemple d'événement transmis par un détecteur autorisé :

```json
{
  "severity": "medium",
  "source": "client-consented-device",
  "event": "Nouvelle connexion",
  "summary": "Connexion enregistrée avec consentement",
  "location": {
    "latitude": 6.37,
    "longitude": 2.39,
    "city": "Cotonou",
    "country": "Bénin",
    "accuracy": 100,
    "source": "device-consented"
  }
}
```

Les coordonnées sont facultatives. Ne collecte pas la position d'un utilisateur sans consentement clair. Une IP ne doit jamais être présentée comme une position GPS. L'espace administrateur trace les points valides sur un graphique latitude/longitude et les classe par gravité, zone et source.
