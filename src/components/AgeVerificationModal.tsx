import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

interface AgeVerificationModalProps {
  onVerified: (isAdult: boolean) => void;
}

const AgeVerificationModal = ({ onVerified }: AgeVerificationModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRestrictionMessage, setShowRestrictionMessage] = useState(false);

  useEffect(() => {
    const isVerified = localStorage.getItem('ageVerified');
    if (isVerified !== 'true') {
      setIsOpen(true);
    } else {
      onVerified(true);
    }
  }, [onVerified]);

  const handleYes = () => {
    localStorage.setItem('ageVerified', 'true');
    setIsOpen(false);
    onVerified(true);
  };

  const handleNo = () => {
    setShowRestrictionMessage(true);
    onVerified(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <div className="flex flex-col items-center space-y-6 p-4">
          <Logo />
          
          {!showRestrictionMessage ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Verificação de Idade
                </h2>
                <p className="text-muted-foreground">
                  Você possui mais de 18 anos?
                </p>
              </div>
              
              <div className="flex gap-4 w-full">
                <Button 
                  onClick={handleYes}
                  className="flex-1"
                  variant="default"
                >
                  Sim
                </Button>
                <Button 
                  onClick={handleNo}
                  className="flex-1"
                  variant="outline"
                >
                  Não
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-destructive">
                Acesso Restrito
              </h2>
              <p className="text-muted-foreground">
                Desculpe. Você é muito jovem para consumir esse conteúdo.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgeVerificationModal;