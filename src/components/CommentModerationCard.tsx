import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Clock, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
  poll_id: string;
  profiles: {
    display_name: string | null;
    nome_completo: string | null;
  } | null;
  polls: {
    title: string;
  } | null;
}

export const CommentModerationCard = () => {
  const queryClient = useQueryClient();

  // Fetch all pending comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['admin-comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_comments')
        .select(`
          *,
          profiles:user_id (display_name, nome_completo),
          polls:poll_id (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Approve comment mutation
  const approveMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('poll_comments')
        .update({ status: 'approved' })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      queryClient.invalidateQueries({ queryKey: ['poll-comments'] });
      toast({
        title: "Comentário aprovado",
        description: "O comentário foi aprovado e agora está visível na enquete.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao aprovar comentário",
        description: `Erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reject comment mutation
  const rejectMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('poll_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      toast({
        title: "Comentário rejeitado",
        description: "O comentário foi rejeitado e removido.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao rejeitar comentário",
        description: `Erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (commentId: string) => {
    approveMutation.mutate(commentId);
  };

  const handleReject = (commentId: string) => {
    rejectMutation.mutate(commentId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingComments = comments.filter(c => c.status === 'pending');
  const otherComments = comments.filter(c => c.status !== 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Moderação de Comentários</span>
          {pendingComments.length > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {pendingComments.length} pendente(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum comentário encontrado.
          </p>
        ) : (
          <>
            {/* Pending Comments */}
            {pendingComments.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-yellow-700">
                  Comentários Pendentes ({pendingComments.length})
                </h4>
                {pendingComments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(comment.profiles?.display_name || comment.profiles?.nome_completo || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {comment.profiles?.display_name || comment.profiles?.nome_completo || 'Usuário'}
                            </span>
                            {getStatusBadge(comment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Enquete: {comment.polls?.title || 'Título não disponível'}
                          </p>
                          <p className="text-sm mb-2">{comment.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(comment.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(comment.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Other Comments */}
            {otherComments.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">
                  Histórico de Comentários ({otherComments.length})
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {otherComments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-3">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(comment.profiles?.display_name || comment.profiles?.nome_completo || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {comment.profiles?.display_name || comment.profiles?.nome_completo || 'Usuário'}
                            </span>
                            {getStatusBadge(comment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Enquete: {comment.polls?.title || 'Título não disponível'}
                          </p>
                          <p className="text-sm mb-1">{comment.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
