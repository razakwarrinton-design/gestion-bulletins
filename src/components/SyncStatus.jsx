import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Composant d'indicateur de statut de synchronisation Supabase
 * Affiche si la connexion à Supabase est active
 */
export default function SyncStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usesFallback, setUsesFallback] = useState(true);

  useEffect(() => {
    // Vérifier si Supabase est configuré
    const checkSupabaseConfig = async () => {
      try {
        setIsLoading(true);
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        // Si les variables d'env ne sont pas configurées
        if (!url || !key || url.includes('your-project')) {
          setUsesFallback(true);
          setIsConnected(false);
          return;
        }

        // Essayer de se connecter à Supabase
        try {
          const { supabase } = await import('../config/supabase');
          const { data, error } = await supabase
            .from('app_data')
            .select('key')
            .limit(1);
          
          setIsConnected(!error);
          setUsesFallback(false);
        } catch (err) {
          setIsConnected(false);
          setUsesFallback(true);
        }
      } catch (err) {
        setIsConnected(false);
        setUsesFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupabaseConfig();

    // Vérifier périodiquement la connexion
    const interval = setInterval(checkSupabaseConfig, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
      isConnected && !usesFallback
        ? 'bg-green-100 text-green-800'
        : 'bg-yellow-100 text-yellow-800'
    }`}>
      {isConnected && !usesFallback ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Cloud</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Local</span>
        </>
      )}
    </div>
  );
}
