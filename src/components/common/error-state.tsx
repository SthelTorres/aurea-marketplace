import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({ retry, title = 'Não foi possível carregar', description = 'Verifique sua conexão e tente novamente.' }: { retry?: () => void; title?: string; description?: string }) {
  return <div role="alert" className="flex min-h-64 flex-col items-center justify-center text-center"><AlertTriangle className="mb-4 size-10 text-[#FF7A1A]" /><h2 className="text-xl font-bold">{title}</h2><p className="my-3 max-w-md text-[#B8AA96]">{description}</p>{retry && <Button onClick={retry}>Tentar novamente</Button>}</div>
}
