import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { isValidImageFile, isValidFileSize } from '@/lib/imageValidation';

interface Banner {
  id: string;
  title: string;
  button_text: string;
  button_url?: string;
  background_color: string;
  background_gradient?: string;
  image_url?: string;
  position: number;
  is_active: boolean;
}

const AdminBanners = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    button_text: '',
    button_url: '',
    background_color: '#6366f1',
    background_gradient: '',
    image_url: '',
    position: 1,
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: banners = [] } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('banners')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Banner criado",
        description: "Banner criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar banner: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('banners')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingBanner(null);
      toast({
        title: "Banner atualizado",
        description: "Banner atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar banner: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast({
        title: "Banner excluído",
        description: "Banner excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir banner: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      button_text: '',
      button_url: '',
      background_color: '#6366f1',
      background_gradient: '',
      image_url: '',
      position: 1,
      is_active: true,
    });
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      button_text: banner.button_text,
      button_url: banner.button_url || '',
      background_color: banner.background_color,
      background_gradient: banner.background_gradient || '',
      image_url: banner.image_url || '',
      position: banner.position,
      is_active: banner.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida (JPEG, PNG, GIF ou WebP).",
        variant: "destructive",
      });
      return;
    }

    if (!isValidFileSize(file, 10)) {
      toast({
        title: "Erro",
        description: "Imagem muito grande. Limite de 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `banner-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('poll-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('poll-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
      
      toast({
        title: "Upload realizado",
        description: "Imagem enviada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Erro ao enviar imagem: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este banner?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Banners</h1>
          <p className="text-muted-foreground">Gerencie os mini banners da página inicial</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingBanner(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Editar Banner' : 'Novo Banner'}
              </DialogTitle>
              <DialogDescription>
                {editingBanner ? 'Edite as informações do banner' : 'Crie um novo banner para a página inicial'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="button_text">Texto do Botão</Label>
                <Input
                  id="button_text"
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="button_url">URL do Botão</Label>
                <Input
                  id="button_url"
                  value={formData.button_url}
                  onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <Label htmlFor="background_color">Cor de Fundo</Label>
                <Input
                  id="background_color"
                  type="color"
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="background_gradient">Gradiente (CSS)</Label>
                <Input
                  id="background_gradient"
                  value={formData.background_gradient}
                  onChange={(e) => setFormData({ ...formData, background_gradient: e.target.value })}
                  placeholder="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                />
              </div>
              
              <div>
                <Label>Imagem do Banner</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? 'Enviando...' : 'Ou cole a URL:'}
                    </span>
                  </div>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="/lovable-uploads/... ou URL completa"
                    disabled={uploading}
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-20 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="position">Posição</Label>
                <Input
                  id="position"
                  type="number"
                  min="1"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingBanner ? 'Atualizar' : 'Criar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{banner.title}</CardTitle>
                  <CardDescription>
                    Posição: {banner.position} | 
                    Status: {banner.is_active ? 'Ativo' : 'Inativo'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(banner)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(banner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div 
                  className="w-20 h-20 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{
                    background: banner.background_gradient || banner.background_color
                  }}
                >
                  Preview
                </div>
                <div className="flex-1">
                  <p><strong>Botão:</strong> {banner.button_text}</p>
                  <p><strong>URL:</strong> {banner.button_url || 'Nenhuma'}</p>
                  {banner.image_url && (
                    <p><strong>Imagem:</strong> {banner.image_url}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminBanners;