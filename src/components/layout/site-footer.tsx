import { Link } from '@tanstack/react-router'

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[#2C1A14]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-[#B8AA96] sm:grid-cols-3 md:px-8">
        <div>
          <h2 className="mb-3 font-bold uppercase tracking-wide text-[#F8F0D8]">Marketplace</h2>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:text-[#F8F0D8]">Explorar</Link></li>
            <li><Link to="/carrinho" className="hover:text-[#F8F0D8]">Carrinho</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-bold uppercase tracking-wide text-[#F8F0D8]">Conta</h2>
          <ul className="space-y-2">
            <li><Link to="/login" search={{ redirect: undefined }} className="hover:text-[#F8F0D8]">Entrar</Link></li>
            <li><Link to="/cadastro" search={{ redirect: undefined }} className="hover:text-[#F8F0D8]">Cadastro</Link></li>
            <li><Link to="/perfil" className="hover:text-[#F8F0D8]">Perfil</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-bold uppercase tracking-wide text-[#F8F0D8]">Ajuda</h2>
          <ul className="space-y-2">
            <li><span>Suporte</span> <span className="text-[#F8F0D8]">Em breve</span></li>
            <li><span>Termos</span> <span className="text-[#F8F0D8]">Em breve</span></li>
          </ul>
        </div>
      </div>
      <p className="px-4 pb-8 text-center text-xs text-[#B8AA96]">© 2026 Áurea Marketplace</p>
    </footer>
  )
}
