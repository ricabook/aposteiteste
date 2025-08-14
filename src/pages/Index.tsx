import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import PollList from '@/components/PollList';
import AgeVerificationModal from '@/components/AgeVerificationModal';

interface IndexProps {
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

const Index = ({ searchQuery = '', onSearch }: IndexProps) => {
  const { loading } = useAuth();
  const [isAgeVerified, setIsAgeVerified] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAgeVerified) {
    return (
      <AgeVerificationModal 
        onVerified={(verified) => setIsAgeVerified(verified)} 
      />
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6">
      <PollList searchQuery={searchQuery} onSearch={onSearch} />
    </div>
  );
};

export default Index;
