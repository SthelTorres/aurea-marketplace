import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ErrorState } from '@/components/common/error-state'
import { PageHeading } from '@/components/common/page-heading'
import { Field } from '@/components/forms/field'
import { describedBy } from '@/lib/field-id'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
import { changePassword, getProfile, updateProfile } from '@/lib/api/profile'
import { apiErrorMessage, apiFieldErrors } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { passwordChangeSchema, profileSchema } from '@/lib/schemas'
import type { User } from '@/shared/types'

async function resizeAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível processar a imagem.')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function ProfilePage() {
  const { session } = useSession()
  const userId = session?.user.id ?? ''
  const profile = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: ({ signal }) => getProfile(signal),
    enabled: Boolean(userId),
  })
  if (profile.isLoading) return <Skeleton className="h-96" />
  if (profile.isError || !profile.data) return <ErrorState retry={() => void profile.refetch()} />
  return <ProfileEditor key={profile.data.updatedAt} user={profile.data} userId={userId} />
}

function ProfileEditor({ user, userId }: { user: User; userId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, email: user.email } })
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const [avatar, setAvatar] = useState(user.avatarUrl)
  const [avatarError, setAvatarError] = useState('')

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.profile(userId), user)
      queryClient.setQueryData(queryKeys.session, (current: { user: typeof user } | null | undefined) => current ? { ...current, user } : current)
      toast.success('Perfil atualizado.')
    },
    onError: (error) => {
      const fields = apiFieldErrors(error)
      if (fields.name) form.setError('name', { message: fields.name })
      if (fields.email) form.setError('email', { message: fields.email })
      if (fields.avatarUrl) setAvatarError(fields.avatarUrl)
      if (!fields.name && !fields.email && !fields.avatarUrl) form.setError('root', { message: apiErrorMessage(error) })
    },
  })
  const password = useMutation({
    mutationFn: (values: z.infer<typeof passwordChangeSchema>) => changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Senha alterada.')
    },
    onError: (error) => {
      const fields = apiFieldErrors(error)
      if (fields.currentPassword) passwordForm.setError('currentPassword', { message: fields.currentPassword })
      if (fields.newPassword) passwordForm.setError('newPassword', { message: fields.newPassword })
      if (!fields.currentPassword && !fields.newPassword) passwordForm.setError('root', { message: apiErrorMessage(error) })
    },
  })

  const profileErrors = form.formState.errors
  const passwordErrors = passwordForm.formState.errors

  return (
    <>
      <PageHeading title="Seu perfil" description="Seus dados permanecem salvos depois de atualizar a página." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="mb-5 text-xl font-bold">Dados pessoais</h2>
            <form className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => save.mutate({ ...values, avatarUrl: avatar ?? '' }))}>
              {profileErrors.root ? <p role="alert" className="text-sm text-[#FFD0C2]">{profileErrors.root.message}</p> : null}
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  {avatar ? <AvatarImage src={avatar} alt={`Avatar de ${user.name}`} /> : null}
                  <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <label htmlFor="avatar" className="mb-2 block text-sm font-medium">Foto</label>
                  <Input id="avatar" type="file" accept="image/*" aria-invalid={Boolean(avatarError)} aria-describedby={avatarError ? 'avatar-error' : undefined} onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    void resizeAvatar(file).then((url) => { setAvatar(url); setAvatarError('') }).catch(() => setAvatarError('Não foi possível ler a imagem.'))
                  }} />
                  {avatar ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setAvatar(undefined)}>Remover foto</Button> : null}
                  {avatarError ? <p id="avatar-error" className="mt-1 text-sm text-[#FFD0C2]">{avatarError}</p> : null}
                </div>
              </div>
              <Field id="profile-name" label="Nome" error={profileErrors.name?.message}>
                <Input id="profile-name" aria-invalid={Boolean(profileErrors.name)} aria-describedby={describedBy('profile-name', profileErrors.name?.message)} {...form.register('name')} />
              </Field>
              <Field id="profile-email" label="E-mail" error={profileErrors.email?.message}>
                <Input id="profile-email" type="email" aria-invalid={Boolean(profileErrors.email)} aria-describedby={describedBy('profile-email', profileErrors.email?.message)} {...form.register('email')} />
              </Field>
              <Button type="submit" disabled={save.isPending}>Salvar perfil</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="mb-5 text-xl font-bold">Alterar senha</h2>
            <form className="space-y-4" noValidate onSubmit={passwordForm.handleSubmit((values) => password.mutate(values))}>
              {passwordErrors.root ? <p role="alert" className="text-sm text-[#FFD0C2]">{passwordErrors.root.message}</p> : null}
              <Field id="currentPassword" label="Senha atual" error={passwordErrors.currentPassword?.message}>
                <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={Boolean(passwordErrors.currentPassword)} aria-describedby={describedBy('currentPassword', passwordErrors.currentPassword?.message)} {...passwordForm.register('currentPassword')} />
              </Field>
              <Field id="newPassword" label="Nova senha" error={passwordErrors.newPassword?.message}>
                <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(passwordErrors.newPassword)} aria-describedby={describedBy('newPassword', passwordErrors.newPassword?.message)} {...passwordForm.register('newPassword')} />
              </Field>
              <Field id="confirmNewPassword" label="Confirmar nova senha" error={passwordErrors.confirmPassword?.message}>
                <Input id="confirmNewPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(passwordErrors.confirmPassword)} aria-describedby={describedBy('confirmNewPassword', passwordErrors.confirmPassword?.message)} {...passwordForm.register('confirmPassword')} />
              </Field>
              <Button type="submit" disabled={password.isPending}>Alterar senha</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
