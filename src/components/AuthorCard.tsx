import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Users } from 'lucide-react';

interface AuthorCardProps {
  isAdminCreated: boolean;
}

export const AuthorCard = ({ isAdminCreated }: AuthorCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Autor da Enquete</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-3">
          {isAdminCreated ? (
            <>
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Esta é uma enquete oficial e foi criada pela equipe da Apostei.org
              </p>
            </>
          ) : (
            <>
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Esta é uma enquete da comunidade e foi criada por um usuário do site.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};