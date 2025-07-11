import dotenv from 'dotenv';

import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
dotenv.config();

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

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  try {
    // Créer un client Supabase avec le token utilisateur
    const supabase = createSupabaseClient(token);
    
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Erreur d'authentification" });
  }
}; 