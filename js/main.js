/**
 * Fichier principal de l'application (le "chef d'orchestre").
 * Il initialise l'application, importe les modules et attache les écouteurs d'événements.
 */

// --- Import des modules ---
import { appState, initializeDeck, resetApp, resetDeckProgress, getDecksWithStatus } from './state.js';
import { DOM, render, buildTreeMenu, promptStudyMode, toggleTheme, applySavedTheme, flipCard, prepareNextCard } from './ui.js';
import { fetchDeckLibrary, fetchDeckFile } from './api.js';
import { processAnswer } from './srs.js';

// --- Gestionnaires d'événements ---

let deckToLoad = null; // Stockage temporaire des infos du deck à charger

/**
 * Charge la bibliothèque, calcule le statut des decks et affiche le menu.
 * Cette fonction est appelée au démarrage ET en quittant une session pour tout mettre à jour.
 */
async function buildAndShowLibrary() {
    let manifest = await fetchDeckLibrary();
    manifest = await getDecksWithStatus(manifest);
    DOM.deckTreeContainer.innerHTML = ''; // On vide l'ancien menu
    buildTreeMenu(DOM.deckTreeContainer, manifest, handleDeckSelection);
}

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

    if (deckToLoad && deckToLoad.info) {
        if (deckToLoad.type === 'permanent') {
            const deckData = await fetchDeckFile(deckToLoad.info.path);
            if (deckData && deckData.length > 0) {
                initializeDeck(deckData, deckToLoad.info.nom, deckToLoad.info.path, selectedMode);
                render();
            } else {
                alert('Ce deck est vide ou n\'a pas pu être lu.');
            }
        }
        deckToLoad = null;
    }
}

/**
 * Gère la réponse de l'utilisateur à une carte.
 */
function handleCardAnswer(quality) {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    DOM.answerButtons.classList.add('hidden');
    const cardInner = DOM.cardContainer.querySelector('.card-inner');
    cardInner.style.opacity = '0';

    setTimeout(() => {
        processAnswer(card, quality);
        
        if (quality <= 2) {
            const failedCard = appState.dueCards.splice(appState.currentCardIndex, 1)[0];
            const insertOffset = Math.floor(Math.random() * 4) + 2;
            const newIndex = Math.min(appState.currentCardIndex + insertOffset, appState.dueCards.length);
            appState.dueCards.splice(newIndex, 0, failedCard);
        } else {
            appState.currentCardIndex++;
        }

        if (appState.currentCardIndex < appState.dueCards.length) {
            prepareNextCard();
            cardInner.style.opacity = '1';
        } else {
            render();
        }
    }, 200);
}

/**
 * Met en place tous les écouteurs d'événements de l'application.
 */
function setupEventListeners() {
    DOM.themeToggle.addEventListener('click', toggleTheme);

    DOM.quitSessionBtn.addEventListener('click', () => {
        resetApp();
        render();
        buildAndShowLibrary();
    });

    DOM.startSessionBtn.addEventListener('click', startNewSession);
    DOM.studyModeModal.addEventListener('click', (e) => {
        if (e.target === DOM.studyModeModal) {
            DOM.studyModeModal.classList.add('hidden');
        }
    });

    DOM.cardContainer.addEventListener('click', flipCard);
    DOM.answerButtons.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const qualityMap = { 'btn-again': 1, 'btn-hard': 2, 'btn-good': 3, 'btn-easy': 4 };
        handleCardAnswer(qualityMap[e.target.id]);
    });
    
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

    DOM.resetDeckBtn.addEventListener('click', () => {
        if (appState.deckPath) {
            resetDeckProgress(appState.deckPath, appState.deckName);
            if (appState.deckName === null) {
                render();
                buildAndShowLibrary();
            }
        }
    });
}

/**
 * Fonction d'initialisation de l'application.
 */
async function init() {
    setupEventListeners();
    applySavedTheme();
    await buildAndShowLibrary();
}

// --- Lancement de l'application ---
init();
