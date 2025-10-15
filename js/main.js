/**
 * Fichier principal de l'application (le "chef d'orchestre").
 * Il initialise l'application, importe les modules et attache les écouteurs d'événements.
 */

// --- Import des modules ---
import { DOM_IDS, CSS_CLASSES } from './constants.js';
import { appState, initializeDeck, resetApp, resetDeckProgress, getDecksWithStatus } from './state.js';
import { DOM, render, buildTreeMenu, promptStudyMode, toggleTheme, applySavedTheme, flipCard, prepareNextCard, displayError, clearError, transitionToNextCard } from './ui.js';
import { fetchDeckLibrary, fetchDeckFile } from './api.js';
import { processAnswer } from './srs.js';

const deckFilterSwitch = document.getElementById(DOM_IDS.filterSwitch);

// --- Gestionnaires d'événements ---

let deckToLoad = null; // Stockage temporaire des infos du deck à charger

/**
 * Charge la bibliothèque, calcule le statut des decks et affiche le menu.
 * Cette fonction est appelée au démarrage ET en quittant une session pour tout mettre à jour.
 */
async function buildAndShowLibrary() {
    clearError();
    let manifest = await fetchDeckLibrary();
    manifest = await getDecksWithStatus(manifest);
    DOM.deckTreeContainer.innerHTML = '';
    
    // On vérifie si le filtre est actif et on le passe à la fonction
    const filterIsActive = deckFilterSwitch.checked;
    buildTreeMenu(DOM.deckTreeContainer, manifest, handleDeckSelection, filterIsActive);
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
    console.log("--- Début de la session ---");
    const selectedMode = document.querySelector('input[name="study-mode"]:checked').value;
    DOM.studyModeModal.classList.add(CSS_CLASSES.hidden);

    if (deckToLoad && deckToLoad.info) {
        try {
            console.log("1. Chargement du fichier de deck :", deckToLoad.info.path);
            const deckData = await fetchDeckFile(deckToLoad.info.path);
            console.log("2. Données du deck chargées :", deckData);

            if (deckData && deckData.length > 0) {
                console.log("3. Le deck n'est pas vide. Initialisation...");
                initializeDeck(deckData, deckToLoad.info.nom, deckToLoad.info.path, selectedMode);
                console.log("4. État de l'application après initialisation :", JSON.parse(JSON.stringify(appState)));
                render();
            } else {
                displayError(`Le deck "${deckToLoad.info.nom}" est vide ou n'a pas pu être lu.`);
                buildAndShowLibrary();
            }
        } catch (error) {
            displayError(`Erreur: Impossible de charger le deck "${deckToLoad.info.nom}".`);
        } finally {
            deckToLoad = null;
        }
    }
}

/**
 * Gère la réponse de l'utilisateur à une carte.
 */
function handleCardAnswer(quality) {
    const card = appState.dueCards[appState.currentCardIndex];
    if (!card) return;

    const cardInner = DOM.cardContainer.querySelector('.card-inner');
    const feedbackMap = { 1: 'feedback-again', 2: 'feedback-hard', 3: 'feedback-good', 4: 'feedback-easy' };
    
    // Amélioration : Ajoute le retour visuel et lance la disparition
    cardInner.classList.add(feedbackMap[quality]);
    DOM.answerButtons.classList.add(CSS_CLASSES.hidden);
    cardInner.style.opacity = '0';

    // Attend la fin des animations
    setTimeout(() => {
        // Nettoie la classe de l'animation pour la prochaine carte
        cardInner.classList.remove(feedbackMap[quality]);
        
        // Applique la logique SRS et détermine la carte suivante
        processAnswer(card, quality);
        
        if (quality <= 2) {
            const failedCard = appState.dueCards.splice(appState.currentCardIndex, 1)[0];
            const insertOffset = Math.floor(Math.random() * 4) + 2;
            const newIndex = Math.min(appState.currentCardIndex + insertOffset, appState.dueCards.length);
            appState.dueCards.splice(newIndex, 0, failedCard);
        } else {
            appState.currentCardIndex++;
        }

        // Affiche la carte suivante ou le message de fin
        if (appState.currentCardIndex < appState.dueCards.length) {
            prepareNextCard();
            
            cardInner.style.transition = 'none';
            DOM.cardContainer.classList.remove(CSS_CLASSES.flipped);
            
            void cardInner.offsetWidth; // Force le navigateur à appliquer le changement
            
            cardInner.style.transition = 'transform 0.6s, opacity 0.2s';
            cardInner.style.opacity = '1'; // Fait réapparaître la nouvelle carte
        } else {
            DOM.cardContainer.classList.add(CSS_CLASSES.hidden);
            DOM.noCardsMessage.classList.remove(CSS_CLASSES.hidden);
        }
    }, 400); // Délai qui correspond à l'animation CSS
}

/**
 * Met en place tous les écouteurs d'événements de l'application.
 */
function setupEventListeners() {
    DOM.appTitle.addEventListener('click', () => {
        // Exécute la même logique que le bouton pour quitter
        resetApp();
        render();
        buildAndShowLibrary();
    });
    
    DOM.themeToggle.addEventListener('click', toggleTheme);

    DOM.quitSessionBtn.addEventListener('click', () => {
        resetApp();
        render();
        buildAndShowLibrary();
    });

    DOM.startSessionBtn.addEventListener('click', startNewSession);
    DOM.studyModeModal.addEventListener('click', (e) => {
        if (e.target === DOM.studyModeModal) {
            DOM.studyModeModal.classList.add(CSS_CLASSES.hidden);
        }
    });

    DOM.cardContainer.addEventListener('click', flipCard);
    
    DOM.answerButtons.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const qualityMap = {
            [DOM_IDS.buttons.again]: 1,
            [DOM_IDS.buttons.hard]: 2,
            [DOM_IDS.buttons.good]: 3,
            [DOM_IDS.buttons.easy]: 4
        };
        handleCardAnswer(qualityMap[e.target.id]);
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
    
    deckFilterSwitch.addEventListener('change', buildAndShowLibrary);

    // --- NOUVEL ÉCOUTEUR CLAVIER UNIFIÉ ---
    document.addEventListener('keydown', (e) => {
        // On s'assure qu'une session est bien en cours
        if (!appState.deckName || appState.dueCards.length === 0) return;

        const isFlipped = DOM.cardContainer.classList.contains(CSS_CLASSES.flipped);

        if (isFlipped) {
            // --- LA CARTE EST CÔTÉ RÉPONSE ---

            // On définit les touches qui valident une réponse
            const qualityMap = {
                'Digit1': 1, 'Numpad1': 1,
                'Digit2': 2, 'Numpad2': 2,
                'Digit3': 3, 'Numpad3': 3,
                'Digit4': 4, 'Numpad4': 4,
                'Enter': 3 // Entrée valide comme "Correct"
            };

            if (qualityMap[e.code]) {
                // Si la touche est une touche de validation, on l'utilise
                e.preventDefault();
                handleCardAnswer(qualityMap[e.code]);
            } else if (e.code === 'Space') {
                // Si c'est la barre d'espace, on l'empêche d'agir sur les boutons
                e.preventDefault();
            }

        } else {
            // --- LA CARTE EST CÔTÉ QUESTION ---

            // Seules les touches Espace et Entrée peuvent retourner la carte
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                flipCard();
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
