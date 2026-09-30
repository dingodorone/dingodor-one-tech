# Guide caméra — version préparée le 30 septembre 2026

Cette version remplace uniquement `guide-camera.html`. Le logo du site reste celui de `logo-maison.svg`.

## Ce qui change

- Questionnaire de cinq étapes par zone, retour et modification des réponses.
- Alimentation, réseau, abonnement et fonctions indispensables utilisés comme critères éliminatoires.
- Un choix principal et jusqu’à deux alternatives compatibles, avec limites, accessoires et sources fabricant.
- Configuration successive de plusieurs zones ; marque obligatoire possible pour conserver la même application.
- Budget par prix repère et calcul manuel du coût à l’achat et sur trois ans, abonnements compris.
- Affichage adapté au téléphone, navigation clavier, zoom du navigateur autorisé et impression.
- Introduction raccourcie, logo conservé, absence de sollicitation de notifications pendant le questionnaire.

## Catalogue et affiliation

27 références sont utilisées pour les recommandations automatiques. La sélection inclut des nouveautés par rapport à l’ancien guide : Tapo C220, C225, C320WS, C520WS, C410 KIT, C665G KIT, D210, Reolink Altas PT Ultra, Aqara G5 Pro Wi-Fi et eufy SoloCam S340.

Les 40 ensembles de liens du catalogue historique sont conservés dans `data/camera-affiliate-archive.json`. Certaines anciennes fiches trop génériques ou non revérifiées ne participent plus au classement automatique. Le guide ne prétend pas couvrir toutes les références ni garantir une réponse à chaque combinaison de contraintes.

Tous les liens Amazon utilisent les identifiants demandés :

- France : `dingodor-21` sur `amazon.fr`.
- Belgique : `dingodor00e-21` sur `amazon.com.be`.

Les anciennes URL de recherche sont conservées pour les références reprises. Les nouvelles références utilisent le même mécanisme avec les mêmes identifiants. Les liens SwitchBot conservés gardent leurs paramètres d’affiliation. Aucun lien n’intervient dans le score des modèles.

Les liens Amazon sont des recherches de modèles, pas des offres ou ASIN garantis. Le marchand peut afficher plusieurs variantes : le visiteur doit vérifier la référence et le pack.

## Prix et limites

Les prix numériques sont des prix repères relevés sur les boutiques fabricant le 30/09/2026, parfois promotionnels. Ils ne sont ni des prix Amazon en direct, ni une garantie de disponibilité, ni un prix belge garanti. Sans relevé fiable, la fiche affiche « Prix à vérifier ». Avec un plafond, ces références sont exclues et la limite est expliquée au visiteur. Le plafond porte sur la caméra ou le kit, hors accessoires et livraison ; le calculateur sert à chiffrer ensuite le total.

Les données inconnues ne satisfont pas une fonction obligatoire. Les capacités dépendantes d’une version matérielle sont signalées. En particulier :

- RLC-811A : zoom optique motorisé, mais pas de rotation PTZ.
- Argus PT Ultra et Tapo C210 : suivi automatique dépendant de la version matérielle, donc pas garanti dans le filtre.
- Altas PT Ultra : possibilité de continu sur batterie, avec contrainte d’autonomie et de recharge.
- C665G KIT : AOV à faible cadence hors événements, distinct d’une vidéo fluide permanente.
- Tapo D235 et Aqara G4 : continu seulement dans la configuration filaire adaptée.
- Apple Home et HomeKit Secure Video sont distingués ; les conditions iCloud et concentrateur sont rappelées pour les modèles concernés.
- RTSP/ONVIF confirme un flux vidéo exploitable, pas toutes les fonctions de chaque intégration.

Les sources sont accessibles dans chaque fiche. Aucun test matériel en laboratoire n’est revendiqué.

## Vérifications

Exécuter `node tests/test_camera_guide.cjs` depuis ce dossier.

20 tests ciblés couvrent les critères essentiels, le budget, les variantes, les liens affiliés et la syntaxe. Une matrice de 1 152 configurations contrôle les incompatibilités d’emplacement, d’alimentation, de réseau, d’enregistrement et de stockage. Les parcours extérieur et animaux, le retour, le calculateur ainsi que les liens France/Belgique ont été vérifiés dans le navigateur. L’affichage mobile a été inspecté à 390 pixels de large.

## Installation

1. Remplacer `guide-camera.html` à la racine du site par ce fichier.
2. Garder `logo-maison.svg` et `favicon.svg` existants à la racine.
3. Conserver les tests et l’archive des liens pour les futures modifications.

La page contient son style, son catalogue et sa logique : aucun serveur, paquet à installer ou clé API ne sont nécessaires. Les réponses restent uniquement dans la page ouverte et sont effacées lors du rechargement.

Cette livraison ne modifie pas encore le site public. La proposition GitHub permet de relire le changement avant sa mise en ligne.

