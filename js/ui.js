/**
 * Ce module gère toutes les manipulations du DOM (l'interface utilisateur).
 * Il lit l'état depuis le module `state` pour mettre à jour l'affichage.
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
    //backToLibraryBtn: document.getElementById('btn-back-to-library'),
    quitSessionBtn: document.getElementById('btn-quit-session'),
    studyModeModal: document.getElementById('study-mode-modal'),
    startSessionBtn: document.getElementById('start-session-btn'),
    deckTreeContainer: document.getElementById('deck-tree'),
    resetDeckBtn: document.getElementById('btn-reset-deck')
};

/**
 * Fonction de rendu principale. Met à jour l'UI en fonction de l'état actuel.
 */
export function render() {
    if (!appState.deckName) {
        DOM.welcomeScreen.classList.remove('hidden');
        DOM.appScreen.classList.add('hidden');
    } else {
        DOM.welcomeScreen.classList.add('hidden');
        DOM.appScreen.classList.remove('hidden');
        
        const today = new Date().toISOString().split('T')[0];
        appState.dueCards = appState.cards.filter(card => card.prochaine_revision <= today);
        
        DOM.deckNameEl.textContent = `${appState.deckName} (Mode: ${appState.studyMode})`;
        const dueCount = appState.dueCards.length;
        DOM.deckProgressEl.textContent = `À réviser: ${dueCount}`;
        
        if (dueCount > 0) {
            appState.currentCardIndex = 0;
            showCard();
            DOM.noCardsMessage.classList.add('hidden');
        } else {
            DOM.cardContainer.classList.add('hidden');
            DOM.answerButtons.classList.add('hidden');
            DOM.noCardsMessage.classList.remove('hidden');
        }
    }
}

/**
 * Affiche le contenu de la carte actuelle et lance le rendu LaTeX.
 */
// DANS LE FICHIER js/ui.js

export function showCard() {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    const cardInner = DOM.cardContainer.querySelector('.card-inner');

    // --- ÉTAPE 1 : On préserve la hauteur actuelle et on cache le contenu ---
    const currentHeight = DOM.cardContainer.offsetHeight;
    DOM.cardContainer.style.minHeight = `${currentHeight}px`; // Empêche le conteneur de s'effondrer
    cardInner.style.opacity = '0'; // On ne cache que le contenu, pas le conteneur

    // --- On met à jour le compteur ---
    const remainingCards = appState.dueCards.length - appState.currentCardIndex;
    DOM.deckProgressEl.textContent = `À réviser: ${remainingCards}`;
    
    // On attend la fin de la transition de fondu (on peut utiliser un délai très court)
    setTimeout(() => {
        // --- ÉTAPE 2 : On met à jour le contenu pendant qu'il est invisible ---
        DOM.cardContainer.classList.remove('is-flipped');

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

        // On ajuste la hauteur du conteneur pour la nouvelle carte (toujours invisible)
        adjustCardHeight();

        // --- ÉTAPE 3 : On réaffiche le nouveau contenu ---
        cardInner.style.opacity = '1';
        
    }, 200); // Un court délai pour l'animation de fondu
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
 * @param {HTMLElement} parentElement L'élément UL parent.
 * @param {Array<Object>} items Les items (dossiers/fichiers) à ajouter.
 * @param {Function} onFileClick Le callback à exécuter lors d'un clic sur un fichier.
 */
export function buildTreeMenu(parentElement, items, onFileClick) {
    for (const item of items) {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = item.nom;
        li.appendChild(span);

        if (item.type === 'dossier') {
            li.className = 'deck-folder collapsed';
            const subUl = document.createElement('ul');
            li.appendChild(subUl);
            span.onclick = () => li.classList.toggle('collapsed');
            if (item.contenu && item.contenu.length > 0) {
                buildTreeMenu(subUl, item.contenu, onFileClick);
            }
        } else { // type 'fichier'
            li.className = 'deck-file';
            span.onclick = () => onFileClick(item);
        }
        parentElement.appendChild(li);
    }
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
