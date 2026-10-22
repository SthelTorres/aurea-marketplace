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
import { loginSchema } from '@/lib/schemas'

export function LoginPage() {
  const { login } = useSession()
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const formError = form.formState.errors.root?.message

  return (
    <Card className="mx-auto max-w-md">
      <CardContent>
        <PageHeading title="Boas-vindas de volta" description="Entre para continuar sua coleção." />
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            form.clearErrors('root')
            login.mutate(values, {
              onSuccess: () => void navigate({ href: safeInternalPath(search.redirect) }),
              onError: (error) => {
                const fields = apiFieldErrors(error)
                if (fields.email) form.setError('email', { message: fields.email })
                if (fields.password) form.setError('password', { message: fields.password })
                form.setError('root', { message: fields.form ?? apiErrorMessage(error) })
              },
            })
          })}
        >
          {formError ? <p role="alert" className="text-sm text-[#FFD0C2]">{formError}</p> : null}
          <Field id="email" label="E-mail" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={describedBy('email', form.formState.errors.email?.message)} {...form.register('email')} />
          </Field>
          <Field id="password" label="Senha" error={form.formState.errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={describedBy('password', form.formState.errors.password?.message)} {...form.register('password')} />
          </Field>
          <Button className="w-full" type="submit" disabled={login.isPending}>{login.isPending ? 'Entrando…' : 'Entrar'}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-[#B8AA96]">
          Ainda não tem conta? <Link to="/cadastro" search={{ redirect: search.redirect }} className="text-[#FF7A1A]">Cadastre-se</Link>
        </p>
      </CardContent>
    </Card>
  )
}
