export function PageHeading({ title, description }: { title: string; description?: string }) {
  return <header className="mb-8"><h1 tabIndex={-1} className="text-3xl font-black uppercase tracking-tight outline-none md:text-4xl">{title}</h1>{description && <p className="mt-2 text-[#B8AA96]">{description}</p>}</header>
}
