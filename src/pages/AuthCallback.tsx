import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * OAuth Callback Handler
 * This page handles the OAuth callback from Supabase (Google, GitHub, etc.)
 * It processes the auth code and redirects to dashboard or error page
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from URL fragment (#access_token=...)
        const { data, error: authError } = await supabase.auth.getSession();

        if (authError) {
          console.error('Auth callback error:', authError);
          setError(authError.message);
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
          return;
        }

        if (!data.session) {
          setError('No session established. Please try again.');
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
          return;
        }

        // Session established successfully, redirect to dashboard
        console.log('OAuth authentication successful');
        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("refresh_token", data.session.refresh_token || "");
        localStorage.setItem("user_email", data.session.user.email || "");
        localStorage.setItem("user_id", data.session.user.id);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        console.error('Callback handler error:', err);
        setError(message);
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-center text-muted-foreground">
              Processing authentication...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl text-destructive">✕</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Authentication Error
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {error}
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting to login page...
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
