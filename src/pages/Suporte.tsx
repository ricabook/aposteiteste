import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

export default function Suporte() {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [assunto, setAssunto] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    if (!nome.trim() || !email.trim() || !titulo.trim() || !assunto.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('support_tickets').insert([
        {
          user_id: user.id,
          nome,
          email,
          titulo,
          assunto,
          status: 'Aberto',
        },
      ]);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Ticket enviado com sucesso.' });

      // Limpa o formulário
      setTitulo('');
      setAssunto('');
      setNome('');
      setEmail('');
    } catch (err: any) {
      console.error('Erro ao criar ticket:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível enviar o ticket.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Suporte</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          placeholder="Seu e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <Textarea
          placeholder="Assunto"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </Button>
      </form>
    </div>
  );
}
