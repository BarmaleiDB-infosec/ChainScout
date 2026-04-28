import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowLeft, AlertCircle, Github, Chrome, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema, signInSchema } from "@/lib/auth-validation";
import { useWallet } from "@/hooks/useWallet";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, signInWithOAuth, error: authError } = useAuth();
  const { connect, isConnecting } = useWallet();
  const [walletLoading, setWalletLoading] = useState<'ethereum' | 'solana' | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (authError) {
      toast({
        title: t('authErrorTitle'),
        description: authError,
        variant: "destructive",
      });
    }
  }, [authError, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = signUpSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: t('registrationSuccess'),
        description: t('checkEmailForConfirmationLink'),
      });
      
      setEmail("");
      setPassword("");
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : t('unknownError');
      toast({
        title: t('registrationError'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: t('successTitle'),
        description: t('signInSuccess'),
      });

      navigate("/dashboard");
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : t('unknownError');
      toast({
        title: t('loginError'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleWalletConnect = async (chain: 'ethereum' | 'solana') => {
    setWalletLoading(chain);
    try {
      await connect(chain);
      toast({
        title: t('successTitle'),
        description: t('connecting'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('walletError');
      toast({
        title: t('walletError'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setWalletLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          {t('backToHome')}
        </Button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo - Minimalist */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-2xl font-semibold text-foreground">ChainScout</span>
          </div>
        </div>
        
        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-xl font-semibold">{t('welcome')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('signInDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    {errors.password && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.password}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? t('signingIn') : t('signIn')}
                  </Button>
                </form>

                {/* OAuth Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
                  </div>
                </div>

                {/* OAuth / Web3 Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={oauthLoading !== null || loading || isConnecting || walletLoading !== null}
                    onClick={() => handleOAuthSignIn('google')}
                    className="w-full"
                    aria-label="Google"
                  >
                    <Chrome className="w-4 h-4 mr-2" />
                    {oauthLoading === 'google' ? t('loading') : 'Google'}
                  </Button>
                  <Button
                    type="button"
                    disabled={oauthLoading !== null || loading || isConnecting || walletLoading !== null}
                    onClick={() => handleOAuthSignIn('github')}
                    className="w-full bg-[#24292e] text-white hover:bg-[#1b1f23] border-transparent"
                    aria-label={t('connectGitHub')}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    {oauthLoading === 'github' ? t('connecting') : t('connectGitHub')}
                  </Button>
                  <Button
                    type="button"
                    disabled={oauthLoading !== null || loading || isConnecting || walletLoading !== null}
                    onClick={() => handleWalletConnect('ethereum')}
                    className="w-full bg-[#627EEA] text-white hover:bg-[#4B65D1]"
                    aria-label={t('connectEthereum')}
                  >
                    {walletLoading === 'ethereum' || isConnecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4 mr-2" />
                    )}
                    {walletLoading === 'ethereum' || isConnecting ? t('connecting') : t('connectEthereum')}
                  </Button>
                  <Button
                    type="button"
                    disabled={oauthLoading !== null || loading || isConnecting || walletLoading !== null}
                    onClick={() => handleWalletConnect('solana')}
                    className="w-full text-white bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90"
                    aria-label={t('connectSolana')}
                  >
                    {walletLoading === 'solana' || isConnecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4 mr-2" />
                    )}
                    {walletLoading === 'solana' || isConnecting ? t('connecting') : t('connectSolana')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    {errors.password && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.password}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t('passwordHint')}
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? t('signingUp') : t('signUp')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;