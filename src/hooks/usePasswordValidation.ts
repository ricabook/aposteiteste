'use client';

import { useState, useMemo } from 'react';
import { validatePasswordStrength, PasswordValidationResult } from '@/lib/passwordValidation';

export function usePasswordValidation(password: string) {
  const validation = useMemo((): PasswordValidationResult => {
    if (!password) {
      return {
        isValid: false,
        score: 0,
        criteria: {
          minLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumbers: false,
          hasSpecialChars: false,
          noSequentialChars: true,
          noCommonPasswords: true,
        },
        feedback: []
      };
    }
    
    return validatePasswordStrength(password);
  }, [password]);

  return validation;
}