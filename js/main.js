/**
 * Fichier principal de l'application (le "chef d'orchestre").
 * Il initialise l'application, importe les modules et attache les écouteurs d'événements.
 */

// --- Import des modules ---
import { getDecksWithStatus, appState, initializeDeck, resetApp, resetDeckProgress, saveCurrentDeckProgress } from './state.js';
import { DOM, render, buildTreeMenu, promptStudyMode, toggleTheme, applySavedTheme, flipCard, transitionToNextCard } from './ui.js';
import { fetchDeckLibrary, fetchDeckFile } from './api.js';
import { processAnswer } from './srs.js';

/**
 * Charge la bibliothèque, calcule le statut des decks et affiche le menu.
 * Cette fonction sera maintenant appelée au démarrage ET en quittant une session.
 */
async function buildAndShowLibrary() {
    let manifest = await fetchDeckLibrary();
    manifest = await getDecksWithStatus(manifest);
    // On vide l'ancien menu avant de reconstruire
    DOM.deckTreeContainer.innerHTML = ''; 
    buildTreeMenu(DOM.deckTreeContainer, manifest, handleDeckSelection);
}


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

    if (deckToLoad && deckToLoad.info) {
        if (deckToLoad.type === 'permanent') {
            const deckData = await fetchDeckFile(deckToLoad.info.path);
            if (deckData && deckData.length > 0) {
                // Étape 1 : On hydrate le deck (contenu + progression)
                initializeDeck(deckData, deckToLoad.info.nom, deckToLoad.info.path, selectedMode);
                // Étape 2 : On commande à l'interface de se mettre à jour
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
 * @param {number} quality La qualité de la réponse (1-4).
 */
function handleCardAnswer(quality) {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    // ÉTAPE 1 : On traite la logique de la réponse.
    processAnswer(card, quality);
    
    // ÉTAPE 2 : On gère la file d'attente des cartes difficiles.
    if (quality <= 2) {
        const failedCard = appState.dueCards.splice(appState.currentCardIndex, 1)[0];
        const insertOffset = Math.floor(Math.random() * 4) + 2;
        const newIndex = Math.min(appState.currentCardIndex + insertOffset, appState.dueCards.length);
        appState.dueCards.splice(newIndex, 0, failedCard);
    } else {
        appState.currentCardIndex++;
    }

    // ÉTAPE 3 : On demande à l'interface de gérer la transition visuelle.
    if (appState.currentCardIndex < appState.dueCards.length) {
        transitionToNextCard(); // On appelle la nouvelle fonction de l'UI
    } else {
        render(); // La session est finie
    }
}

function setupEventListeners() {
    // Thème
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Navigation et session
    DOM.quitSessionBtn.addEventListener('click', () => {
        resetApp();
        render();
        buildAndShowLibrary();
    });

    // Modale de choix de mode
    DOM.startSessionBtn.addEventListener('click', startNewSession);
    DOM.studyModeModal.addEventListener('click', (e) => {
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

    // Listener pour le bouton de réinitialisation
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
    await buildAndShowLibrary(); // Appel initial
}

// --- Lancement de l'application ---
init();
