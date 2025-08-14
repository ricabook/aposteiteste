import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { makeUniqueSlug } from '@/utils/slug';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart, Plus, Edit, Trash2, Calendar as CalendarIcon, Upload, Image, X, Award, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AdminPolls = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    question: '',
    end_date: new Date(),
    is_active: true,
    category: '' as 'politica' | 'esportes' | 'economia' | 'entretenimento' | 'tecnologia' | 'ciencia' | 'criptomoedas' | 'geopolitica' | '',
    image_url: '',
    creator_type: 'admin' as 'admin' | 'user',
    selected_user_id: '',
  });
  
  // Filters for admin polls management
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Approval mutations
  const approvePollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      const { error } = await supabase
        .from('polls')
        .update({
          status: 'approved',
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', pollId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Enquete aprovada e publicada",
      });
      refetchPolls();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectPollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      const { error } = await supabase
        .from('polls')
        .update({
          status: 'removed',
          is_active: false,
          removed_at: new Date().toISOString(),
        })
        .eq('id', pollId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Enquete rejeitada. Será removida automaticamente em 48 horas.",
      });
      refetchPolls();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const [numOptions, setNumOptions] = useState(2);
  const [options, setOptions] = useState(['', '']);
  const [optionImages, setOptionImages] = useState<string[]>(['', '']);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingOptionImage, setUploadingOptionImage] = useState<number | null>(null);

  // Fetch all polls with creator information
  const { data: allPolls = [], refetch: refetchPolls } = useQuery({
    queryKey: ['adminPolls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // For existing polls without created_by or status, treat them as admin-created and active
      return (data || []).map(poll => ({
        ...poll,
        status: poll.status || 'approved', // Default to approved for existing polls
        created_by: poll.created_by || null, // Keep null if not set
        isAdminCreated: !poll.created_by || poll.created_by === null // Treat polls without created_by as admin-created
      }));
    },
    enabled: isAdmin,
  });

  // Fetch users for creator selection
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-polls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .order('display_name');

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Filter polls based on status and date filters
  const filteredPolls = allPolls.filter(poll => {
    let statusMatch = true;
    
    if (statusFilter === 'all') {
      statusMatch = true;
    } else if (statusFilter === 'ativa') {
      statusMatch = poll.is_active && !poll.is_resolved;
    } else {
      statusMatch = poll.status === statusFilter;
    }
    
    let dateMatch = true;
    if (dateFilter !== 'all') {
      const pollDate = new Date(poll.created_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - pollDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          dateMatch = diffDays === 0;
          break;
        case 'week':
          dateMatch = diffDays <= 7;
          break;
        case 'month':
          dateMatch = diffDays <= 30;
          break;
      }
    }
    
    return statusMatch && dateMatch;
  });

  const polls = filteredPolls;

  // Mutação para cancelar apostas - MOVED TO TOP
  const cancelPollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      console.log('Starting cancel poll mutation for pollId:', pollId);
      console.log('User:', user);
      
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Current session:', session);
        console.log('Session error:', sessionError);
        
        if (!session?.access_token) {
          throw new Error('No valid session found. Please login again.');
        }
        
        console.log('Access token exists, length:', session.access_token.length);
        
        const { data, error } = await supabase.functions.invoke('cancel-poll', {
          body: { pollId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        console.log('Function response:', { data, error });
        
        if (error) {
          console.error('Function error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw new Error(`Edge Function Error: ${error.message}`);
        }
        
        if (!data?.success) {
          console.error('Function returned error:', data?.error);
          throw new Error(data?.error || 'Unknown error from function');
        }
        
        return data;
      } catch (err) {
        console.error('Catch block error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso",
        description: `Enquete cancelada! ${data.refundedUsers || 0} usuários receberam reembolso de R$ ${(data.totalRefunded || 0).toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to resolve poll and distribute winnings
  const resolvePollMutation = useMutation({
    mutationFn: async ({ pollId, winningOption }: { pollId: string; winningOption: string }) => {
      const { data, error } = await supabase.rpc('resolve_poll', {
        _poll_id: pollId,
        _winning_option: winningOption
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Enquete Resolvida",
        description: `${data.winners_count || 0} vencedores receberam R$ ${(data.total_payouts || 0).toFixed(2)} total (taxa: R$ ${(data.total_fees_collected || 0).toFixed(2)})`,
      });
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao resolver enquete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to reset poll
  const resetPollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('reset-poll', {
        body: { pollId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso",
        description: `Enquete reiniciada! ${data.refundedUsers || 0} usuários receberam reembolso de R$ ${(data.totalRefunded || 0).toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      question: '',
      end_date: new Date(),
      is_active: true,
      category: '' as 'politica' | 'esportes' | 'economia' | 'entretenimento' | 'tecnologia' | 'ciencia' | 'criptomoedas' | 'geopolitica' | '',
      image_url: '',
      creator_type: 'admin' as 'admin' | 'user',
      selected_user_id: '',
    });
    setNumOptions(2);
    setOptions(['', '']);
    setOptionImages(['', '']);
    setEditingPoll(null);
    setShowCreateForm(false);
    setShowEditDialog(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "Erro",
        description: "Imagem muito grande. Limite de 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('poll-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('poll-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optionIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou GIF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "Erro",
        description: "Imagem muito grande. Limite de 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingOptionImage(optionIndex);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `option-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('poll-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('poll-images')
        .getPublicUrl(filePath);

      console.log('Public URL:', urlData.publicUrl);

      const newOptionImages = [...optionImages];
      newOptionImages[optionIndex] = urlData.publicUrl;
      setOptionImages(newOptionImages);

      toast({
        title: "Sucesso",
        description: "Imagem da opção enviada com sucesso!",
      });
    } catch (error: any) {
      console.error('Error uploading option image:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar imagem da opção",
        variant: "destructive",
      });
    } finally {
      setUploadingOptionImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = options.filter(option => option.trim() !== '');
    if (!formData.title || !formData.question || validOptions.length < 2) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e pelo menos 2 opções",
        variant: "destructive",
      });
      return;
    }

    try {
      const optionsArray = validOptions.map((option, index) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D...
        label: option.trim()
      }));

      // Create option images array
      const optionImagesArray = optionsArray.map((_, index) => ({
        id: String.fromCharCode(65 + index),
        image_url: optionImages[index] || null
      })).filter(img => img.image_url); // Only include options with images

      const pollData = {
        title: formData.title,
        description: formData.description,
        question: formData.question,
        end_date: formData.end_date.toISOString(),
        is_active: formData.is_active,
        category: formData.category || null as any,
        image_url: formData.image_url,
        options: optionsArray,
        option_images: optionImagesArray.length > 0 ? optionImagesArray : null,
        option_a: optionsArray[0]?.label || '',
        option_b: optionsArray[1]?.label || '',
        created_by: formData.creator_type === 'admin' ? user?.id : formData.selected_user_id || user?.id,
      };

      if (editingPoll) {
        // Update existing poll with creator selection
        const updateData = {
          title: formData.title,
          description: formData.description,
          question: formData.question,
          end_date: formData.end_date.toISOString(),
          is_active: formData.is_active,
          category: formData.category || null as any,
          image_url: formData.image_url,
          options: optionsArray,
          option_images: optionImagesArray.length > 0 ? optionImagesArray : null,
          option_a: optionsArray[0]?.label || '',
          option_b: optionsArray[1]?.label || '',
          created_by: formData.creator_type === 'admin' ? user?.id : (formData.selected_user_id || editingPoll.created_by),
        };
        const { error } = await supabase
          .from('polls')
          .update(updateData)
          .eq('id', editingPoll.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Enquete atualizada com sucesso",
        });
      } else {
        // Create new poll by admin (automatically approved)
        const slug = await makeUniqueSlug(formData.title, supabase);
        const adminPollData = {
          title: formData.title,
          slug: slug,
          description: formData.description,
          question: formData.question,
          end_date: formData.end_date.toISOString(),
          is_active: formData.is_active,
          category: formData.category || null as any,
          image_url: formData.image_url,
          options: optionsArray,
          option_images: optionImagesArray.length > 0 ? optionImagesArray : null,
          option_a: optionsArray[0]?.label || '',
          option_b: optionsArray[1]?.label || '',
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          created_by: formData.creator_type === 'admin' ? user?.id : (formData.selected_user_id || user?.id),
        };

      const { error } = await supabase
        .from('polls')
        .insert(adminPollData);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Enquete criada e aprovada automaticamente",
      });
      }

      resetForm();
      refetchPolls();
    } catch (error) {
      console.error('Error saving poll:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a enquete",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (poll: any) => {
    setFormData({
      title: poll.title,
      description: poll.description || '',
      question: poll.question,
      end_date: new Date(poll.end_date),
      is_active: poll.is_active,
      category: poll.category || '',
      image_url: poll.image_url || '',
      creator_type: poll.created_by ? 'user' : 'admin',
      selected_user_id: poll.created_by || '',
    });
    
    // Carregar opções existentes
    if (poll.options && Array.isArray(poll.options)) {
      const pollOptions = poll.options.map((opt: any) => opt.label);
      setOptions(pollOptions);
      setNumOptions(pollOptions.length);
      
      // Carregar imagens das opções
      const pollOptionImages = new Array(pollOptions.length).fill('');
      if (poll.option_images && Array.isArray(poll.option_images)) {
        poll.option_images.forEach((img: any) => {
          const optionIndex = pollOptions.findIndex((_, index) => String.fromCharCode(65 + index) === img.id);
          if (optionIndex !== -1) {
            pollOptionImages[optionIndex] = img.image_url || '';
          }
        });
      }
      setOptionImages(pollOptionImages);
    } else {
      // Compatibilidade com enquetes antigas
      setOptions([poll.option_a || '', poll.option_b || '']);
      setOptionImages(['', '']);
      setNumOptions(2);
    }
    
    setEditingPoll(poll);
    setShowEditDialog(true);
  };

  const handleDelete = async (pollId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta enquete? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Enquete excluída com sucesso",
      });

      refetchPolls();
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a enquete",
        variant: "destructive",
      });
    }
  };

  const togglePollStatus = async (poll: any) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ is_active: !poll.is_active })
        .eq('id', poll.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Enquete ${!poll.is_active ? 'ativada' : 'desativada'} com sucesso`,
      });

      refetchPolls();
    } catch (error) {
      console.error('Error updating poll status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da enquete",
        variant: "destructive",
      });
    }
  };

  const handleCancelPoll = async (poll: any) => {
    if (poll.is_resolved) {
      toast({
        title: "Erro",
        description: "Não é possível cancelar uma enquete já resolvida",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja cancelar a enquete "${poll.title}"? Todos os valores apostados serão devolvidos aos usuários. Esta ação não pode ser desfeita.`)) {
      return;
    }

    cancelPollMutation.mutate(poll.id);
  };

  const handleResolvePoll = async (poll: any, winningOption: string) => {
    if (poll.is_resolved) {
      toast({
        title: "Erro",
        description: "Esta enquete já foi resolvida",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja resolver a enquete "${poll.title}" com a opção "${winningOption}" como vencedora? Os ganhos serão distribuídos automaticamente com taxa de 10%. Esta ação não pode ser desfeita.`)) {
      return;
    }

    resolvePollMutation.mutate({ pollId: poll.id, winningOption });
  };

  const handleResetPoll = async (poll: any) => {
    if (!confirm(`Tem certeza que deseja recomeçar a enquete "${poll.title}"? Todas as apostas serão reembolsadas e a enquete voltará ao estado inicial. Esta ação não pode ser desfeita.`)) {
      return;
    }

    resetPollMutation.mutate(poll.id);
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

  const isUserCreated = (poll: any) => {
    return !poll.user_roles || !poll.user_roles.some((role: any) => role.role === 'admin');
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <PieChart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Gerenciar Enquetes</h1>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Enquete
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="removed">Removida</SelectItem>
                  <SelectItem value="resolved">Resolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-filter">Período</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                Mostrando {polls.length} de {allPolls.length} enquetes
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPoll ? 'Editar Enquete' : 'Criar Nova Enquete'}
            </CardTitle>
            <CardDescription>
              {editingPoll ? 'Atualize as informações da enquete' : 'Preencha os dados para criar uma nova enquete'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Quem ganhará as eleições 2024?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Encerramento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs sm:text-sm",
                          !formData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formData.end_date ? (
                            format(formData.end_date, "PPP", { locale: ptBR })
                          ) : (
                            "Selecione uma data"
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="politica">Política</SelectItem>
                      <SelectItem value="esportes">Esportes</SelectItem>
                      <SelectItem value="economia">Economia</SelectItem>
                      <SelectItem value="entretenimento">Entretenimento</SelectItem>
                      <SelectItem value="tecnologia">Tecnologia</SelectItem>
                      <SelectItem value="ciencia">Ciência</SelectItem>
                      <SelectItem value="criptomoedas">Criptomoedas</SelectItem>
                      <SelectItem value="geopolitica">Geopolítica</SelectItem>
                      <SelectItem value="esports">E-Sports</SelectItem>
                      <SelectItem value="noticias">Notícias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Imagem da Enquete</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="flex-1 text-xs"
                    />
                    {uploadingImage && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                    )}
                  </div>
                  {formData.image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional da enquete..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Pergunta *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Ex: Qual candidato você acredita que ganhará?"
                />
              </div>

              {/* Creator Type Selection */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="creator_type">Tipo de Criador</Label>
                  <Select value={formData.creator_type} onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, creator_type: value, selected_user_id: value === 'admin' ? '' : formData.selected_user_id })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de criador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin (enquete administrativa)</SelectItem>
                      <SelectItem value="user">Usuário da comunidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.creator_type === 'user' && (
                  <div className="space-y-2">
                    <Label htmlFor="selected_user">Usuário Criador</Label>
                    <Select value={formData.selected_user_id} onValueChange={(value) => setFormData({ ...formData, selected_user_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.display_name || 'Usuário sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="num_options">Número de Opções *</Label>
                  <Select 
                    value={numOptions.toString()} 
                    onValueChange={(value) => {
                      const newNum = parseInt(value);
                      setNumOptions(newNum);
                      
                      // Ajustar array de opções
                      const newOptions = [...options];
                      const newOptionImages = [...optionImages];
                      if (newNum > options.length) {
                        // Adicionar opções vazias
                        for (let i = options.length; i < newNum; i++) {
                          newOptions.push('');
                          newOptionImages.push('');
                        }
                      } else {
                        // Remover opções extras
                        newOptions.splice(newNum);
                        newOptionImages.splice(newNum);
                      }
                      setOptions(newOptions);
                      setOptionImages(newOptionImages);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o número de opções" />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} opções
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                 <div className="space-y-3">
                   <Label>Opções da Enquete *</Label>
                   <div className="grid gap-3 sm:grid-cols-2">
                     {options.map((option, index) => (
                       <div key={index} className="space-y-2">
                         <Label htmlFor={`option_${index}`} className="text-xs sm:text-sm">
                           Opção {String.fromCharCode(65 + index)} *
                         </Label>
                         <Input
                           id={`option_${index}`}
                           value={option}
                           onChange={(e) => {
                             const newOptions = [...options];
                             newOptions[index] = e.target.value;
                             setOptions(newOptions);
                           }}
                           placeholder={`Ex: Opção ${String.fromCharCode(65 + index)}`}
                           className="text-xs sm:text-sm"
                         />
                       </div>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-3">
                   <Label>Imagens das Opções (Opcional)</Label>
                   <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                     {options.map((option, index) => (
                       <div key={index} className="space-y-2">
                         <Label htmlFor={`option_image_${index}`} className="text-xs sm:text-sm">
                           Imagem - Opção {String.fromCharCode(65 + index)}
                         </Label>
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                           <Input
                             id={`option_image_${index}`}
                             type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                             onChange={(e) => handleOptionImageUpload(e, index)}
                             disabled={uploadingOptionImage === index}
                             className="flex-1 text-xs"
                           />
                           {uploadingOptionImage === index && (
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                           )}
                         </div>
                         {optionImages[index] && (
                           <div className="mt-2 flex items-center space-x-2">
                             <img 
                               src={optionImages[index]} 
                               alt={`Preview opção ${String.fromCharCode(65 + index)}`} 
                               className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                             />
                             <Button
                               type="button"
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 const newOptionImages = [...optionImages];
                                 newOptionImages[index] = '';
                                 setOptionImages(newOptionImages);
                               }}
                             >
                               <X className="h-3 w-3 sm:h-4 sm:w-4" />
                             </Button>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Enquete ativa</Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="flex-1 text-sm">
                  {editingPoll ? 'Atualizar' : 'Criar'} Enquete
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="text-sm">
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Enquete</DialogTitle>
            <DialogDescription>
              Atualize as informações da enquete
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_title">Título *</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Quem ganhará as eleições 2024?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_end_date">Data de Encerramento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs sm:text-sm",
                        !formData.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {formData.end_date ? (
                          format(formData.end_date, "PPP", { locale: ptBR })
                        ) : (
                          "Selecione uma data"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="politica">Política</SelectItem>
                    <SelectItem value="esportes">Esportes</SelectItem>
                    <SelectItem value="economia">Economia</SelectItem>
                    <SelectItem value="entretenimento">Entretenimento</SelectItem>
                    <SelectItem value="tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="ciencia">Ciência</SelectItem>
                    <SelectItem value="criptomoedas">Criptomoedas</SelectItem>
                    <SelectItem value="geopolitica">Geopolítica</SelectItem>
                    <SelectItem value="esports">E-Sports</SelectItem>
                    <SelectItem value="noticias">Notícias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_image">Imagem da Enquete</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Input
                    id="edit_image"
                    type="file"
                     accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex-1 text-xs"
                  />
                  {uploadingImage && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                  )}
                </div>
                {formData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da enquete..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_question">Pergunta *</Label>
              <Input
                id="edit_question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Ex: Qual candidato você acredita que ganhará?"
              />
            </div>

            {/* Creator Type Selection for Edit */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_creator_type">Tipo de Criador</Label>
                <Select value={formData.creator_type} onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, creator_type: value, selected_user_id: value === 'admin' ? '' : formData.selected_user_id })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de criador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (enquete administrativa)</SelectItem>
                    <SelectItem value="user">Usuário da comunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.creator_type === 'user' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_selected_user">Usuário Criador</Label>
                  <Select value={formData.selected_user_id} onValueChange={(value) => setFormData({ ...formData, selected_user_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.display_name || 'Usuário sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_num_options">Número de Opções *</Label>
                <Select 
                  value={numOptions.toString()} 
                  onValueChange={(value) => {
                    const newNum = parseInt(value);
                    setNumOptions(newNum);
                    
                    // Ajustar array de opções
                    const newOptions = [...options];
                    const newOptionImages = [...optionImages];
                    if (newNum > options.length) {
                      // Adicionar opções vazias
                      for (let i = options.length; i < newNum; i++) {
                        newOptions.push('');
                        newOptionImages.push('');
                      }
                    } else {
                      // Remover opções extras
                      newOptions.splice(newNum);
                      newOptionImages.splice(newNum);
                    }
                    setOptions(newOptions);
                    setOptionImages(newOptionImages);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o número de opções" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} opções
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Opções da Enquete *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((option, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`edit_option_${index}`} className="text-xs sm:text-sm">
                        Opção {String.fromCharCode(65 + index)} *
                      </Label>
                      <Input
                        id={`edit_option_${index}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index] = e.target.value;
                          setOptions(newOptions);
                        }}
                        placeholder={`Ex: Opção ${String.fromCharCode(65 + index)}`}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Imagens das Opções (Opcional)</Label>
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {options.map((option, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`edit_option_image_${index}`} className="text-xs sm:text-sm">
                        Imagem - Opção {String.fromCharCode(65 + index)}
                      </Label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <Input
                          id={`edit_option_image_${index}`}
                          type="file"
                           accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) => handleOptionImageUpload(e, index)}
                          disabled={uploadingOptionImage === index}
                          className="flex-1 text-xs"
                        />
                        {uploadingOptionImage === index && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                        )}
                      </div>
                      {optionImages[index] && (
                        <div className="mt-2 flex items-center space-x-2">
                          <img 
                            src={optionImages[index]} 
                            alt={`Preview opção ${String.fromCharCode(65 + index)}`} 
                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptionImages = [...optionImages];
                              newOptionImages[index] = '';
                              setOptionImages(newOptionImages);
                            }}
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Enquete ativa</Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="flex-1 text-sm">
                Atualizar Enquete
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="text-sm">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Polls List */}
      <div className="grid gap-4">
        {polls.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma enquete encontrada</h3>
              <p className="text-muted-foreground text-center">
                Crie sua primeira enquete para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          polls.map((poll) => (
            <Card key={poll.id}>
              <CardContent className="flex items-start gap-4 p-4">
                {/* Poll Image */}
                <div className="flex-shrink-0">
                  {poll.image_url ? (
                    <img 
                      src={poll.image_url} 
                      alt={poll.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-lg flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Poll Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base break-words mb-2">
                    <Link 
                      to={`/poll/${poll.id}`}
                      className="hover:text-primary transition-colors underline-offset-4 hover:underline"
                    >
                      {poll.title}
                    </Link>
                  </h3>
                  
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant={poll.is_active ? "default" : "secondary"} className="text-xs">
                      {poll.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                    {getStatusBadge(poll.status)}
                    {poll.is_resolved && (
                      <Badge variant="outline" className="text-xs">Resolvida</Badge>
                    )}
                    {isUserCreated(poll) && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Por usuário
                      </Badge>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Criada: {format(new Date(poll.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                    <div>Encerra: {format(new Date(poll.end_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(poll)}
                  >
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog with all controls inside */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Enquete</DialogTitle>
            <DialogDescription>
              Atualize as informações da enquete e gerencie suas configurações
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Control */}
            <div className="space-y-2">
              <Label htmlFor="poll_status">Status da Enquete</Label>
              <Select 
                value={formData.is_active ? "active" : "inactive"} 
                onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Enquete Ativa</SelectItem>
                  <SelectItem value="inactive">Enquete Desativada (inativa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Form Fields */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_title">Título *</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Quem ganhará as eleições 2024?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_end_date">Data de Encerramento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs sm:text-sm",
                        !formData.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {formData.end_date ? (
                          format(formData.end_date, "PPP", { locale: ptBR })
                        ) : (
                          "Selecione uma data"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Continue with other form fields... */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="politica">Política</SelectItem>
                    <SelectItem value="esportes">Esportes</SelectItem>
                    <SelectItem value="economia">Economia</SelectItem>
                    <SelectItem value="entretenimento">Entretenimento</SelectItem>
                    <SelectItem value="tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="ciencia">Ciência</SelectItem>
                    <SelectItem value="criptomoedas">Criptomoedas</SelectItem>
                    <SelectItem value="geopolitica">Geopolítica</SelectItem>
                    <SelectItem value="esports">E-Sports</SelectItem>
                    <SelectItem value="noticias">Notícias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_image">Imagem da Enquete</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Input
                    id="edit_image"
                    type="file"
                     accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex-1 text-xs"
                  />
                  {uploadingImage && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                  )}
                </div>
                {formData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da enquete..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_question">Pergunta *</Label>
              <Input
                id="edit_question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Ex: Qual candidato você acredita que ganhará?"
              />
            </div>

            {/* Creator Type Selection for Edit */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_creator_type">Tipo de Criador</Label>
                <Select value={formData.creator_type} onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, creator_type: value, selected_user_id: value === 'admin' ? '' : formData.selected_user_id })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de criador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (enquete administrativa)</SelectItem>
                    <SelectItem value="user">Usuário da comunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.creator_type === 'user' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_selected_user">Usuário Criador</Label>
                  <Select value={formData.selected_user_id} onValueChange={(value) => setFormData({ ...formData, selected_user_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.display_name || 'Usuário sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_num_options">Número de Opções *</Label>
                <Select 
                  value={numOptions.toString()} 
                  onValueChange={(value) => {
                    const newNum = parseInt(value);
                    setNumOptions(newNum);
                    
                    // Ajustar array de opções
                    const newOptions = [...options];
                    const newOptionImages = [...optionImages];
                    if (newNum > options.length) {
                      // Adicionar opções vazias
                      for (let i = options.length; i < newNum; i++) {
                        newOptions.push('');
                        newOptionImages.push('');
                      }
                    } else {
                      // Remover opções extras
                      newOptions.splice(newNum);
                      newOptionImages.splice(newNum);
                    }
                    setOptions(newOptions);
                    setOptionImages(newOptionImages);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o número de opções" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} opções
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Opções da Enquete *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((option, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`edit_option_${index}`} className="text-xs sm:text-sm">
                        Opção {String.fromCharCode(65 + index)} *
                      </Label>
                      <Input
                        id={`edit_option_${index}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index] = e.target.value;
                          setOptions(newOptions);
                        }}
                        placeholder={`Ex: Opção ${String.fromCharCode(65 + index)}`}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Imagens das Opções (Opcional)</Label>
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {options.map((option, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`edit_option_image_${index}`} className="text-xs sm:text-sm">
                        Imagem - Opção {String.fromCharCode(65 + index)}
                      </Label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <Input
                          id={`edit_option_image_${index}`}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) => handleOptionImageUpload(e, index)}
                          disabled={uploadingOptionImage === index}
                          className="flex-1 text-xs"
                        />
                        {uploadingOptionImage === index && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                        )}
                      </div>
                      {optionImages[index] && (
                        <div className="mt-2 flex items-center space-x-2">
                          <img 
                            src={optionImages[index]} 
                            alt={`Preview opção ${String.fromCharCode(65 + index)}`} 
                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptionImages = [...optionImages];
                              newOptionImages[index] = '';
                              setOptionImages(newOptionImages);
                            }}
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleResetPoll(editingPoll)}
                disabled={resetPollMutation.isPending}
                className="w-full"
              >
                {resetPollMutation.isPending && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                )}
                Reiniciar Enquete
              </Button>
              
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => handleDelete(editingPoll?.id)}
                className="w-full"
              >
                Excluir Enquete
              </Button>

              {/* Resolve Poll Card */}
              {editingPoll && !editingPoll.is_resolved && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resolver Enquete</CardTitle>
                      <CardDescription>
                        Defina o resultado da enquete. Esta ação distribuirá os ganhos automaticamente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {editingPoll.options ? (
                          editingPoll.options.map((option: any, index: number) => (
                            <Button
                              key={option.id}
                              variant="outline"
                              onClick={() => handleResolvePoll(editingPoll, option.id)}
                              disabled={resolvePollMutation.isPending}
                              className="justify-start"
                            >
                              {resolvePollMutation.isPending && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              )}
                              Declarar "{option.label}" vencedora
                            </Button>
                          ))
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleResolvePoll(editingPoll, 'A')}
                              disabled={resolvePollMutation.isPending}
                              className="justify-start"
                            >
                              {resolvePollMutation.isPending && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              )}
                              Declarar "A" vencedora
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleResolvePoll(editingPoll, 'B')}
                              disabled={resolvePollMutation.isPending}
                              className="justify-start"
                            >
                              {resolvePollMutation.isPending && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              )}
                              Declarar "B" vencedora
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="flex-1 text-sm">
                Atualizar Enquete
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="text-sm">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPolls;