export const formatCPF = (value: string): string => {
  // Remove tudo que não é dígito
  const numericValue = value.replace(/\D/g, '');
  
  // Aplica a máscara XXX.XXX.XXX-XX
  if (numericValue.length <= 11) {
    return numericValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  }
  
  return value;
};

export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const numericCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (numericCPF.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numericCPF)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numericCPF.charAt(i)) * (10 - i);
  }
  let firstVerifyDigit = 11 - (sum % 11);
  if (firstVerifyDigit >= 10) {
    firstVerifyDigit = 0;
  }
  
  if (parseInt(numericCPF.charAt(9)) !== firstVerifyDigit) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numericCPF.charAt(i)) * (11 - i);
  }
  let secondVerifyDigit = 11 - (sum % 11);
  if (secondVerifyDigit >= 10) {
    secondVerifyDigit = 0;
  }
  
  if (parseInt(numericCPF.charAt(10)) !== secondVerifyDigit) {
    return false;
  }
  
  return true;
};

export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};