/**
 * Ce module gère l'état global de l'application (appState)
 * et toutes les interactions avec le localStorage.
 */

// L'état initial de l'application, exporté pour être accessible par les autres modules.
export let appState = { 
    deckName: null,
    cards: [],
    dueCards: [],
    currentCardIndex: -1,
    studyMode: 'recto' // 'recto', 'verso', or 'aleatoire'
};

/**
 * Sauvegarde l'état actuel de l'application dans le localStorage.
 */
export function saveState() {
    localStorage.setItem('flashcard_app_state', JSON.stringify(appState));
}

/**
 * Charge l'état de l'application depuis le localStorage.
 * @returns {boolean} Vrai si un état a été chargé, faux sinon.
 */
export function loadState() {
    const savedState = localStorage.getItem('flashcard_app_state');
    if (savedState) {
        appState = JSON.parse(savedState);
        // Assure la compatibilité si d'anciennes versions de l'état sont sauvegardées
        if (typeof appState.studyMode === 'undefined') {
            appState.studyMode = 'recto';
        }
        return true;
    }
    return false;
}

/**
 * Réinitialise l'état de l'application et nettoie le localStorage.
 */
export function resetApp() {
    appState = { deckName: null, cards: [], dueCards: [], currentCardIndex: -1, studyMode: 'recto' };
    localStorage.removeItem('flashcard_app_state');
}

/**
 * Initialise un nouveau deck, prépare les cartes et met à jour l'état.
 * @param {Array<Object>} cardsData Le tableau de cartes brutes ({ Question, Réponse }).
 * @param {string} deckName Le nom du deck.
 * @param {string} mode Le mode d'étude choisi ('recto', 'verso', 'aleatoire').
 */
export function initializeDeck(cardsData, deckName, mode) {
    const now = new Date().toISOString().split('T')[0];
    appState.deckName = deckName;
    appState.studyMode = mode;
    appState.cards = cardsData.map((card, index) => ({
        id_unique: `${deckName}-${index}`,
        Question: card.Question,
        Réponse: card.Réponse,
        prochaine_revision: now,
        intervalle: 0,
        facteur_facilite: 2.5,
        statut: 'nouvelle'
    }));
    saveState();
}
