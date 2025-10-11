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
        
        // On s'assure que les boutons de contrôle sont TOUJOURS visibles sur cet écran.
        DOM.controls.classList.remove('hidden');

        if (appState.dueCards.length > 0) {
            // S'il y a des cartes à réviser
            appState.currentCardIndex = 0;
            DOM.cardContainer.classList.remove('hidden');
            DOM.noCardsMessage.classList.add('hidden');
            showCard(); // Affiche la première carte et le compteur
        } else {
            // S'il n'y a AUCUNE carte à réviser pour aujourd'hui
            DOM.deckProgressEl.textContent = `À réviser: 0`;
            DOM.cardContainer.classList.add('hidden');
            DOM.answerButtons.classList.add('hidden');
            DOM.noCardsMessage.classList.remove('hidden');
            // Les boutons de contrôle ("Réinitialiser", "Sauver") restent visibles.
        }
    }
}

/**
 * Affiche le contenu de la carte actuelle et lance le rendu LaTeX.
 */
export function showCard() {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    const cardInner = DOM.cardContainer.querySelector('.card-inner');

    // ÉTAPE 1 : On fait disparaître le contenu actuel (fondu).
    cardInner.style.opacity = '0';
    
    // On met à jour le compteur pendant que la carte disparaît.
    const remainingCards = appState.dueCards.length - appState.currentCardIndex;
    DOM.deckProgressEl.textContent = `À réviser: ${remainingCards}`;
    
    // On attend la fin de l'animation de disparition.
    setTimeout(() => {
        // --- LA CARTE EST MAINTENANT INVISIBLE ---

        // ÉTAPE 2 : On VIDE complètement le contenu des deux faces.
        DOM.cardFront.innerHTML = '';
        DOM.cardBack.innerHTML = '';

        // ÉTAPE 3 : On coupe les animations et on FLIP la carte (vide) à l'endroit.
        cardInner.style.transition = 'none';
        DOM.cardContainer.classList.remove('is-flipped');
        
        // On force le navigateur à prendre en compte ces changements immédiatement.
        cardInner.offsetHeight; 

        // ÉTAPE 4 : On REMPLIT la carte (toujours invisible) avec le nouveau contenu.
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

        // ÉTAPE 5 : On réactive les animations et on fait réapparaître la carte propre et à l'endroit.
        cardInner.style.transition = 'transform 0.6s, opacity 0.2s';
        cardInner.style.opacity = '1';
        
    }, 200); // Durée de l'animation d'opacité
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

        if (item.type === 'fichier') {
            const indicator = document.createElement('i');
            indicator.className = 'deck-status';
            if (item.hasDueCards) {
                indicator.textContent = '🔔'; // Ou '🔴'
                indicator.title = 'Des cartes sont à réviser !';
            } else {
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
