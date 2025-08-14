'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';
import { PasswordValidationResult, getPasswordStrengthLevel } from '@/lib/passwordValidation';

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidationResult;
  password: string;
}

export function PasswordStrengthIndicator({ validation, password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrengthLevel(validation.score);

  const criteriaItems = [
    { key: 'minLength', label: 'Pelo menos 8 caracteres', met: validation.criteria.minLength },
    { key: 'hasUppercase', label: 'Uma letra maiúscula (A-Z)', met: validation.criteria.hasUppercase },
    { key: 'hasLowercase', label: 'Uma letra minúscula (a-z)', met: validation.criteria.hasLowercase },
    { key: 'hasNumbers', label: 'Um número (0-9)', met: validation.criteria.hasNumbers },
    { key: 'hasSpecialChars', label: 'Um caractere especial (!@#$%^&*)', met: validation.criteria.hasSpecialChars },
    { key: 'noSequentialChars', label: 'Sem sequências óbvias', met: validation.criteria.noSequentialChars },
    { key: 'noCommonPasswords', label: 'Não é uma senha comum', met: validation.criteria.noCommonPasswords },
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Força da Senha</span>
          <span className={`text-sm font-medium ${strength.color}`}>
            {strength.label}
          </span>
        </CardTitle>
        <Progress value={validation.score} className="h-2" />
        <div className="text-xs text-muted-foreground">
          {validation.score}/100 pontos
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Requisitos:
          </div>
          {criteriaItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-xs">
              {item.met ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={item.met ? 'text-green-700' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        {validation.feedback.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="text-xs font-medium text-amber-800 mb-2">
              Sugestões para melhorar:
            </div>
            <ul className="text-xs text-amber-700 space-y-1">
              {validation.feedback.map((feedback, index) => (
                <li key={index}>• {feedback}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.isValid && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-xs font-medium text-green-800">
              ✓ Senha forte! Sua conta estará bem protegida.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}