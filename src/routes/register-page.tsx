import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeading } from '@/components/common/page-heading'
import { Field } from '@/components/forms/field'
import { describedBy } from '@/lib/field-id'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSession } from '@/hooks/use-session'
import { apiErrorMessage, apiFieldErrors } from '@/lib/api-error'
import { safeInternalPath } from '@/lib/paths'
import { registerSchema } from '@/lib/schemas'

export function RegisterPage() {
  const { register: registerAccount } = useSession()
  const navigate = useNavigate()
  const search = useSearch({ from: '/cadastro' })
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })
  const formError = form.formState.errors.root?.message
  const errors = form.formState.errors

  return (
    <Card className="mx-auto max-w-md">
      <CardContent>
        <PageHeading title="Crie sua conta" description="A senha precisa de 8 caracteres, com letra e número." />
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            form.clearErrors('root')
            registerAccount.mutate(
              { name: values.name, email: values.email, password: values.password },
              {
                onSuccess: () => void navigate({ href: safeInternalPath(search.redirect) }),
                onError: (error) => {
                  const fields = apiFieldErrors(error)
                  if (fields.name) form.setError('name', { message: fields.name })
                  if (fields.email) form.setError('email', { message: fields.email })
                  if (fields.password) form.setError('password', { message: fields.password })
                  if (!fields.email && !fields.password && !fields.name) form.setError('root', { message: apiErrorMessage(error) })
                },
              },
            )
          })}
        >
          {formError ? <p role="alert" className="text-sm text-[#FFD0C2]">{formError}</p> : null}
          <Field id="name" label="Nome" error={errors.name?.message}>
            <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name', errors.name?.message)} {...form.register('name')} />
          </Field>
          <Field id="email" label="E-mail" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email', errors.email?.message)} {...form.register('email')} />
          </Field>
          <Field id="password" label="Senha" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={describedBy('password', errors.password?.message)} {...form.register('password')} />
          </Field>
          <Field id="confirmPassword" label="Confirmar senha" error={errors.confirmPassword?.message}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={describedBy('confirmPassword', errors.confirmPassword?.message)} {...form.register('confirmPassword')} />
          </Field>
          <Button className="w-full" type="submit" disabled={registerAccount.isPending}>{registerAccount.isPending ? 'Criando conta…' : 'Cadastrar'}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-[#B8AA96]">
          Já possui conta? <Link to="/login" search={{ redirect: search.redirect }} className="text-[#FF7A1A]">Entre</Link>
        </p>
      </CardContent>
    </Card>
  )
}
