/**
 * Ce module gère toutes les manipulations du DOM (l'interface utilisateur).
 */

import { appState } from './state.js';

// --- Références aux éléments du DOM ---
export const DOM = {
    welcomeScreen: document.getElementById('welcome-screen'),
    appScreen: document.getElementById('app-screen'),
    cardContainer: document.getElementById('card-container'),
    cardFront: document.getElementById('card-front'),
    cardBack: document.getElementById('card-back'),
    answerButtons: document.getElementById('answer-buttons'),
    deckNameEl: document.getElementById('deck-name'),
    deckProgressEl: document.getElementById('deck-progress'),
    noCardsMessage: document.getElementById('no-cards-message'),
    themeToggle: document.getElementById('theme-toggle'),
    quitSessionBtn: document.getElementById('btn-quit-session'),
    studyModeModal: document.getElementById('study-mode-modal'),
    startSessionBtn: document.getElementById('start-session-btn'),
    deckTreeContainer: document.getElementById('deck-tree'),
    controls: document.getElementById('controls-container'),
    resetDeckBtn: document.getElementById('btn-reset-deck')
};

/**
 * Fonction de rendu principale. Met à jour l'UI en fonction de l'état actuel.
 */
// DANS LE FICHIER js/ui.js, REMPLACEZ LA FONCTION RENDER EXISTANTE :

export function render() {
    if (!appState.deckName) {
        // --- Écran d'accueil ---
        DOM.welcomeScreen.classList.remove('hidden');
        DOM.appScreen.classList.add('hidden');
    } else {
        // --- Écran de session d'étude ---
        DOM.welcomeScreen.classList.add('hidden');
        DOM.appScreen.classList.remove('hidden');
        
        const today = new Date().toISOString().split('T')[0];
        appState.dueCards = appState.cards.filter(card => card.prochaine_revision <= today);
        
        DOM.deckNameEl.textContent = `${appState.deckName} (Mode: ${appState.studyMode})`;
        DOM.controls.classList.remove('hidden');

        if (appState.dueCards.length > 0) {
            // S'il y a des cartes à réviser
            appState.currentCardIndex = 0;
            DOM.cardContainer.classList.remove('hidden');
            DOM.noCardsMessage.classList.add('hidden');
            
            // --- CORRECTION APPLIQUÉE ICI ---
            // On prépare la première carte...
            prepareNextCard(); 
            // ...et on s'assure qu'elle est bien visible.
            const cardInner = DOM.cardContainer.querySelector('.card-inner');
            cardInner.style.opacity = '1';
            // --- FIN DE LA CORRECTION ---

        } else {
            // S'il n'y a AUCUNE carte à réviser pour aujourd'hui
            DOM.deckProgressEl.textContent = `À réviser: 0`;
            DOM.cardContainer.classList.add('hidden');
            DOM.answerButtons.classList.add('hidden');
            DOM.noCardsMessage.classList.remove('hidden');
        }
    }
}

/**
 * Gère l'animation de retournement de la carte.
 */
export function flipCard() {
    if (appState.dueCards.length > 0) {
        DOM.cardContainer.classList.add('is-flipped');
        DOM.answerButtons.classList.remove('hidden');
    }
}

/**
 * Orchestre la transition visuelle entre deux cartes. C'est la solution au bug visuel.
 */
export function transitionToNextCard() {
    const cardInner = DOM.cardContainer.querySelector('.card-inner');

    // ÉTAPE 1 : On cache les boutons et on fait disparaître la carte actuelle.
    DOM.answerButtons.classList.add('hidden');
    cardInner.style.opacity = '0';
    
    // ÉTAPE 2 : On attend la fin de l'animation de disparition.
    setTimeout(() => {
        // --- La carte est maintenant invisible ---

        // ÉTAPE 3 : On la retourne côté "question" SANS animation.
        cardInner.style.transition = 'none';
        DOM.cardContainer.classList.remove('is-flipped');
        
        // On force le navigateur à appliquer ce changement immédiatement.
        cardInner.offsetHeight; 

        // ÉTAPE 4 : On affiche la nouvelle carte (qui remplit la carte vide).
        showCard(); 
        
        // ÉTAPE 5 : On réactive les animations et on fait réapparaître le tout.
        cardInner.style.transition = 'transform 0.6s, opacity 0.2s';
        cardInner.style.opacity = '1';

    }, 200); // Durée de l'animation d'opacité
}

/**
 * Remplit la carte avec le contenu de la question/réponse actuelle.
 * Ne gère plus d'animations, seulement le remplissage.
 */
// DANS LE FICHIER js/ui.js, remplacez la fonction showCard existante par celle-ci

/**
 * Prépare la carte suivante (remplit le contenu, ajuste la hauteur) PENDANT qu'elle est invisible.
 * Ne gère aucune animation de visibilité.
 */
export function prepareNextCard() {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    const cardInner = DOM.cardContainer.querySelector('.card-inner');
    
    // Met à jour le compteur.
    const remainingCards = appState.dueCards.length - appState.currentCardIndex;
    DOM.deckProgressEl.textContent = `À réviser: ${remainingCards}`;

    // Prépare la carte sans animation.
    cardInner.style.transition = 'none';
    DOM.cardContainer.classList.remove('is-flipped');
    
    // Remplit le contenu.
    let questionText = card.Question;
    let answerText = card.Réponse;
    let showFrontFirst = (appState.studyMode === 'recto') || (appState.studyMode === 'aleatoire' && Math.random() < 0.5);

    DOM.cardFront.innerHTML = window.marked.parse(showFrontFirst ? questionText : answerText || '');
    DOM.cardBack.innerHTML = window.marked.parse(showFrontFirst ? answerText : questionText || '');

    if (window.renderMathInElement) {
        const options = { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]};
        window.renderMathInElement(DOM.cardFront, options);
        window.renderMathInElement(DOM.cardBack, options);
    }
    adjustCardHeight();

    // On force le navigateur à appliquer les changements.
    cardInner.offsetHeight; 
    
    // On réactive les transitions pour les futures interactions (flip, et le fondu entrant).
    cardInner.style.transition = 'transform 0.6s, opacity 0.2s';
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
            const subUl = document.createElement('ul');
            li.appendChild(subUl);
            span.onclick = () => li.classList.toggle('collapsed');
            
            // Si le sous-menu a des éléments visibles, on affiche le dossier
            if (item.contenu && buildTreeMenu(subUl, item.contenu, onFileClick, filterActive) > 0) {
                parentElement.appendChild(li);
                visibleItemCount++;
            }
        } else { // type 'fichier'
            li.className = 'deck-file';
            span.onclick = () => onFileClick(item);
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
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    DOM.themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * Applique le thème sauvegardé au chargement de la page.
 */
export function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        DOM.themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        DOM.themeToggle.textContent = '🌙';
    }
}
