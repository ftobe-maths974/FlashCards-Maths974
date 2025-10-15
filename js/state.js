/**
 * Ce module gère l'état de l'application et les interactions avec le localStorage.
 * NOUVELLE ARCHITECTURE ROBUSTE : Chaque deck a son propre objet de progression
 * dans le localStorage, empêchant toute contamination entre les decks.
 */

// 1. Importez les constantes
import { STORAGE_KEYS } from './constants.js';

// L'état de la session en cours, en mémoire vive.
export let appState = { 
    deckName: null,
    deckPath: null,
    cards: [],
    dueCards: [],
    currentCardIndex: -1,
    studyMode: 'recto'
};

const PROGRESS_STORAGE_KEY_PREFIX = 'flashcard_progress_';

/**
 * Charge la progression pour UN SEUL deck depuis le localStorage.
 * @param {string} deckPath - L'identifiant unique du deck (son chemin).
 * @returns {object} Un objet contenant la progression des cartes du deck, ou un objet vide.
 */
function loadDeckProgress(deckPath) {
    const key = PROGRESS_STORAGE_KEY_PREFIX + deckPath;
    const savedProgress = localStorage.getItem(key);
    return savedProgress ? JSON.parse(savedProgress) : {};
}

/**
 * Sauvegarde la progression pour UN SEUL deck dans le localStorage.
 * @param {string} deckPath - L'identifiant du deck.
 * @param {Array<Object>} cards - Le tableau complet des cartes du deck avec leur progression à jour.
 */
function saveDeckProgress(deckPath, cards) {
    const key = PROGRESS_STORAGE_KEY_PREFIX + deckPath;
    const progressToSave = {};
    // On ne sauvegarde que les données de progression, pas le contenu Question/Réponse
    cards.forEach((card, index) => {
        progressToSave[index] = {
            prochaine_revision: card.prochaine_revision,
            intervalle: card.intervalle,
            facteur_facilite: card.facteur_facilite,
            statut: card.statut
        };
    });
    localStorage.setItem(key, JSON.stringify(progressToSave));
}

/**
 * Initialise un deck en fusionnant le contenu brut avec la progression sauvegardée.
 * C'est l'étape d'"hydratation".
 * @param {Array<Object>} cardsData - Le contenu brut des cartes ({ Question, Réponse }).
 * @param {string} deckName - Le nom du deck.
 * @param {string} deckPath - Le chemin du fichier du deck.
 * @param {string} mode - Le mode d'étude choisi.
 */
export function initializeDeck(cardsData, deckName, deckPath, mode) {
    const now = new Date().toISOString().split('T')[0];
    const deckProgress = loadDeckProgress(deckPath);

    appState.deckName = deckName;
    appState.deckPath = deckPath;
    appState.studyMode = mode;
    
    appState.cards = cardsData.map((cardContent, index) => {
        const progress = deckProgress[index] || { // On cherche la progression par l'index
            prochaine_revision: now,
            intervalle: 0,
            facteur_facilite: 2.5,
            statut: 'nouvelle'
        };

        return {
            id_unique: `${deckPath}#${index}`, // L'ID reste utile en mémoire vive
            Question: cardContent.Question,
            Réponse: cardContent.Réponse,
            ...progress // On fusionne le contenu et la progression
        };
    });
}

/**
 * Sauvegarde la progression du deck actuellement en cours d'étude.
 */
export function saveCurrentDeckProgress() {
    if (appState.deckPath && appState.cards.length > 0) {
        saveDeckProgress(appState.deckPath, appState.cards);
    }
}

/**
 * Réinitialise l'état de la session en cours (en mémoire vive).
 */
export function resetApp() {
    // On sauvegarde la progression du deck qu'on quitte avant de réinitialiser l'état.
    saveCurrentDeckProgress();
    
    appState.deckName = null;
    appState.deckPath = null;
    appState.cards = [];
    appState.dueCards = [];
    appState.currentCardIndex = -1;
    appState.studyMode = 'recto';
}

/**
 * Réinitialise la progression d'un deck spécifique en supprimant sa boîte du localStorage.
 * @param {string} deckPath - Le chemin du deck à réinitialiser.
 * @param {string} deckName - Le nom du deck pour l'affichage du message.
 */
export function resetDeckProgress(deckPath, deckName) {
    if (confirm(`Êtes-vous sûr de vouloir réinitialiser toute la progression pour le deck "${deckName}" ? Cette action est irréversible.`)) {
        const key = PROGRESS_STORAGE_KEY_PREFIX + deckPath;
        localStorage.removeItem(key); // On supprime simplement la bonne clé.
        alert(`Progression réinitialisée pour le deck "${deckName}".`);
        
        // Si le deck réinitialisé est celui en cours, on quitte la session
        if (appState.deckPath === deckPath) {
            // On réinitialise l'état sans sauvegarder la progression qu'on vient d'effacer
            appState.deckName = null;
            appState.deckPath = null;
            appState.cards = [];
            appState.dueCards = [];
            appState.currentCardIndex = -1;
            appState.studyMode = 'recto';
        }
    }
}

// DANS LE FICHIER js/state.js, AJOUTEZ CETTE NOUVELLE FONCTION :

/**
 * Analyse le manifeste et la progression pour déterminer quels decks ont des cartes à réviser.
 * @param {Array<Object>} manifest - La structure brute des decks.
 * @returns {Promise<Array<Object>>} Le manifeste "enrichi" avec un statut de révision.
 */
export async function getDecksWithStatus(manifest) {
    const today = new Date().toISOString().split('T')[0];

    async function processItems(items) {
        for (const item of items) {
            if (item.type === 'fichier') {
                const progress = loadDeckProgress(item.path);
                const hasProgress = Object.keys(progress).length > 0;
                
                if (!hasProgress) {
                    item.deckStatus = 'new'; // Deck jamais commencé
                } else {
                    const hasDueCards = Object.values(progress).some(card => card.prochaine_revision <= today);
                    item.deckStatus = hasDueCards ? 'due' : 'up-to-date'; // À réviser ou à jour
                }
            } else if (item.type === 'dossier' && item.contenu) {
                await processItems(item.contenu);
            }
        }
    }

    await processItems(manifest);
    return manifest;
}


