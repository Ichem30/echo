import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import { AuthenticatedRequest, authMiddleware } from './middleware/auth';

// Charger les variables d'environnement (supporte .env à la racine ou dans backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // surcharge si .env local

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

const app = express();
const port = process.env.PORT || 3001;

// Configuration CORS simple et universelle
app.use(cors({ origin: '*', credentials: true }));

// Middleware pour parser le JSON
app.use(express.json());

// Endpoint de test
app.get('/', (req, res) => {
  res.json({ message: 'API Echo backend opérationnelle !' });
});

// Exemple de route protégée (auth requise)
app.get('/api/protected', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ message: `Bienvenue ${req.user?.email}, accès sécurisé OK !` });
});

// Côté app mobile, il faudra appeler ce backend sécurisé (et non plus OpenAI directement)
app.post('/api/chat', authMiddleware, async (req: AuthenticatedRequest, res) => {
  console.log('API /api/chat appelée', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages manquants ou invalides' });
      return;
    }
    // Validation simple du dernier message utilisateur
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || typeof lastMsg.content !== 'string' || lastMsg.content.length === 0) {
      res.status(400).json({ error: 'Message utilisateur invalide' });
      return;
    }
    // Appel OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000
    });
    const response = completion.choices[0]?.message?.content || '';
    res.json({ response });
  } catch (error: any) {
    console.error('Erreur OpenAI:', error);
    res.status(500).json({ error: 'Erreur interne OpenAI' });
  }
});

app.post('/api/gdpr/summary', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages manquants ou invalides' });
      return;
    }
    // Générer le prompt résumé
    const historique = messages.map((m: any) => {
      const auteur = m.role === 'user' ? 'Utilisatrice' : m.role === 'assistant' ? 'Assistante' : 'Système';
      return `${auteur} : ${m.content}`;
    }).join('\n');
    const prompt = `Voici l'historique d'une conversation entre une utilisatrice et son assistante IA. Résume la session en 4 points :\n1. Humeur générale de l'utilisatrice\n2. Sujets principaux abordés\n3. Informations clés à retenir sur l'utilisatrice (objectifs, préoccupations, événements importants, changements, etc.)\n4. Résumé synthétique de la discussion (2-3 phrases max)\nRéponds uniquement au format JSON : { "humeur": "...", "sujets": ["..."], "infos_cles": ["..."], "resume": "..." }\nHistorique :\n${historique}`;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: "Tu es une IA qui résume des conversations pour un journal utilisateur. Réponds toujours en JSON strict." },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    });
    const content = completion.choices[0]?.message?.content || '';
    let summary;
    try {
      summary = JSON.parse(content);
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        summary = JSON.parse(match[0]);
      } else {
        summary = {
          humeur: '',
          sujets: [],
          infos_cles: [],
          resume: content.slice(0, 300)
        };
      }
    }
    res.json({ summary });
  } catch (error: any) {
    console.error('Erreur OpenAI résumé:', error);
    res.status(500).json({ error: 'Erreur interne OpenAI résumé' });
  }
});

app.listen(port, () => {
  console.log(`Serveur backend démarré sur http://localhost:${port}`);
}); 