export function slugify(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function makeUniqueSlug(baseTitle: string, supabase: any): Promise<string> {
  const root = slugify(baseTitle) || 'enquete';
  let attempt = root;
  let n = 1;
  while (true) {
    const { data, error } = await supabase
      .from('polls')
      .select('id')
      .eq('slug', attempt)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return attempt;
    n += 1;
    attempt = `${root}-${n}`;
  }
}
