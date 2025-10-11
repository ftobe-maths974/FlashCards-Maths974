/**
 * Fichier principal de l'application (le "chef d'orchestre").
 * Il initialise l'application, importe les modules et attache les écouteurs d'événements.
 */

// --- Import des modules ---
import { appState, initializeDeck, resetApp, saveCardProgress, resetDeckProgress } from './state.js';
import { DOM, render, buildTreeMenu, promptStudyMode, toggleTheme, applySavedTheme, flipCard } from './ui.js';
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
    processAnswer(card, quality);
    saveCardProgress(card);

    // On passe à la carte suivante
    appState.currentCardIndex++;

    // S'il reste des cartes, on affiche la suivante. Sinon, on rafraîchit pour afficher le message de fin.
    if (appState.currentCardIndex < appState.dueCards.length) {
        showCard();
    } else {
        render();
    }
}

/**
 * Met en place tous les écouteurs d'événements de l'application.
 */
function setupEventListeners() {
    // Thème
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Navigation et session
    DOM.backToLibraryBtn.addEventListener('click', () => {
        resetApp(); // Réinitialise l'état en mémoire
        render();   // Met à jour l'affichage
    });
    DOM.quitSessionBtn.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir quitter ? La progression sur les cartes déjà vues est sauvegardée.")) {
            resetApp();
            render();
        }
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
}

/**
 * Fonction d'initialisation de l'application.
 */
async function init() {
    setupEventListeners();
    applySavedTheme();
    
    const manifest = await fetchDeckLibrary();
    buildTreeMenu(DOM.deckTreeContainer, manifest, handleDeckSelection);
    
    // On ne charge plus d'état au démarrage, l'application commence toujours sur l'accueil.
}

// --- Lancement de l'application ---
init();
