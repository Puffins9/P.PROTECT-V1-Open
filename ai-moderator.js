const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

let model;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} else {
    console.warn("Clé API Gemini non configurée. Les modules IA seront désactivés.");
}

const toxicMessagePrompt = `
Tu es un expert en modération pour une communauté Discord francophone tout public. 
Analyse le message suivant et détermine s'il est toxique. Un message est considéré toxique s'il contient des insultes graves, du harcèlement, du racisme, du contenu sexuellement explicite, de la haine, ou une tentative évidente de contourner ces filtres. 
Ne sois pas trop sensible : les blagues légères, les critiques ou un langage un peu familier ne sont PAS toxiques.
Réponds uniquement et exclusivement par "OUI" si le message est toxique, et "NON" s'il est acceptable.

Message à analyser : 
`;

async function isMessageToxic(messageContent) {
    if (!model) return false;

    try {
        const fullPrompt = toxicMessagePrompt + messageContent;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text().trim().toUpperCase();

        return text === "OUI";

    } catch (error) {
        console.error("Erreur lors de l'appel à l'API Gemini (isMessageToxic):", error);
        return false;
    }
}


async function getSecurityAdvice(vulnerabilities) {
    if (!model) return "Le module IA n'est pas configuré. Impossible de générer des conseils.";
    if (vulnerabilities.length === 0) return "Aucune vulnérabilité majeure détectée. Excellent travail de configuration ! Continuez à être vigilant.";

    const securityPrompt = `
    En tant qu'expert en sécurité de serveurs Discord, rédige une conclusion et des conseils clairs et encourageants pour un administrateur. 
    Pour chaque vulnérabilité détectée dans la liste ci-dessous, fournis une recommandation simple pour la corriger.
    Adopte un ton professionnel mais accessible. Ne liste que les conseils pour les failles détectées.

    Vulnérabilités détectées :
    - ${vulnerabilities.join('\n- ')}
    `;

    try {
        const result = await model.generateContent(securityPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erreur API Gemini pour conseil sécurité:", error);
        return "L'IA n'a pas pu générer de conseil, mais nous recommandons de vérifier attentivement les points listés.";
    }
}

module.exports = { isMessageToxic, getSecurityAdvice };
