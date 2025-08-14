import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password } = await req.json()

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validação de senha forte
    const validation = validatePasswordStrength(password)

    return new Response(
      JSON.stringify({
        success: true,
        ...validation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Password validation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function validatePasswordStrength(password: string) {
  let score = 0
  const criteria = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false,
    noSequentialChars: true,
    noCommonPasswords: true,
  }
  const feedback: string[] = []

  // Lista de senhas comuns
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    '12345678', '111111', '1234567890', 'admin', 'letmein', 'welcome',
    'monkey', 'dragon', 'princess', 'superman', 'batman', 'brasil',
    'brazil', 'senha', 'senha123', '12345', 'qwertyuiop', 'asdfghjkl',
    'zxcvbnm', 'iloveyou', 'football', 'master', 'access', 'shadow'
  ]

  // Sequências comuns
  const sequentialPatterns = [
    '123', '234', '345', '456', '567', '678', '789', '890',
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij',
    'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio', 'iop',
    'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
    'zxc', 'xcv', 'cvb', 'vbn', 'bnm'
  ]

  // Verificação de comprimento (peso: 20 pontos)
  criteria.minLength = password.length >= 8
  if (criteria.minLength) {
    score += 20
    if (password.length >= 12) score += 10 // Bonus para senhas muito longas
  } else {
    feedback.push('A senha deve ter pelo menos 8 caracteres')
  }

  // Verificação de maiúsculas (peso: 15 pontos)
  criteria.hasUppercase = /[A-Z]/.test(password)
  if (criteria.hasUppercase) {
    score += 15
  } else {
    feedback.push('Adicione pelo menos uma letra maiúscula (A-Z)')
  }

  // Verificação de minúsculas (peso: 15 pontos)
  criteria.hasLowercase = /[a-z]/.test(password)
  if (criteria.hasLowercase) {
    score += 15
  } else {
    feedback.push('Adicione pelo menos uma letra minúscula (a-z)')
  }

  // Verificação de números (peso: 15 pontos)
  criteria.hasNumbers = /\d/.test(password)
  if (criteria.hasNumbers) {
    score += 15
  } else {
    feedback.push('Adicione pelo menos um número (0-9)')
  }

  // Verificação de caracteres especiais (peso: 15 pontos)
  criteria.hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  if (criteria.hasSpecialChars) {
    score += 15
  } else {
    feedback.push('Adicione pelo menos um caractere especial (!@#$%^&*)')
  }

  // Verificação de sequências (peso: 10 pontos)
  const lowercasePassword = password.toLowerCase()
  let hasSequential = false
  
  for (const pattern of sequentialPatterns) {
    if (lowercasePassword.includes(pattern)) {
      hasSequential = true
      break
    }
  }

  // Verifica sequências repetitivas (ex: "aaa", "111")
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      hasSequential = true
      break
    }
  }

  criteria.noSequentialChars = !hasSequential
  if (criteria.noSequentialChars) {
    score += 10
  } else {
    feedback.push('Evite sequências óbvias como "123" ou "abc"')
  }

  // Verificação de senhas comuns (peso: 10 pontos)
  let isCommon = false
  for (const common of commonPasswords) {
    if (lowercasePassword === common || lowercasePassword.includes(common)) {
      isCommon = true
      break
    }
  }

  criteria.noCommonPasswords = !isCommon
  if (criteria.noCommonPasswords) {
    score += 10
  } else {
    feedback.push('Esta senha é muito comum. Escolha algo mais único')
  }

  // Bonus por diversidade de caracteres
  if (score >= 80) {
    const uniqueChars = new Set(lowercasePassword).size
    if (uniqueChars >= 6) score += 5
  }

  const isValid = Object.values(criteria).every(Boolean) && score >= 80

  return {
    isValid,
    score: Math.min(100, score),
    criteria,
    feedback
  }
}