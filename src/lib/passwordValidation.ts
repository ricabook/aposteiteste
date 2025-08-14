export interface PasswordStrengthCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  noSequentialChars: boolean;
  noCommonPasswords: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  criteria: PasswordStrengthCriteria;
  feedback: string[];
}

// Lista de senhas comuns que devem ser rejeitadas
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  '12345678', '111111', '1234567890', 'admin', 'letmein', 'welcome',
  'monkey', 'dragon', 'princess', 'superman', 'batman', 'brasil',
  'brazil', 'senha', 'senha123', '12345', 'qwertyuiop', 'asdfghjkl',
  'zxcvbnm', 'iloveyou', 'football', 'master', 'access', 'shadow'
];

// Sequências comuns a serem evitadas
const SEQUENTIAL_PATTERNS = [
  '123', '234', '345', '456', '567', '678', '789', '890',
  'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij',
  'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio', 'iop',
  'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
  'zxc', 'xcv', 'cvb', 'vbn', 'bnm'
];

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const criteria: PasswordStrengthCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noSequentialChars: !hasSequentialCharacters(password),
    noCommonPasswords: !isCommonPassword(password)
  };

  const feedback: string[] = [];
  let score = 0;

  // Verificação de comprimento (peso: 20 pontos)
  if (criteria.minLength) {
    score += 20;
    if (password.length >= 12) score += 10; // Bonus para senhas muito longas
  } else {
    feedback.push('A senha deve ter pelo menos 8 caracteres');
  }

  // Verificação de maiúsculas (peso: 15 pontos)
  if (criteria.hasUppercase) {
    score += 15;
  } else {
    feedback.push('Adicione pelo menos uma letra maiúscula (A-Z)');
  }

  // Verificação de minúsculas (peso: 15 pontos)
  if (criteria.hasLowercase) {
    score += 15;
  } else {
    feedback.push('Adicione pelo menos uma letra minúscula (a-z)');
  }

  // Verificação de números (peso: 15 pontos)
  if (criteria.hasNumbers) {
    score += 15;
  } else {
    feedback.push('Adicione pelo menos um número (0-9)');
  }

  // Verificação de caracteres especiais (peso: 15 pontos)
  if (criteria.hasSpecialChars) {
    score += 15;
  } else {
    feedback.push('Adicione pelo menos um caractere especial (!@#$%^&*)');
  }

  // Verificação de sequências (peso: 10 pontos)
  if (criteria.noSequentialChars) {
    score += 10;
  } else {
    feedback.push('Evite sequências óbvias como "123" ou "abc"');
  }

  // Verificação de senhas comuns (peso: 10 pontos)
  if (criteria.noCommonPasswords) {
    score += 10;
  } else {
    feedback.push('Esta senha é muito comum. Escolha algo mais único');
  }

  // Bonus por diversidade de caracteres
  if (score >= 80) {
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars >= 6) score += 5;
  }

  const isValid = Object.values(criteria).every(Boolean) && score >= 80;

  return {
    isValid,
    score: Math.min(100, score),
    criteria,
    feedback
  };
}

function hasSequentialCharacters(password: string): boolean {
  const lowercasePassword = password.toLowerCase();
  
  // Verifica sequências comuns
  for (const pattern of SEQUENTIAL_PATTERNS) {
    if (lowercasePassword.includes(pattern)) {
      return true;
    }
  }

  // Verifica sequências repetitivas (ex: "aaa", "111")
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      return true;
    }
  }

  return false;
}

function isCommonPassword(password: string): boolean {
  const lowercasePassword = password.toLowerCase();
  return COMMON_PASSWORDS.some(common => 
    lowercasePassword === common || lowercasePassword.includes(common)
  );
}

export function getPasswordStrengthLevel(score: number): {
  level: 'weak' | 'fair' | 'good' | 'strong';
  label: string;
  color: string;
} {
  if (score < 40) {
    return { level: 'weak', label: 'Fraca', color: 'text-red-600' };
  } else if (score < 60) {
    return { level: 'fair', label: 'Regular', color: 'text-orange-600' };
  } else if (score < 80) {
    return { level: 'good', label: 'Boa', color: 'text-yellow-600' };
  } else {
    return { level: 'strong', label: 'Forte', color: 'text-green-600' };
  }
}