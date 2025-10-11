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
export function showCard() {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return; // Sécurité si aucune carte n'est disponible

    // 1. On cache la carte actuelle avec une transition de fondu
    DOM.cardContainer.style.opacity = '0';

    // 2. On attend la fin de la transition (300ms) pour manipuler la carte
    setTimeout(() => {
        // --- Pendant que la carte est invisible ---

        // On désactive temporairement les transitions pour que les changements soient instantanés
        DOM.cardContainer.style.transition = 'none';
        
        // On retourne la carte sur sa face avant (question)
        DOM.cardContainer.classList.remove('is-flipped');

        // On met à jour le contenu avec la nouvelle carte
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
            DOM.cardFront.innerHTML = window.marked.parse(questionText || '');
            DOM.cardBack.innerHTML = window.marked.parse(answerText || '');
        } else {
            DOM.cardFront.innerHTML = window.marked.parse(answerText || '');
            DOM.cardBack.innerHTML = window.marked.parse(questionText || '');
        }

        // On applique le rendu LaTeX
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

        // On utilise requestAnimationFrame pour s'assurer que le navigateur a bien traité
        // les changements précédents avant de réactiver les transitions et de réafficher la carte.
        requestAnimationFrame(() => {
            // On réactive les transitions (y compris celle pour l'opacité)
            DOM.cardContainer.style.transition = 'height 0.3s ease-in-out, opacity 0.3s ease, transform 0.6s';
            // 3. On fait réapparaître la carte avec la nouvelle question
            DOM.cardContainer.classList.remove('hidden');
            DOM.cardContainer.style.opacity = '1';
        });

    }, 300); // Cette durée doit correspondre à la transition CSS de l'opacité
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
