import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <p className="text-[#FF7A1A]">Erro 404</p>
      <h1 tabIndex={-1} className="mt-2 text-4xl font-black uppercase outline-none md:text-5xl">Página não encontrada</h1>
      <Button className="mt-8" asChild><Link to="/">Voltar ao início</Link></Button>
    </div>
  )
}
