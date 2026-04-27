import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowLeft, AlertCircle } from "lucide-react";
import { mockAuthService } from "@/lib/mock-auth";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { signUpSchema, signInSchema } from "@/lib/auth-validation";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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
      const { error } = await mockAuthService.signUp(email, password);

      if (error) throw error;

      // Trigger auth update in other components
      window.dispatchEvent(new Event('auth-changed'));

      toast({
        title: t('registrationSuccess'),
        description: "Добро пожаловать! Вы зарегистрированы.",
      });
      
      setEmail("");
      setPassword("");
      
      // Navigate immediately
      navigate("/dashboard");
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
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
      const { error } = await mockAuthService.signIn(email, password);

      if (error) throw error;

      // Trigger auth update in other components
      window.dispatchEvent(new Event('auth-changed'));

      toast({
        title: "Успешно",
        description: "Вы вошли в систему",
      });

      // Navigate immediately
      navigate("/dashboard");
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast({
        title: t('loginError'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          На главную
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
                      Минимум 8 символов, заглавная и строчная буквы, цифра
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