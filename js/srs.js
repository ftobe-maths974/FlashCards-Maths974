/**
 * Calcule le nouvel état d'une carte après une réponse de l'utilisateur.
 * C'est une implémentation simplifiée de l'algorithme SM-2.
 * @param {object} card La carte à mettre à jour.
 * @param {number} quality La qualité de la réponse (1: À revoir, 2: Difficile, 3: Correct, 4: Facile).
 * @returns {object} La carte avec ses nouvelles propriétés (intervalle, prochaine_revision, etc.).
 */
export function processAnswer(card, quality) {
    if (quality < 2) {
        // "À revoir" : on réinitialise l'intervalle à 1 jour et on passe la carte en apprentissage.
        card.intervalle = 1;
        card.statut = "apprentissage";
    } else {
        // Si la carte est nouvelle ou en apprentissage, on lui donne son premier "vrai" intervalle.
        if (card.statut === 'nouvelle' || card.statut === 'apprentissage') {
            if (quality === 2) card.intervalle = 1;      // Difficile -> 1 jour
            else if (quality === 3) card.intervalle = 3; // Correct -> 3 jours
            else card.intervalle = 5;      // Facile -> 5 jours
            card.statut = "révision";
        } 
        // Si la carte est déjà en révision, on calcule le nouvel intervalle.
        else if (card.statut === 'révision') {
            // Mise à jour du facteur de facilité
            card.facteur_facilite = Math.max(1.3, card.facteur_facilite + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
            // Calcul du nouvel intervalle
            card.intervalle = Math.ceil(card.intervalle * card.facteur_facilite);
        }
    }

    // Définit la date de la prochaine révision
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + card.intervalle);
    card.prochaine_revision = reviewDate.toISOString().split('T')[0];

    return card;
}
