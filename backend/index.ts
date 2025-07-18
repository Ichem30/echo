import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import Stripe from 'stripe';
import { AuthenticatedRequest, authMiddleware } from './middleware/auth';

// Charger les variables d'environnement (supporte .env à la racine ou dans backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // surcharge si .env local

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

// Configuration Supabase (sans client global)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Fonction pour créer un client Supabase avec token utilisateur
const createSupabaseClient = (accessToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
};

const app = express();
const port = process.env.PORT || 3001;

// Configuration CORS simple et universelle
app.use(cors({ origin: '*', credentials: true }));

// Endpoint pour recevoir les webhooks Stripe (doit être AVANT express.json())
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Erreur signature webhook Stripe:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  async function updateUserPlan(userId: string, plan: string) {
    const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: plan })
      .eq('id', userId);
    if (error) {
      console.error('Erreur MAJ plan Supabase:', error);
    } else {
      console.log(`Statut abonnement mis à jour pour ${userId} : ${plan}`);
    }
  }

  // Gestion des événements Stripe
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const planId = session.metadata?.plan_id;
    if (userId && planId) {
      await updateUserPlan(userId, planId);
    }
  }
  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    if (userId) {
      await updateUserPlan(userId, 'free');
    }
  }
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    if (userId) {
      const plan = subscription.status === 'active' ? (subscription.metadata?.plan_id || 'premium') : 'free';
      await updateUserPlan(userId, plan);
    }
  }
  res.json({ received: true });
});

// Middleware pour parser le JSON (doit être APRÈS le webhook Stripe)
app.use(express.json());

// Endpoint de test
app.get('/', (req, res) => {
  res.json({ message: 'API Echo backend opérationnelle !' });
});

// Exemple de route protégée (auth requise)
app.get('/api/protected', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ message: `Bienvenue ${req.user?.email}, accès sécurisé OK !` });
});

// ===== NOUVEAUX ENDPOINTS POUR SESSIONS ET MESSAGES =====

// 1. Créer une nouvelle session
app.post('/api/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId || !accessToken) {
      res.status(401).json({ error: 'Utilisateur non authentifié' });
      return;
    }

    // Créer un client Supabase avec le token utilisateur
    const supabase = createSupabaseClient(accessToken);

    // 1. Clôturer toutes les sessions ouvertes (peu importe le timeout)
    // Chercher toutes les sessions ouvertes (ended_at null)
    const { data: openSessions, error: errorOpenSessions } = await supabase
      .from('sessions')
      .select('id, started_at')
      .eq('user_id', userId)
      .is('ended_at', null);

    if (errorOpenSessions) {
      console.error('Erreur récupération sessions ouvertes:', errorOpenSessions);
    } else {
      console.log(`[LOG] Sessions ouvertes trouvées: ${openSessions?.length || 0}`);
    }

    const now = new Date();
    // On clôture TOUTES les sessions ouvertes, même si < 30min
    for (const session of openSessions || []) {
      // Récupérer tous les messages de la session
      const { data: messages, error: errorMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp', { ascending: true });
      let summary = null;
      if (!errorMessages && messages && messages.length > 0) {
        // Générer le résumé via OpenAI
        const historique = messages.map((m: any) => {
          const auteur = m.role === 'user' ? 'Utilisatrice' : m.role === 'assistant' ? 'Assistante' : 'Système';
          return `${auteur} : ${m.content}`;
        }).join('\n');
        const prompt = `Voici l'historique d'une conversation entre une utilisatrice et son assistante IA. Résume la session en 4 points :\n1. Humeur générale de l'utilisatrice\n2. Sujets principaux abordés\n3. Informations clés à retenir sur l'utilisatrice (objectifs, préoccupations, événements importants, changements, etc.)\n4. Résumé synthétique de la discussion (2-3 phrases max)\nRéponds uniquement au format JSON : { "humeur": "...", "sujets": ["..."], "infos_cles": ["..."], "resume": "..." }\nHistorique :\n${historique}`;
        try {
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
          console.log(`[LOG] Résumé généré pour la session ${session.id}:`, summary);
        } catch (err) {
          console.error(`[LOG] Erreur génération résumé OpenAI pour la session ${session.id}:`, err);
        }
      }
      // Mettre à jour la session (ended_at + summary si possible)
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ 
          ended_at: now.toISOString(),
          summary: summary ? JSON.stringify(summary) : null
        })
        .eq('id', session.id);
      if (updateError) {
        console.error(`[LOG] Erreur update session ${session.id}:`, updateError);
      } else {
        console.log(`[LOG] Session ${session.id} clôturée. ended_at et summary mis à jour.`);
      }
    }

    // 2. Créer la nouvelle session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création session:', error);
      res.status(500).json({ error: 'Erreur lors de la création de la session' });
      return;
    }

    // Récupérer le checkin du jour depuis profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('checkins')
      .eq('id', userId)
      .single();

    const today = new Date().toISOString().slice(0, 10);
    const checkinToday = profile?.checkins?.find((c: any) => c.date === today);

    // 3. Récupérer les 5 derniers résumés de sessions terminées
    const { data: lastSessions, error: errorLastSessions } = await supabase
      .from('sessions')
      .select('id, summary, ended_at')
      .eq('user_id', userId)
      .not('summary', 'is', null)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(5);

    if (errorLastSessions) {
      console.error('Erreur récupération derniers résumés:', errorLastSessions);
    }

    res.json({
      session: {
        ...session,
        checkin_today: checkinToday
      },
      last_summaries: (lastSessions || []).map(s => ({ id: s.id, summary: s.summary, ended_at: s.ended_at }))
    });

  } catch (error: any) {
    console.error('Erreur création session:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// 2. Ajouter un message à une session
app.post('/api/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { session_id, role, content } = req.body;
    const userId = req.user?.id;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!userId || !accessToken || !session_id || !role || !content) {
      res.status(400).json({ error: 'Paramètres manquants' });
      return;
    }

    // Créer un client Supabase avec le token utilisateur
    const supabase = createSupabaseClient(accessToken);

    // Vérifier que la session appartient à l'utilisateur
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: 'Session non trouvée' });
      return;
    }

    // Ajouter le message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        session_id,
        user_id: userId,
        role,
        content,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur ajout message:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du message' });
      return;
    }

    res.json({ message });

  } catch (error: any) {
    console.error('Erreur ajout message:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// 3. Récupérer les messages d'une session
app.get('/api/sessions/:sessionId/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!userId || !accessToken) {
      res.status(401).json({ error: 'Utilisateur non authentifié' });
      return;
    }

    // Créer un client Supabase avec le token utilisateur
    const supabase = createSupabaseClient(accessToken);

    // Vérifier que la session appartient à l'utilisateur
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: 'Session non trouvée' });
      return;
    }

    // Récupérer les messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Erreur récupération messages:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
      return;
    }

    res.json({ messages });

  } catch (error: any) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// 4. Générer et stocker un résumé pour une session
app.post('/api/sessions/:sessionId/summary', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!userId || !accessToken) {
      res.status(401).json({ error: 'Utilisateur non authentifié' });
      return;
    }

    // Créer un client Supabase avec le token utilisateur
    const supabase = createSupabaseClient(accessToken);

    // Vérifier que la session appartient à l'utilisateur
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: 'Session non trouvée' });
      return;
    }

    // Récupérer tous les messages de la session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (messagesError) {
      console.error('Erreur récupération messages:', messagesError);
      res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
      return;
    }

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Aucun message à résumer' });
      return;
    }

    // Générer le résumé via OpenAI
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

    // Stocker le résumé dans la session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ 
        summary: JSON.stringify(summary),
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Erreur mise à jour session:', updateError);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde du résumé' });
      return;
    }

    res.json({ summary });

  } catch (error: any) {
    console.error('Erreur génération résumé:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// 5. Récupérer toutes les sessions d'un utilisateur
app.get('/api/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!userId || !accessToken) {
      res.status(401).json({ error: 'Utilisateur non authentifié' });
      return;
    }

    // Créer un client Supabase avec le token utilisateur
    const supabase = createSupabaseClient(accessToken);

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération sessions:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des sessions' });
      return;
    }

    res.json({ sessions });

  } catch (error: any) {
    console.error('Erreur récupération sessions:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// ===== ENDPOINTS EXISTANTS =====

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
    console.log('Réponse OpenAI brute :', content); // <-- LOG AJOUTÉ
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

// Liste des plans disponibles
const PLANS = [
  {
    id: 'weekly',
    name: 'Echo Premium Weekly',
    price_id: 'price_1RlWqV05iCMRVP2kd9j8kxUX',
    coupon_id: 'MI6mO5Ma',
    description: '0,99$ la première semaine puis 3,99$/semaine'
  },
  {
    id: 'annual',
    name: 'Echo Premium Annual',
    price_id: 'price_1RlWkR05iCMRVP2kpolz6fIT',
    coupon_id: 'ZFPCGrwE',
    description: '54,95$/an au lieu de 207$ (-76%)'
  }
];

// Endpoint pour lister les plans
app.get('/api/billing/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// Endpoint pour créer une session Stripe Checkout
app.post('/api/billing/subscribe', authMiddleware, async (req, res) => {
  const { plan_id } = req.body;
  const user = req.user;
  const plan = PLANS.find(p => p.id === plan_id);
  if (!plan) {
    return res.status(400).json({ error: 'Plan inconnu' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price: plan.price_id,
          quantity: 1
        }
      ],
      discounts: plan.coupon_id ? [{ coupon: plan.coupon_id }] : [],
      success_url: 'myapp://payment-success',
      cancel_url: 'myapp://payment-cancel',
      metadata: {
        user_id: user.id,
        plan_id: plan.id
      }
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Erreur création session Stripe:', err);
    res.status(500).json({ error: 'Erreur Stripe' });
  }
});

app.listen(port, () => {
  console.log(`Serveur backend démarré sur http://localhost:${port}`);
}); 