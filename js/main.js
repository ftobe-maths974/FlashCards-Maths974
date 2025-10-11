/**
 * Fichier principal de l'application (le "chef d'orchestre").
 * Il initialise l'application, importe les modules et attache les écouteurs d'événements.
 */

// --- Import des modules ---
import { appState, initializeDeck, resetApp, resetDeckProgress, saveCurrentDeckProgress } from './state.js';
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
    
    // 1. On calcule et sauvegarde la nouvelle date de révision (pour les prochains jours)
    processAnswer(card, quality);

    // 2. Si la carte a été jugée difficile, on la remet dans la file d'attente de la session
    if (quality <= 2) { // Qualité 1 (À revoir) ou 2 (Difficile)
        // On retire la carte de sa position actuelle...
        const failedCard = appState.dueCards.splice(appState.currentCardIndex, 1)[0];
        
        // ...et on la réinsère plus loin dans le deck (entre 2 et 5 positions plus loin)
        const remainingCount = appState.dueCards.length - appState.currentCardIndex;
        const insertOffset = Math.floor(Math.random() * 4) + 2; // Un décalage aléatoire
        const newIndex = Math.min(appState.currentCardIndex + insertOffset, appState.dueCards.length);
        
        appState.dueCards.splice(newIndex, 0, failedCard);
        
        // On ne change pas l'index, car on veut passer à la carte qui a pris la place de celle qu'on a déplacée.
        
    } else {
        // Si la réponse était bonne, on passe simplement à la carte suivante
        appState.currentCardIndex++;
    }

    // 3. On décide quoi afficher ensuite
    if (appState.currentCardIndex < appState.dueCards.length) {
        showCard();
    } else {
        render(); // La session est finie
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
        resetApp(); // resetApp sauvegarde maintenant automatiquement la progression
        render();   
    });
    DOM.quitSessionBtn.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir quitter ? Votre progression sera sauvegardée.")) {
            resetApp(); // resetApp sauvegarde la progression
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
    // Dans js/main.js, ajoutez ceci à la fonction setupEventListeners

    // ... (à la fin de la fonction setupEventListeners)
    DOM.resetDeckBtn.addEventListener('click', () => {
        if (appState.deckPath) {
            resetDeckProgress(appState.deckPath, appState.deckName);
            // Si le deck actuel a été réinitialisé, on retourne à l'accueil
            if (appState.deckName === null) {
                render();
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
