import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, Image, X, Calendar as CalendarIcon, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isValidImageFile, isValidFileSize } from '@/lib/imageValidation';

interface PollFormProps {
  formData: {
    title: string;
    description: string;
    question: string;
    end_date: Date;
    is_active?: boolean;
    category: string;
    image_url: string;
    poll_type?: 'A' | 'B';
  };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent, submitData?: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitText?: string;
  isAdmin?: boolean;
}

export const PollForm = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  submitText = "Criar Enquete",
  isAdmin = false 
}: PollFormProps) => {
  const [numOptions, setNumOptions] = useState(2);
  const [options, setOptions] = useState(['', '']);
  const [optionImages, setOptionImages] = useState<string[]>(['', '']);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingOptionImage, setUploadingOptionImage] = useState<number | null>(null);

  // Update options when poll type changes
  const handlePollTypeChange = (type: 'A' | 'B') => {
    setFormData({ ...formData, poll_type: type });
    
    if (type === 'A') {
      // Tipo A: SIM e NÃO fixos
      setOptions(['Sim', 'Não']);
      setNumOptions(2);
      setOptionImages(['', '']);
    } else {
      // Tipo B: Opções personalizadas
      setOptions(['', '']);
      setNumOptions(2);
      setOptionImages(['', '']);
    }
  };

  const addOption = () => {
    if (numOptions < 10) {
      setNumOptions(numOptions + 1);
      setOptions([...options, '']);
      setOptionImages([...optionImages, '']);
    }
  };

  const removeOption = () => {
    if (numOptions > 2) {
      setNumOptions(numOptions - 1);
      setOptions(options.slice(0, -1));
      setOptionImages(optionImages.slice(0, -1));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou GIF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
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

      const { error: uploadError } = await supabase.storage
        .from('poll-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('poll-images')
        .getPublicUrl(filePath);

      const newOptionImages = [...optionImages];
      newOptionImages[optionIndex] = urlData.publicUrl;
      setOptionImages(newOptionImages);

      toast({
        title: "Sucesso",
        description: "Imagem da opção enviada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar imagem da opção",
        variant: "destructive",
      });
    } finally {
      setUploadingOptionImage(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = options.filter(option => option.trim() !== '');
    
    // Validações baseadas no tipo
    if (formData.poll_type === 'A') {
      if (options[0] !== 'Sim' || options[1] !== 'Não') {
        toast({
          title: "Erro",
          description: "Para enquetes do tipo SIM/NÃO, as opções devem ser exatamente 'Sim' e 'Não'",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (validOptions.length < 2 || validOptions.length > 10) {
        toast({
          title: "Erro",
          description: "Para enquetes de opções personalizadas, deve haver entre 2 e 10 opções válidas",
          variant: "destructive",
        });
        return;
      }
    }

    if (!formData.title || !formData.question) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Pass options data to parent
    const submitData = {
      options: validOptions,
      optionImages: optionImages.filter(img => img.trim() !== '')
    };
    
    onSubmit(e, submitData);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Tipo de Enquete */}
      <div>
        <Label className="text-base font-medium">Tipo de Enquete *</Label>
        <RadioGroup 
          value={formData.poll_type || 'B'} 
          onValueChange={handlePollTypeChange}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="A" id="type-a" />
            <Label htmlFor="type-a" className="cursor-pointer">
              Tipo A - SIM e NÃO
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="B" id="type-b" />
            <Label htmlFor="type-b" className="cursor-pointer">
              Tipo B - Opções Personalizadas (2-10 opções)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Quem será o próximo presidente?"
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Categoria</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
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
      </div>

      <div>
        <Label htmlFor="question">Pergunta *</Label>
        <Input
          id="question"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          placeholder="A pergunta principal da enquete"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição detalhada da enquete (opcional)"
          rows={3}
        />
      </div>

      {/* End Date */}
      <div>
        <Label>Data de Encerramento *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.end_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.end_date ? format(formData.end_date, "PPP", { locale: ptBR }) : "Selecione uma data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.end_date}
              onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
              initialFocus
              disabled={(date) => date < new Date()}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Image Upload */}
      <div>
        <Label>Imagem da Enquete</Label>
        <div className="mt-2">
          {formData.image_url ? (
            <div className="relative inline-block">
              <img
                src={formData.image_url}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={() => setFormData({ ...formData, image_url: '' })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploadingImage}
                className="relative"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploadingImage ? 'Enviando...' : 'Enviar Imagem'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div>
        <div className="flex items-center justify-between">
          <Label>Opções *</Label>
          {formData.poll_type === 'B' && (
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeOption}
                disabled={numOptions <= 2}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {numOptions}/10
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={numOptions >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-4 mt-2">
          {Array.from({ length: numOptions }, (_, i) => (
            <div key={i} className="space-y-2">
              <Label htmlFor={`option-${i}`}>
                Opção {String.fromCharCode(65 + i)}
                {formData.poll_type === 'A' && (i === 0 ? ' (Sim)' : ' (Não)')}
              </Label>
              <Input
                id={`option-${i}`}
                value={options[i] || ''}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[i] = e.target.value;
                  setOptions(newOptions);
                }}
                placeholder={
                  formData.poll_type === 'A' 
                    ? (i === 0 ? 'Sim' : 'Não')
                    : `Opção ${String.fromCharCode(65 + i)}`
                }
                required
                disabled={formData.poll_type === 'A'}
              />
              
              {/* Option Image Upload */}
              <div className="ml-4">
                <Label className="text-sm text-muted-foreground">Imagem da opção (opcional)</Label>
                {optionImages[i] ? (
                  <div className="relative inline-block mt-1">
                    <img
                      src={optionImages[i]}
                      alt={`Preview opção ${String.fromCharCode(65 + i)}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                      onClick={() => {
                        const newImages = [...optionImages];
                        newImages[i] = '';
                        setOptionImages(newImages);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingOptionImage === i}
                    className="relative mt-1"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => handleOptionImageUpload(e, i)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {uploadingOptionImage === i ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2" />
                    ) : (
                      <Image className="h-3 w-3 mr-2" />
                    )}
                    {uploadingOptionImage === i ? 'Enviando...' : 'Adicionar Imagem'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex space-x-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : submitText}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};