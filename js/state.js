/**
 * Ce module gère l'état de l'application et les interactions avec le localStorage.
 * Nouvelle architecture : le localStorage ne stocke QUE la progression des cartes,
 * pas le contenu (Question/Réponse).
 */

// L'état de la session en cours, en mémoire vive.
export let appState = { 
    deckName: null,
    deckPath: null, // On garde le chemin du deck pour identifier les cartes
    cards: [],      // Le deck "hydraté" (contenu + progression) pour la session
    dueCards: [],
    currentCardIndex: -1,
    studyMode: 'recto'
};

const PROGRESS_STORAGE_KEY = 'flashcard_progress';

/**
 * Charge TOUTE la progression de l'utilisateur depuis le localStorage.
 * @returns {object} Un objet contenant la progression de toutes les cartes de tous les decks.
 */
function loadAllProgress() {
    const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return savedProgress ? JSON.parse(savedProgress) : {};
}

/**
 * Sauvegarde la progression d'une seule carte dans le localStorage.
 * C'est plus efficace que de tout sauvegarder à chaque fois.
 * @param {object} card La carte dont il faut sauvegarder la progression.
 */
export function saveCardProgress(card) {
    const allProgress = loadAllProgress();
    allProgress[card.id_unique] = {
        prochaine_revision: card.prochaine_revision,
        intervalle: card.intervalle,
        facteur_facilite: card.facteur_facilite,
        statut: card.statut
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allProgress));
}

/**
 * Initialise un deck en fusionnant le contenu brut avec la progression sauvegardée.
 * C'est l'étape d'"hydratation".
 * @param {Array<Object>} cardsData Le contenu brut des cartes ({ Question, Réponse }).
 * @param {string} deckName Le nom du deck.
 * @param {string} deckPath Le chemin du fichier du deck (sert d'identifiant).
 * @param {string} mode Le mode d'étude choisi.
 */
export function initializeDeck(cardsData, deckName, deckPath, mode) {
    const now = new Date().toISOString().split('T')[0];
    const allProgress = loadAllProgress();

    appState.deckName = deckName;
    appState.deckPath = deckPath;
    appState.studyMode = mode;
    
    appState.cards = cardsData.map((cardContent, index) => {
        const cardId = `${deckPath}#${index}`;
        const progress = allProgress[cardId] || {
            prochaine_revision: now,
            intervalle: 0,
            facteur_facilite: 2.5,
            statut: 'nouvelle'
        };

        return {
            id_unique: cardId,
            Question: cardContent.Question,
            Réponse: cardContent.Réponse,
            ...progress // On fusionne le contenu et la progression
        };
    });
    console.log('État des cartes après chargement de la progression :', appState.cards);
}

/**
 * Réinitialise l'état de la session en cours (en mémoire vive).
 */
export function resetApp() {
    appState.deckName = null;
    appState.deckPath = null;
    appState.cards = [];
    appState.dueCards = [];
    appState.currentCardIndex = -1;
    appState.studyMode = 'recto';
    // On ne touche plus au localStorage ici, la progression est conservée.
}

/**
 * Réinitialise la progression d'un deck spécifique dans le localStorage.
 * @param {string} deckPath Le chemin du deck à réinitialiser.
 */
export function resetDeckProgress(deckPath, deckName) {
    if (confirm(`Êtes-vous sûr de vouloir réinitialiser la progression pour le deck "${deckName}" ? Cette action est irréversible.`)) {
        const allProgress = loadAllProgress();
        
        // On supprime toutes les clés qui commencent par le chemin du deck
        Object.keys(allProgress).forEach(key => {
            if (key.startsWith(deckPath)) {
                delete allProgress[key];
            }
        });

        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allProgress));
        alert(`Progression réinitialisée pour le deck "${deckPath}".`);
        // Si le deck réinitialisé est celui en cours, on quitte la session
        if (appState.deckPath === deckPath) {
            resetApp();
            // Il faudra appeler render() depuis main.js pour rafraîchir l'UI
        }
    }

}
