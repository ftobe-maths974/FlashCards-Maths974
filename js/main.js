/**
 * Fichier principal de l'application (le "chef d'orchestre").
 * Il initialise l'application, importe les modules et attache les écouteurs d'événements.
 */

// --- Import des modules ---
import { appState, loadState, resetApp, initializeDeck, saveState } from './state.js';
import { DOM, render, buildTreeMenu, promptStudyMode, toggleTheme, applySavedTheme, flipCard, showCard } from './ui.js';
import { fetchDeckLibrary, fetchDeckFile } from './api.js';
import { processAnswer } from './srs.js';

// --- Gestionnaires d'événements ---

let deckToLoad = null; // Stockage temporaire des infos du deck à charger

/**
 * Gère le clic sur un fichier de deck dans l'arborescence.
 * @param {object} deckInfo Les informations du deck depuis le manifest.
 */
function handleDeckSelection(deckInfo) {
    deckToLoad = { type: 'permanent', info: deckInfo };
    promptStudyMode();
}

/**
 * Lance une nouvelle session d'étude après le choix du mode.
 */
async function startNewSession() {
    const selectedMode = document.querySelector('input[name="study-mode"]:checked').value;
    DOM.studyModeModal.classList.add('hidden');

    if (deckToLoad) {
        if (deckToLoad.type === 'permanent') {
            const deckData = await fetchDeckFile(deckToLoad.info.path);
            if (deckData) {
                initializeDeck(deckData, deckToLoad.info.nom, selectedMode);
            }
        }
        deckToLoad = null;
    }
}

/**
 * Gère la réponse de l'utilisateur à une carte.
 * @param {number} quality La qualité de la réponse (1-4).
 */
function handleCardAnswer(quality) {
    const card = appState.dueCards[appState.currentCardIndex];
    processAnswer(card, quality); // Met à jour la carte via le module SRS
    saveState();
    render();
}

/**
 * Met en place tous les écouteurs d'événements de l'application.
 */
function setupEventListeners() {
    // Thème
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Navigation et session
    DOM.backToLibraryBtn.addEventListener('click', resetApp);
    DOM.quitSessionBtn.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir quitter ? La progression sur les cartes déjà vues est sauvegardée.")) {
            resetApp();
        }
    });

    // Modale de choix de mode
    DOM.startSessionBtn.addEventListener('click', startNewSession);
    DOM.studyModeModal.addEventListener('click', (e) => {
        // Permet de fermer la modale en cliquant à l'extérieur
        if (e.target === DOM.studyModeModal) {
            DOM.studyModeModal.classList.add('hidden');
        }
    });

    // Logique de la carte
    DOM.cardContainer.addEventListener('click', flipCard);
    DOM.answerButtons.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const qualityMap = { 'btn-again': 1, 'btn-hard': 2, 'btn-good': 3, 'btn-easy': 4 };
        handleCardAnswer(qualityMap[e.target.id]);
    });

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        if (appState.deckName && appState.dueCards.length > 0) {
            if (e.code === 'Space' && !DOM.cardContainer.classList.contains('is-flipped')) {
                e.preventDefault();
                flipCard();
            } else if (DOM.cardContainer.classList.contains('is-flipped')) {
                const qualityMap = { 'Digit1': 1, 'Digit2': 2, 'Digit3': 3, 'Digit4': 4 };
                if (qualityMap[e.code]) {
                    handleCardAnswer(qualityMap[e.code]);
                }
            }
        }
    });
}

/**
 * Fonction d'initialisation de l'application.
 */
async function init() {
    applySavedTheme();
    setupEventListeners();
    
    const manifest = await fetchDeckLibrary();
    buildTreeMenu(DOM.deckTreeContainer, manifest, handleDeckSelection);
    
    if (loadState()) {
        render();
    }
}

// --- Lancement de l'application ---
init();
