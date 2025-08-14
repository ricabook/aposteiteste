import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Vote, Trophy, Bitcoin, DollarSign, Users, Mic, Monitor, Atom, Globe, Gamepad2, Newspaper, Landmark } from 'lucide-react';
import SearchBar from './SearchBar';

const categories = [
  { id: 'trending', name: 'Trending', icon: TrendingUp },
  { id: 'new', name: 'New', icon: Vote },
  { id: 'comunidade', name: 'Comunidade', icon: Users },
  { id: 'politica', name: 'Política', icon: Landmark },
  { id: 'esportes', name: 'Esportes', icon: Trophy },
  { id: 'economia', name: 'Economia', icon: DollarSign },
  { id: 'entretenimento', name: 'Entretenimento', icon: Mic },
  { id: 'tecnologia', name: 'Tecnologia', icon: Monitor },
  { id: 'ciencia', name: 'Ciência', icon: Atom },
  { id: 'criptomoedas', name: 'Criptomoedas', icon: Bitcoin },
  { id: 'geopolitica', name: 'Geopolítica', icon: Globe },
  { id: 'esports', name: 'E-Sports', icon: Gamepad2 },
  { id: 'noticias', name: 'Notícias', icon: Newspaper },
];

interface CategoryTabsProps {
  children: (activeCategory: string) => React.ReactNode;
  onSearch?: (query: string) => void;
}

const CategoryTabs = ({ children, onSearch }: CategoryTabsProps) => {
  const [activeCategory, setActiveCategory] = useState('trending');

  return (
    <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
      <div className="w-full mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg border">
          {/* Barra de pesquisa - largura total em mobile, limitada em desktop */}
          {onSearch && (
            <div className="w-full sm:w-auto sm:min-w-[200px] sm:max-w-[280px] sm:flex-shrink-0">
              <SearchBar onSearch={onSearch} placeholder="Procurar apostas" />
            </div>
          )}
          
          {/* Categorias - scroll horizontal em mobile */}
          <div className="w-full sm:flex-1 overflow-x-auto">
            <TabsList className="flex sm:inline-flex w-max sm:w-auto h-auto p-1 min-w-full sm:min-w-0">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex flex-col xs:flex-row items-center gap-1 px-3 xs:px-4 py-2 text-xs xs:text-sm min-w-[60px] xs:min-w-0 whitespace-nowrap flex-1 sm:flex-initial"
                  >
                    <Icon className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
                    <span className="text-[10px] xs:text-xs leading-tight">{category.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>
      </div>
      
      {categories.map((category) => (
        <TabsContent key={category.id} value={category.id} className="mt-0">
          {children(category.id)}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default CategoryTabs;