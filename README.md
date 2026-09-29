# Dingodor One Tech

Site statique officiel de Dingodor One Tech, prévu pour GitHub Pages et le domaine `dingodoronetech.eu.org`.

Le site présente les guides, tests, vidéos, codes promo et liens vers les articles publiés sur WordPress.

## Écrire un article depuis GitHub

Le bouton [Rédiger un article](https://dingodoronetech.eu.org/rediger.html) ouvre un formulaire simple avec un titre, un résumé, une image et le texte. Le formulaire crée automatiquement un brouillon dans la branche `brouillons`, sans publier l’article sur WordPress. Après relecture, le brouillon peut être préparé puis publié volontairement avec le workflow décrit ci-dessous.

Les brouillons se trouvent **uniquement sur la branche `brouillons`**, dans le dossier `brouillons/`. Ils ne sont jamais chargés par le site, les listes, le sitemap, les flux WordPress ou les notifications. La branche `main` reste la branche publique. Ne changez pas la source GitHub Pages vers `brouillons` et ne fusionnez jamais cette branche entière dans `main`.

Attention : ce dépôt GitHub est public. Les brouillons sont exclus du site, mais restent lisibles sur GitHub. Ce système ne convient pas aux informations confidentielles.

1. [Ouvrir le dossier des brouillons](https://github.com/dingodorone/dingodor-one-tech/tree/brouillons/brouillons).
2. Ouvrir `modele.html` et copier son contenu. Choisir **Add file → Create new file**, nommer le fichier `mon-test.html` et coller le modèle.
3. Remplacer le titre, le résumé et le texte. Garder `"status": "draft"`. Le texte utilise quelques balises simples : `<p>` pour un paragraphe, `<h2>` pour un sous-titre, `<a href="https://…">` pour un lien. Utiliser des adresses d’images publiques complètes.
4. Cliquer sur **Commit changes** et enregistrer sur **brouillons**. Pour reprendre, ouvrir le fichier puis cliquer sur le crayon. Aucune de ces sauvegardes ne publie l’article.

## Publier volontairement un article

1. Une fois relu, remplacer `"status": "draft"` par `"status": "ready"` dans le fichier, toujours sur la branche `brouillons`.
2. Ouvrir **Actions → Préparer la publication d'un article GitHub → Run workflow**. Choisir la branche **main** et saisir le nom sans `.html` (ex. `mon-test`).
3. Le workflow copie uniquement cet article dans une proposition de publication (**Pull request**). Relire les fichiers proposés puis cliquer sur **Merge pull request** pour publier. Tant que cette proposition n’est pas fusionnée, l’article reste absent du site.
4. Après le déploiement GitHub Pages, l’article se trouve dans `/publications/mon-test.html`, dans une section dédiée de la page Articles et dans le sitemap. Les listes et recherches WordPress continuent de fonctionner séparément. Le flux WordPress et les notifications Webpushr ne diffusent pas les articles GitHub.

Si GitHub interdit au workflow d’ouvrir une proposition, sa page de résumé fournit un lien pour la créer manuellement depuis la branche préparée. On peut aussi autoriser la création des pull requests dans **Settings → Actions → General → Workflow permissions**.

Les modèles et autres brouillons ne sont jamais copiés. L’original reste sur `brouillons` après publication ; une deuxième publication du même nom est refusée. Pour corriger un article publié, modifier sa page dans `publications/` avec une nouvelle pull request (et le titre/résumé dans `data/github-articles.json` et `articles.html` si nécessaire).

## Vérification

`python3 -m unittest discover -s tests -v` vérifie le refus des brouillons, les noms de fichier, la publication explicite et la conservation des articles GitHub dans le sitemap lors des mises à jour WordPress. Le contrôle GitHub refuse les dossiers de brouillons dans les propositions vers `main` ; pour imposer ce contrôle avant toute fusion, sélectionner « Vérifier la séparation des brouillons / check » dans les règles de protection de `main`.

Aucun brouillon SwitchBot n’est publié par la mise en place de cette infrastructure.

## Publications programmées WordPress

Le workflow « Pages et sitemap des articles » vérifie WordPress toutes les quinze minutes environ (GitHub peut retarder les tâches planifiées). Il prépare les pages, les enregistre seules, demande explicitement leur déploiement GitHub Pages puis vérifie le contenu public des pages nouvelles ou modifiées. Il publie ensuite seulement `data/published-posts.json` et le sitemap, dans un second déploiement. En cas d’échec, les anciens index restent en place ; le prochain passage reprend la vérification.

Le site et l’application utilisent cet index validé, y compris pour la recherche et la pagination. Les anciennes pages sont conservées pour que les liens déjà partagés et les listes en cache restent utilisables. Les notifications lisent l’index public et revérifient la page avant chaque envoi ; un échec ne fait pas avancer leur repère. Les brouillons GitHub restent soumis au processus de validation séparé décrit ci-dessus.

Le 29 septembre 2026, l’article WordPress 21254, programmé à 06:30 Europe/Paris, était annoncé avant la création de sa page. Son URL `/posts/21254-21254.html` a été conservée. Le champ titre WordPress étant vide, les listes reprennent le titre déjà présent dans le premier H1 du contenu.
