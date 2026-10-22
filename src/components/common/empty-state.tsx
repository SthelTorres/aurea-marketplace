import { PackageOpen } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#4A2C22] p-8 text-center"><PackageOpen className="mb-4 size-10 text-[#F26B1D]" /><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-[#B8AA96]">{description}</p></div>
}
