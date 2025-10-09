/**
 * Ce module gère toutes les communications avec les fichiers externes (API Fetch).
 * Il est responsable de charger la bibliothèque de decks et le contenu de chaque deck.
 */

import { parseMarkdownDeck } from './utils.js';

/**
 * Charge le fichier manifeste qui décrit l'arborescence de la bibliothèque de decks.
 * @returns {Promise<Array>} Une promesse qui se résout avec le contenu du manifest.json.
 */
export async function fetchDeckLibrary() {
    try {
        const response = await fetch('decks/manifest.json');
        if (!response.ok) {
            throw new Error(`Erreur réseau: ${response.statusText}`);
        }
        const manifest = await response.json();
        return manifest;
    } catch (error) {
        console.error("Impossible de charger la bibliothèque de decks. Vérifiez que 'decks/manifest.json' existe.", error);
        // Retourne un tableau vide en cas d'erreur pour ne pas bloquer l'interface
        return [];
    }
}

/**
 * Charge et parse le contenu d'un fichier de deck Markdown (.md) spécifique.
 * @param {string} path Le chemin relatif du fichier .md dans le dossier /decks/.
 * @returns {Promise<Array<Object>>} Une promesse qui se résout avec un tableau d'objets carte.
 */
export async function fetchDeckFile(path) {
    try {
        const response = await fetch(`decks/${path}`);
        if (!response.ok) {
            throw new Error(`Erreur réseau: ${response.statusText}`);
        }
        const mdText = await response.text();
        const cardsData = parseMarkdownDeck(mdText);
        return cardsData;
    } catch (error) {
        console.error(`Erreur lors du chargement du deck ${path}`, error);
        alert(`Erreur lors du chargement du deck. Vérifiez la console pour plus de détails.`);
        return [];
    }
}
