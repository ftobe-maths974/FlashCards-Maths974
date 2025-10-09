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
    backToLibraryBtn: document.getElementById('btn-back-to-library'),
    quitSessionBtn: document.getElementById('btn-quit-session'),
    studyModeModal: document.getElementById('study-mode-modal'),
    startSessionBtn: document.getElementById('start-session-btn'),
    deckTreeContainer: document.getElementById('deck-tree')
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

        DOM.deckNameEl.textContent = `${appState.deckName} (Mode: ${appState.studyMode})`;
        const dueCount = appState.dueCards.length;
        DOM.deckProgressEl.textContent = `À réviser: ${dueCount}`;
        
        if (dueCount > 0) {
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
export function showCard() {
    const card = appState.dueCards[appState.currentCardIndex];
    DOM.cardContainer.classList.remove('hidden', 'is-flipped');
    
    let questionText = card.Question;
    let answerText = card.Réponse;
    let showFrontFirst;

    if (appState.studyMode === 'recto') {
        showFrontFirst = true;
    } else if (appState.studyMode === 'verso') {
        showFrontFirst = false;
    } else { // aleatoire
        showFrontFirst = Math.random() < 0.5;
    }

    if (showFrontFirst) {
        DOM.cardFront.innerHTML = marked.parse(questionText || '');
        DOM.cardBack.innerHTML = marked.parse(answerText || '');
    } else {
        DOM.cardFront.innerHTML = marked.parse(answerText || '');
        DOM.cardBack.innerHTML = marked.parse(questionText || '');
    }

    if (window.renderMathInElement) {
        const options = { delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ]};
        window.renderMathInElement(DOM.cardFront, options);
        window.renderMathInElement(DOM.cardBack, options);
    }

    DOM.answerButtons.classList.add('hidden');
    adjustCardHeight();
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
                // CORRECTION ICI : on passe bien le onFileClick à l'appel récursif
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
