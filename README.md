# FlashCards-Maths974

[![Démo en ligne](https://img.shields.io/badge/D%C3%A9mo-En%20Ligne-brightgreen)](https://ftobe-maths974.github.io/FlashCards-Maths974/index.html)

Une application web de flashcards simple et efficace conçue pour les étudiants, basée sur la méthode scientifiquement prouvée de la **répétition espacée (SRS)**.

## ✨ Fonctionnalités

* **Algorithme SRS** : Optimise la mémorisation à long terme en adaptant le calendrier de révision de chaque carte.
* **Bibliothèque de Decks Dynamique** : Charge une arborescence de decks depuis un simple fichier `manifest.json`, rendant l'ajout de contenu facile.
* **Support Markdown & LaTeX** : Créez des cartes riches avec du formatage et des formules mathématiques complexes grâce aux librairies `Marked.js` et `KaTeX`.
* **100% Côté Client** : Pas de serveur, pas de base de données. L'application fonctionne entièrement dans le navigateur et sauvegarde votre progression localement (`localStorage`).
* **Thème Sombre** : Pour des sessions d'étude plus confortables le soir.
* **Code Modulaire** : Écrit en JavaScript moderne (ES Modules) pour une meilleure organisation et maintenabilité.

## 🧠 Le Principe de la Répétition Espacée (SRS)

Plutôt que de réviser un concept en boucle jusqu'à l'épuisement (ce qu'on appelle le "bachotage" ou "cramming"), la méthode de la répétition espacée consiste à réviser une information juste au moment où notre cerveau est sur le point de l'oublier.

Chaque fois que vous répondez correctement à une carte, l'intervalle avant sa prochaine apparition augmente. Si vous vous trompez, l'intervalle est raccourci. Ce processus renforce activement les connexions neuronales et ancre les connaissances dans la mémoire à long terme de manière beaucoup plus efficace.

L'algorithme utilisé dans ce projet s'inspire de **SM-2 (SuperMemo 2)** et des principes fondamentaux de **"l'effet d'espacement"** (*spacing effect*). Cette approche est validée par de nombreuses recherches en sciences cognitives, notamment par l'étude de Nate Kornell sur laquelle ce projet s'appuie.

> 📄 **Référence scientifique :** [Kornell, N. (2009). *Optimising Learning Using Flashcards: Spacing Is More Effective Than Cramming*. Applied Cognitive Psychology.](https://github.com/ftobe-maths974/FlashCards-Maths974/blob/main/Kornell.2009b.pdf)

## 🚀 Utilisation

Aucune installation n'est requise !

* **Accédez à la [démo en ligne](https://ftobe-maths974.github.io/FlashCards-Maths974/index.html)**.
* Ou clonez ce dépôt et ouvrez le fichier `index.html` dans votre navigateur.

## 📂 Structure du Projet

Le code est organisé de manière modulaire pour une meilleure clarté :

* `index.html`: La structure de la page.
* `css/style.css`: Les styles de l'application.
* `js/`: Contient la logique de l'application.
    * `main.js`: Le point d'entrée, qui orchestre les autres modules.
    * `ui.js`: Gère toutes les interactions avec le DOM (affichage, mises à jour de l'interface).
    * `state.js`: Gère l'état de l'application et la sauvegarde de la progression.
    * `srs.js`: Contient la logique pure de l'algorithme de répétition espacée.
    * `api.js`: Gère le chargement des fichiers de decks (`manifest.json`, `.md`).
    * `utils.js`: Fonctions utilitaires (ex: parsing Markdown).
* `decks/`: Contient tous les decks de cartes au format Markdown (`.md`) et le fichier `manifest.json`.

## 📜 Licence

Ce projet est distribué sous la **Licence MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
