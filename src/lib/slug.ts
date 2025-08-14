export function slugifyPt(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

import { supabase } from '@/integrations/supabase/client';

export async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || 'enquete';
  let n = 2;
  while (true) {
    const { data, error } = await supabase
      .from('polls')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (error) break; // se a coluna ainda não existir
    if (!data) break;
    slug = `${base}-${n++}`;
  }
  return slug;
}
