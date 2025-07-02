# Echo - Votre Conseiller Personnel IA 🤖

Echo est une application mobile qui vous offre un assistant personnel alimenté par l'IA, conçu pour s'adapter à votre profil et vous accompagner au quotidien. L'application utilise GPT pour créer une expérience de conversation personnalisée et naturelle.

## Fonctionnalités Principales 🌟

### Profil Personnalisé
- Créez votre profil personnel avec vos informations
- L'IA adapte ses réponses en fonction de :
  - Votre nom
  - Votre âge
  - Votre profession
  - Vos centres d'intérêt

### Chat Intelligent
- Conversations naturelles et contextuelles
- Réponses personnalisées basées sur votre profil
- Interface utilisateur intuitive et moderne
- Support du streaming des réponses pour une expérience fluide

### Gestion de Compte
- Authentification sécurisée via Supabase
- Personnalisation du profil utilisateur
- Sauvegarde automatique des préférences

---

## Check-in mental journalier 🌈

Chaque jour, à ta première connexion, une fenêtre s'ouvre pour t'inviter à choisir une couleur qui correspond à ton humeur du moment.

Chaque couleur correspond à un mot-clé, pour t'aider à te situer sans avoir à t'expliquer :

| Couleur      | Mot-clé principal | Mot-clé secondaire      |
|--------------|------------------|------------------------|
| Gris doux    | Discret          | Réservé                |
| Bleu nuit    | Fatigué          | Besoin de réconfort    |
| Bleu clair   | Serein           | Posé                   |
| Vert         | Équilibré        | Stable                 |
| Jaune        | Optimiste        | Énergique              |
| Orange       | Dynamique        | Motivé                 |
| Rose         | Joyeux           | Léger                  |
| Violet       | Inspiré          | Créatif                |

- Ce choix est personnel, confidentiel, et sert à adapter l'ambiance de l'application et la façon dont l'IA te parle.
- Tu peux ignorer le check-in si tu préfères.
- Tu peux consulter ton "arc-en-ciel" personnel dans l'historique, pour voir l'évolution de tes couleurs au fil du temps.

**Pour l'IA :**
À chaque nouvelle session, l'IA lit le dernier check-in (couleur + mot-clé) et adapte son ton :

> Adapte ton style à l'humeur du jour de l'utilisatrice, qui a choisi la couleur [COULEUR] ("Mot-clé"). Sois en phase avec cette énergie dans tes réponses.

---

## Technologies Utilisées 🛠

- **Frontend**: React Native avec Expo
- **Backend**: Supabase (Base de données et Authentification)
- **IA**: OpenAI GPT-3.5 Turbo
- **Stockage**: Supabase PostgreSQL

Pour toute question ou suggestion :
- Ouvrez une issue sur GitHub

---

Développé avec ❤️ pour offrir une expérience de conversation IA personnalisée et enrichissante.
