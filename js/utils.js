/**
 * Mélange un tableau sur place en utilisant l'algorithme de Fisher-Yates.
 * @param {Array} array Le tableau à mélanger.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Parse le contenu textuel d'un fichier de deck Markdown (.md).
 * Sépare les cartes par '---' et extrait la Question et la Réponse.
 * @param {string} mdText Le contenu du fichier .md.
 * @returns {Array<Object>} Un tableau d'objets carte { Question, Réponse }.
 */
export function parseMarkdownDeck(mdText) {
    const cards = [];
    const cardBlocks = mdText.trim().split(/\n---\n/); // Sépare par '---' sur sa propre ligne

    for (const block of cardBlocks) {
        if (block.trim() === '') continue;

        const questionIndex = block.indexOf('Question:');
        const answerIndex = block.indexOf('Réponse:');

        if (questionIndex !== -1 && answerIndex !== -1 && answerIndex > questionIndex) {
            const question = block.substring(questionIndex + 9, answerIndex).trim();
            const answer = block.substring(answerIndex + 8).trim();
            cards.push({ Question: question, Réponse: answer });
        }
    }
    return cards;
}
