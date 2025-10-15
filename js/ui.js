/**
 * Ce module gère toutes les manipulations du DOM (l'interface utilisateur).
 */

// 1. Importez les constantes
import { appState } from './state.js';
import { DOM_IDS, THEME_CLASSES, CSS_CLASSES, STORAGE_KEYS } from './constants.js';



// 2. Modifiez l'objet DOM pour utiliser les constantes
export const DOM = {
    appTitle: document.getElementById(DOM_IDS.appTitle),
    welcomeScreen: document.getElementById(DOM_IDS.welcomeScreen),
    appScreen: document.getElementById(DOM_IDS.appScreen),
    errorContainer: document.getElementById(DOM_IDS.errorContainer),
    cardContainer: document.getElementById(DOM_IDS.cardContainer),
    cardFront: document.getElementById(DOM_IDS.cardFront),
    cardBack: document.getElementById(DOM_IDS.cardBack),
    answerButtons: document.getElementById(DOM_IDS.answerButtons),
    deckNameEl: document.getElementById(DOM_IDS.deckName),
    deckProgressEl: document.getElementById(DOM_IDS.deckProgress),
    noCardsMessage: document.getElementById(DOM_IDS.noCardsMessage),
    themeToggle: document.getElementById(DOM_IDS.themeToggle),
    quitSessionBtn: document.getElementById(DOM_IDS.quitSessionBtn),
    studyModeModal: document.getElementById(DOM_IDS.studyModeModal),
    startSessionBtn: document.getElementById(DOM_IDS.startSessionBtn),
    deckTreeContainer: document.getElementById(DOM_IDS.deckTree),
    controls: document.getElementById(DOM_IDS.controls),
    resetDeckBtn: document.getElementById(DOM_IDS.resetDeckBtn)
};

/**
 * Fonction de rendu principale. Met à jour l'UI en fonction de l'état actuel.
 */
// DANS LE FICHIER js/ui.js, REMPLACEZ LA FONCTION RENDER EXISTANTE :

// Dans js/ui.js

export function render() {
    console.log("5. Appel de render()");
    if (!appState.deckName) {
        console.log("-> Affichage de l'écran d'accueil.");
        DOM.welcomeScreen.classList.remove(CSS_CLASSES.hidden);
        DOM.appScreen.classList.add(CSS_CLASSES.hidden);
    } else {
        console.log("-> Affichage de l'écran de session.");
        DOM.welcomeScreen.classList.add(CSS_CLASSES.hidden);
        DOM.appScreen.classList.remove(CSS_CLASSES.hidden);
        
        const today = new Date().toISOString().split('T')[0];
        appState.dueCards = appState.cards.filter(card => card.prochaine_revision <= today);
        console.log(`6. Cartes à réviser trouvées :`, appState.dueCards.length);
        
        // J'enlève temporairement le mélange pour le débogage.
        // shuffleArray(appState.dueCards);
        
        DOM.deckNameEl.textContent = `${appState.deckName} (Mode: ${appState.studyMode})`;
        DOM.controls.classList.remove(CSS_CLASSES.hidden);

        console.log("CHECKPOINT : Juste avant le 'if', dueCards.length =", appState.dueCards.length);

        if (appState.dueCards.length > 0) {
            console.log("7. BLOC IF : Correct, il y a des cartes. Préparation de la première.");
            appState.currentCardIndex = 0;
            DOM.cardContainer.classList.remove(CSS_CLASSES.hidden);
            DOM.noCardsMessage.classList.add(CSS_CLASSES.hidden);
            
            prepareNextCard();
            
            const cardInner = DOM.cardContainer.querySelector('.card-inner');
            cardInner.style.opacity = '1';

        } else {
            console.log("7. BLOC ELSE : Incorrect, aucune carte à réviser n'a été trouvée.");
            DOM.deckProgressEl.textContent = `À réviser: 0`;
            DOM.cardContainer.classList.add(CSS_CLASSES.hidden);
            DOM.answerButtons.classList.add(CSS_CLASSES.hidden);
            DOM.noCardsMessage.classList.remove(CSS_CLASSES.hidden);
        }
    }
}

/**
 * Gère l'animation de retournement de la carte.
 */
export function flipCard() {
    // On ne retourne la carte que si elle est du côté question
    if (appState.dueCards.length > 0 && !DOM.cardContainer.classList.contains(CSS_CLASSES.flipped)) {
        DOM.cardContainer.classList.add(CSS_CLASSES.flipped);
        DOM.answerButtons.classList.remove(CSS_CLASSES.hidden);
        
        // On met le focus sur le bouton "Correct"
        setTimeout(() => {
            DOM.answerButtons.querySelector('#' + DOM_IDS.buttons.good).focus();
        }, 10);
    }
}

/**
 * Orchestre la transition visuelle entre deux cartes.
 */
export function transitionToNextCard() {
    const cardInner = DOM.cardContainer.querySelector('.card-inner');

    // Étape 1 : On fait disparaître la carte et les boutons
    DOM.answerButtons.classList.add(CSS_CLASSES.hidden);
    cardInner.style.opacity = '0';
    
    // Étape 2 : On attend la fin de l'animation de disparition
    setTimeout(() => {
        // La carte est maintenant invisible

        // Étape 3 : On prépare le contenu de la nouvelle carte
        prepareNextCard(); 
        
        // Étape 4 : On retourne la carte SANS animation
        cardInner.style.transition = 'none'; 
        DOM.cardContainer.classList.remove(CSS_CLASSES.flipped);
        cardInner.offsetHeight; // Force le navigateur à appliquer le changement
        
        // Étape 5 : On réactive les animations et on fait réapparaître la carte
        cardInner.style.transition = 'transform 0.6s, opacity 0.2s';
        cardInner.style.opacity = '1';

    }, 200); // Doit correspondre à la durée de la transition d'opacité
}


/**
 * Remplit la carte avec le contenu de la question/réponse actuelle.
 * Ne gère plus d'animations, seulement le remplissage.
 */
// DANS LE FICHIER js/ui.js, remplacez la fonction showCard existante par celle-ci

export function prepareNextCard() {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    // ▼▼▼ LA LIGNE MANQUANTE EST ICI ▼▼▼
    const cardInner = DOM.cardContainer.querySelector('.card-inner');

    const remainingCards = appState.dueCards.length - appState.currentCardIndex;
    DOM.deckProgressEl.textContent = `À réviser: ${remainingCards}`;

    DOM.cardContainer.focus({ preventScroll: true });

    // Remplit le contenu de la carte
    let questionText = card.Question;
    let answerText = card.Réponse;
    let showFrontFirst = (appState.studyMode === 'recto') || (appState.studyMode === 'aleatoire' && Math.random() < 0.5);

    DOM.cardFront.innerHTML = window.marked.parse(showFrontFirst ? questionText : answerText || '');
    DOM.cardBack.innerHTML = window.marked.parse(showFrontFirst ? answerText : questionText || '');

    // Met à jour le rendu des formules mathématiques
    if (window.renderMathInElement) {
        const options = { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]};
        window.renderMathInElement(DOM.cardFront, options);
        window.renderMathInElement(DOM.cardBack, options);
    }
    
    // Ajuste la hauteur de la carte
    adjustCardHeight();
}


/**
 * Ajuste dynamiquement la hauteur de la carte en fonction de son contenu.
 */
export function adjustCardHeight() {
    DOM.cardContainer.style.height = 'auto';
    const frontHeight = DOM.cardFront.scrollHeight;
    const backHeight = DOM.cardBack.scrollHeight;
    const maxHeight = Math.max(frontHeight, backHeight);
    DOM.cardContainer.style.height = `${Math.max(maxHeight, 200)}px`;
}

/**
 * Construit le menu en arborescence de la bibliothèque de decks.
 */
export function buildTreeMenu(parentElement, items, onFileClick, filterActive = false) {
    let visibleItemCount = 0;

    for (const item of items) {
        // Condition de filtrage : on saute les decks qui ne sont pas à réviser si le filtre est actif
        if (filterActive && item.type === 'fichier' && item.deckStatus !== 'due') {
            continue;
        }

        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = item.nom;
        span.setAttribute('role', 'button'); // Indique que c'est un élément cliquable
        span.setAttribute('tabindex', '0');   // Le rend focusable au clavier


        // On n'affiche l'indicateur que si le deck a été commencé
        if (item.type === 'fichier' && item.deckStatus !== 'new') {
            const indicator = document.createElement('i');
            indicator.className = 'deck-status';
            if (item.deckStatus === 'due') {
                indicator.textContent = '🔔';
                indicator.title = 'Des cartes sont à réviser !';
            } else { // 'up-to-date'
                indicator.textContent = '✅';
                indicator.title = 'Vous êtes à jour !';
            }
            li.appendChild(indicator);
        }
        
        li.appendChild(span);

        if (item.type === 'dossier') {
            li.className = 'deck-folder collapsed';
            span.setAttribute('aria-expanded', 'false'); // Indique que le dossier est fermé
            const subUl = document.createElement('ul');
            li.appendChild(subUl);
            span.onclick = () => {
                li.classList.toggle('collapsed');
                // Met à jour l'état pour les lecteurs d'écran
                const isExpanded = !li.classList.contains('collapsed');
                span.setAttribute('aria-expanded', isExpanded);
            };
            
            if (item.contenu && buildTreeMenu(subUl, item.contenu, onFileClick, filterActive) > 0) {
                parentElement.appendChild(li);
                visibleItemCount++;
            }
        } else { // type 'fichier'
            li.className = 'deck-file';
            span.onclick = () => onFileClick(item);
            // Permet l'activation avec la touche "Entrée"
            span.onkeydown = (e) => {
                if (e.code === 'Enter' || e.code === 'Space') {
                    onFileClick(item);
                }
            };
            parentElement.appendChild(li);
            visibleItemCount++;
        }
    }
    return visibleItemCount;
}

/**
 * Affiche la fenêtre modale pour le choix du mode d'étude.
 */
export function promptStudyMode() {
    DOM.studyModeModal.classList.remove('hidden');
}

/**
 * Gère le changement de thème (clair/sombre).
 */
export function toggleTheme() {
    document.body.classList.toggle(THEME_CLASSES.dark);
    const isDark = document.body.classList.contains(THEME_CLASSES.dark);
    DOM.themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
}

/**
 * Applique le thème sauvegardé au chargement de la page.
 */
export function applySavedTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (savedTheme === 'dark') {
        document.body.classList.add(THEME_CLASSES.dark);
        DOM.themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove(THEME_CLASSES.dark);
        DOM.themeToggle.textContent = '🌙';
    }
}

/**
 * Affiche un message d'erreur dans l'interface.
 * @param {string} message Le message à afficher.
 */
export function displayError(message) {
    DOM.errorContainer.textContent = message;
    DOM.errorContainer.classList.remove('hidden');
}

/**
 * Efface le message d'erreur de l'interface.
 */
export function clearError() {
    if (!DOM.errorContainer.classList.contains('hidden')) {
        DOM.errorContainer.classList.add('hidden');
        DOM.errorContainer.textContent = '';
    }
}


