import { useLiveMessage } from '@/lib/announce'

export function LiveRegion() {
  const message = useLiveMessage()
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}
