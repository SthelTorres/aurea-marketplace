import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
  .regex(/\d/, 'A senha deve conter ao menos um número.')

export const emailSchema = z.string().trim().email('Informe um e-mail válido.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.'),
})

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirme a senha.'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não conferem.',
})

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.').refine((value) => value.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),
  email: emailSchema,
  walletId: z.string().min(1, 'Selecione uma carteira.'),
  network: z.enum(['ethereum', 'polygon'], { required_error: 'Selecione a rede.' }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Aceite os termos para continuar.' }) }),
})

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres.'),
  email: emailSchema,
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não conferem.',
})

export const walletSchema = z.object({
  label: z.string().trim().min(2, 'Informe um nome para a carteira.'),
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres hexadecimais.'),
})

export const couponSchema = z.object({
  code: z.string().trim().min(1, 'Informe um cupom.'),
})
