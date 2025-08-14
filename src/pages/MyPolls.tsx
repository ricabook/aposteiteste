import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { makeUniqueSlug } from '@/utils/slug';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Plus, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PollForm } from '@/components/PollForm';

const MyPolls = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  // ALL HOOKS MUST BE DECLARED FIRST - before any conditional logic
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    question: '',
    end_date: new Date(),
    category: '' as 'politics' | 'sports' | 'economics' | 'entertainment' | 'technology' | 'science' | 'crypto' | 'other' | '',
    image_url: '',
    poll_type: 'B' as 'A' | 'B',
  });

  // Fetch user's polls with better error handling
  const { data: myPolls = [], refetch: refetchPolls, error: pollsError, isLoading: pollsLoading } = useQuery({
    queryKey: ['myPolls', user?.id],
    queryFn: async () => {
      console.log('Fetching polls for user:', user.id);
      
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching polls:', error);
        throw error;
      }
      
      console.log('Fetched polls:', data);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create poll mutation - MUST be declared with other hooks
  const createPollMutation = useMutation({
    mutationFn: async (submitData: any) => {
      if (!formData.title || !formData.question) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Get options from the form component
      const validOptions = submitData?.options || [];
      
      if (formData.poll_type === 'A') {
        // Tipo A: SIM/NÃO
        if (validOptions.length !== 2 || validOptions[0] !== 'Sim' || validOptions[1] !== 'Não') {
          throw new Error('Enquetes do tipo SIM/NÃO devem ter exatamente as opções "Sim" e "Não"');
        }
      } else {
        // Tipo B: Opções personalizadas
        if (validOptions.length < 2 || validOptions.length > 10) {
          throw new Error('Enquetes de opções personalizadas devem ter entre 2 e 10 opções');
        }
      }

      const optionsArray = validOptions.map((option: string, index: number) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D...
        label: option.trim()
      }));

      const optionImagesArray = optionsArray.map((_, index) => ({
        id: String.fromCharCode(65 + index),
        image_url: submitData?.optionImages?.[index] || null
      })).filter(img => img.image_url);

      const slug = await makeUniqueSlug(formData.title, supabase);
      const pollData = {
        ...formData,
        slug: slug,
        options: optionsArray,
        option_images: optionImagesArray.length > 0 ? optionImagesArray : null,
        option_a: optionsArray[0]?.label || '',
        option_b: optionsArray[1]?.label || '',
        end_date: formData.end_date.toISOString(),
        created_by: user?.id,
        category: formData.category || null,
        status: 'pending',
        is_active: false,
        poll_type: formData.poll_type,
      };

      const { error } = await supabase
        .from('polls')
        .insert(pollData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Enquete enviada para moderação! Aguarde a aprovação para que seja publicada.",
      });
      resetForm();
      refetchPolls();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a enquete",
        variant: "destructive",
      });
    },
  });

  console.log('MyPolls rendering - user:', user?.email, 'loading:', loading);

  // NOW conditional logic can happen AFTER all hooks are declared
  // Show loading while auth is loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    console.log('No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Reset form function
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      question: '',
      end_date: new Date(),
      category: '',
      image_url: '',
      poll_type: 'B',
    });
    setShowCreateForm(false);
  };

  const handleSubmit = (e: React.FormEvent, submitData?: any) => {
    e.preventDefault();
    createPollMutation.mutate(submitData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'approved':
        return <Badge variant="default">Aprovada</Badge>;
      case 'removed':
        return <Badge variant="destructive">Removida</Badge>;
      case 'resolved':
        return <Badge variant="outline">Resolvida</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      politics: 'Política',
      sports: 'Esportes',
      economics: 'Economia',
      entertainment: 'Entretenimento',
      technology: 'Tecnologia',
      science: 'Ciência',
      crypto: 'Criptomoedas',
      other: 'Outros'
    };
    return categories[category as keyof typeof categories] || category;
  };

  console.log('About to render page - polls loading:', pollsLoading, 'polls error:', pollsError);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Warning Alert */}
      <Alert className="mb-6 border-destructive bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Aviso Importante</AlertTitle>
        <AlertDescription>
          Qualquer item da enquete que seja de cunho desrespeitoso causará a exclusão da conta do usuário que enviou a enquete. Respeite os Termos e Condições do site.
        </AlertDescription>
      </Alert>

      {/* Create Poll Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Nova Enquete
          </CardTitle>
          <CardDescription>
            Crie uma enquete que será enviada para moderação antes de ser publicada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCreateForm ? (
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateForm(true)}>
                Criar Enquete
              </Button>
              <Dialog open={showTipsModal} onOpenChange={setShowTipsModal}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-primary/80 hover:bg-primary/70">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Dicas para criar sua enquete
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Guia de melhores práticas para criar uma boa enquete</DialogTitle>
                    <DialogDescription>
                      Saiba como criar uma enquete com mais chances de ser aprovada pelos nossos moderadores.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium mb-2">• O tema é livre. Você pode escolher absolutamente qualquer coisa</p>
                    </div>
                    
                    <div>
                      <p className="font-medium mb-2">• A enquete deve ter uma data de encerramento e obrigatoriamente deve ter uma solução.</p>
                      <p className="text-muted-foreground ml-4">Ou seja, não crie enquetes que envolvam opiniões e que não tenham uma resposta certa. Lembre-se que toda enquete é encerrada com um lado vencedor e um lado perdedor. Por isso é fundamental que toda enquete tenha um resultado claro.</p>
                    </div>

                    <div>
                      <p className="font-medium mb-2">• Você deve escolher entre dois tipos de enquete: Sim e Não ou Múltipla escolha (Opções Personalizadas).</p>
                      <p className="text-muted-foreground ml-4 mb-2">Exemplos de cada tipo de enquete:</p>
                      
                      <div className="bg-muted/50 p-3 rounded-lg ml-4 mb-2">
                        <p className="font-medium text-primary">Enquete Sim e Não:</p>
                        <p className="text-muted-foreground">Vini Jr vai ganhar a bola de ouro esse ano?</p>
                        <p className="text-xs text-muted-foreground mt-1">Respostas possíveis: Sim ou Não</p>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg ml-4">
                        <p className="font-medium text-primary">Enquete com Opções Personalizadas:</p>
                        <p className="text-muted-foreground">Quem vai ganhar a bola de ouro esse ano?</p>
                        <p className="text-xs text-muted-foreground mt-1">Repostas possíveis: Vini Jr, Dembele, Lamine Yamal, Raphinha.</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium mb-2">• A descrição da enquete é opcional.</p>
                      <p className="text-muted-foreground ml-4">Caso não queira preencher, não tem problema.</p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-center font-medium text-primary">
                        Boa sorte com sua nova enquete e esperamos que ela seja aprovada para ficar disponível no site!
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setShowTipsModal(false)}>
                      Fechar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <PollForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              isLoading={createPollMutation.isPending}
              submitText="Criar Enquete"
              isAdmin={false}
            />
          )}
        </CardContent>
      </Card>

      {/* My Polls List */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Enquetes</CardTitle>
          <CardDescription>
            Acompanhe o status das suas enquetes enviadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pollsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pollsError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Erro ao carregar enquetes</p>
              <p className="text-sm text-muted-foreground">{pollsError.message}</p>
              <Button onClick={() => refetchPolls()} className="mt-4">
                Tentar novamente
              </Button>
            </div>
          ) : myPolls.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Você ainda não criou nenhuma enquete.</p>
              <Button onClick={() => setShowCreateForm(true)} className="mt-4">
                Criar primeira enquete
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {myPolls.map((poll) => (
                <div key={poll.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{poll.title}</h3>
                      <p className="text-sm text-muted-foreground">{poll.question}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(poll.status)}
                      {poll.is_active ? (
                        <Badge variant="default">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Criado em: {format(new Date(poll.created_at), "PPP", { locale: ptBR })}</p>
                    <p>Encerra em: {format(new Date(poll.end_date), "PPP", { locale: ptBR })}</p>
                    {poll.category && (
                      <p>Categoria: {getCategoryLabel(poll.category)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPolls;