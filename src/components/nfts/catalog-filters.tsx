import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, CATEGORY_LABELS, SORT_LABELS, SORTS, type CatalogFilters as Filters, type CatalogSort, type NftCategory } from '@/shared/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function CatalogFilters({
  value,
  onChange,
  idPrefix,
}: {
  value: Filters
  onChange: (value: Filters) => void
  idPrefix: string
}) {
  const patch = (next: Partial<Filters>) => onChange({ ...value, ...next, page: 1 })
  const searchId = `${idPrefix}-search`
  const minId = `${idPrefix}-min`
  const maxId = `${idPrefix}-max`
  const sortId = `${idPrefix}-sort`

  return (
    <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
      <div>
        <Label htmlFor={searchId}>Buscar</Label>
        <SearchField key={value.q ?? ''} id={searchId} initial={value.q ?? ''} onDebounced={(query) => patch({ q: query || undefined })} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Categoria</legend>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${idPrefix}-category`} checked={!value.category} onChange={() => patch({ category: undefined })} />
            Todas
          </label>
          {CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${idPrefix}-category`}
                checked={value.category === category}
                onChange={() => patch({ category: category as NftCategory })}
              />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={minId}>Preço mín.</Label>
          <Input id={minId} inputMode="decimal" value={value.minPrice ?? ''} placeholder="0.00" onChange={(event) => patch({ minPrice: event.target.value || undefined })} />
        </div>
        <div>
          <Label htmlFor={maxId}>Preço máx.</Label>
          <Input id={maxId} inputMode="decimal" value={value.maxPrice ?? ''} placeholder="10" onChange={(event) => patch({ maxPrice: event.target.value || undefined })} />
        </div>
      </div>
      <div>
        <Label htmlFor={sortId}>Ordenação</Label>
        <Select value={value.sort ?? 'newest'} onValueChange={(sort) => patch({ sort: sort as CatalogSort })}>
          <SelectTrigger id={sortId} aria-label="Ordenação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((sort) => <SelectItem key={sort} value={sort}>{SORT_LABELS[sort]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </form>
  )
}

function SearchField({ id, initial, onDebounced }: { id: string; initial: string; onDebounced: (query: string) => void }) {
  const [query, setQuery] = useState(initial)
  const onDebouncedRef = useRef(onDebounced)
  useEffect(() => {
    onDebouncedRef.current = onDebounced
  })
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() === initial) return
      onDebouncedRef.current(query.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, initial])
  return <Input id={id} type="search" value={query} placeholder="Nome, criador ou descrição" onChange={(event) => setQuery(event.target.value)} />
}
