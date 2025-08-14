import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { formatCPF, validateCPF, cleanCPF } from '@/lib/cpfValidation';
import Logo from '@/components/Logo';

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  
  // Validação de senha forte
  const passwordValidation = usePasswordValidation(password);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validações para cadastro
      if (isSignUp) {
        // Verificar senha forte
        if (!passwordValidation.isValid) {
          toast({
            title: "Senha muito fraca",
            description: "Por favor, crie uma senha mais forte seguindo os critérios indicados.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        // Verificar nome completo
        if (!nomeCompleto.trim() || nomeCompleto.trim().length < 2) {
          toast({
            title: "Nome inválido",
            description: "Por favor, digite seu nome completo.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        // Verificar CPF
        if (!cpf || !validateCPF(cpf)) {
          toast({
            title: "CPF inválido",
            description: "Por favor, digite um CPF válido.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      const { error } = isSignUp 
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                nome_completo: nomeCompleto.trim(),
                cpf: cleanCPF(cpf)
              }
            }
          })
        : await signIn(email, password);

      if (error) {
        toast({
          title: "Erro de autenticação",
          description: error.message,
          variant: "destructive",
        });
      } else if (isSignUp) {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Digite seu email para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique seu email para redefinir sua senha.",
        });
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <CardDescription>
            {isForgotPassword ? 'Recuperar senha' : (isSignUp ? 'Crie sua conta' : 'Entre na sua conta')}
          </CardDescription>
        </CardHeader>
        <CardContent>

          {/* Forgot Password Form */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Enviar email de recuperação'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              
              {/* Campos adicionais para cadastro */}
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                    <Input
                      id="nomeCompleto"
                      type="text"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      required
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      required
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={isSignUp ? 8 : 6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>
              
              {/* Indicador de força da senha - apenas no cadastro */}
              {isSignUp && (
                <PasswordStrengthIndicator 
                  validation={passwordValidation} 
                  password={password} 
                />
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting || (isSignUp && !passwordValidation.isValid)}
              >
                {submitting ? 'Carregando...' : (isSignUp ? 'Criar conta' : 'Entrar')}
              </Button>
              
              {/* Forgot Password Link - only show for login */}
              {!isSignUp && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              )}
            </form>
          )}
          
          <div className="mt-4 text-center">
            {isForgotPassword ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail('');
                  setNomeCompleto('');
                  setCpf('');
                }}
                className="text-sm"
              >
                Voltar ao login
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setNomeCompleto('');
                  setCpf('');
                }}
                className="text-sm"
              >
                {isSignUp 
                  ? 'Já tem uma conta? Entre aqui'
                  : 'Não tem conta? Crie uma aqui'
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;