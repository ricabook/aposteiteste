import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Users, Mail, FileText, CreditCard, Search } from 'lucide-react';
import { formatCPF } from '@/lib/cpfValidation';
import { CommentModerationCard } from '@/components/CommentModerationCard';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  nome_completo: string | null;
  cpf: string | null;
  wallet_balance: number;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
}

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();

  // Fetch all users profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: isAdmin,
  });

  // Since we can't directly query auth.users, we'll get user emails from the auth metadata
  // stored in profiles during registration
  const { data: authData = [] } = useQuery({
    queryKey: ['adminAuthUsers'],
    queryFn: async () => {
      // For now, we'll use a workaround by calling the auth admin functions
      // This would require admin privileges in a real scenario
      const emails: AuthUser[] = [];
      
      // For each profile, we can try to get user info through admin functions
      // But since we can't directly access auth.users table from client side,
      // we'll need to rely on the email being stored in metadata or implement an edge function
      
      return emails;
    },
    enabled: false, // Disabled for now since we can't access auth.users directly
  });

  // Filter profiles based on search term
  const filteredProfiles = profiles.filter(profile => {
    const searchLower = searchTerm.toLowerCase();
    const nomeCompleto = profile.nome_completo?.toLowerCase() || '';
    const displayName = profile.display_name?.toLowerCase() || '';
    const cpf = profile.cpf?.replace(/\D/g, '') || ''; // Remove formatting for search
    const searchCpf = searchTerm.replace(/\D/g, ''); // Remove formatting from search term
    
    return (
      nomeCompleto.includes(searchLower) ||
      displayName.includes(searchLower) ||
      cpf.includes(searchCpf) ||
      profile.user_id.toLowerCase().includes(searchLower)
    );
  });

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Resumo de Usuários</span>
          </CardTitle>
          <CardDescription>
            Total de usuários registrados na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredProfiles.length}</div>
          <p className="text-xs text-muted-foreground">
            {searchTerm ? `Usuários encontrados (${profiles.length} total)` : 'Usuários cadastrados'}
          </p>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Informações detalhadas de todos os usuários registrados
          </CardDescription>
          
          {/* Search Field */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, CPF ou ID do usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <span className="text-sm text-muted-foreground">
                {filteredProfiles.length} resultado(s)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Nome de Exibição</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>ID do Usuário</TableHead>
                    <TableHead>Saldo da Carteira</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'Nenhum usuário encontrado para esta pesquisa' : 'Nenhum usuário encontrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.nome_completo || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {profile.display_name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.cpf ? formatCPF(profile.cpf) : '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {profile.user_id.slice(0, 8)}...
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              R$ {Number(profile.wallet_balance).toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment Moderation Card */}
      <CommentModerationCard />
    </div>
  );
};

export default AdminUsers;