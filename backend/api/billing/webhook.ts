import { createClient } from '@supabase/supabase-js';
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });
const app = express();

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('--- Stripe Webhook Debug ---');
  console.log('Type de req.body :', typeof req.body, Buffer.isBuffer(req.body));
  console.log('Headers:', req.headers);
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

export default app; 