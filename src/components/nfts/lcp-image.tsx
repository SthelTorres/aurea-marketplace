import { useLayoutEffect, useRef } from 'react'

const LCP_ID = 'aurea-lcp'

export function LcpImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const slotRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const existing = document.getElementById(LCP_ID)
    const image = existing instanceof HTMLImageElement ? existing : document.createElement('img')
    image.id = LCP_ID
    image.src = src
    image.alt = alt
    image.width = 640
    image.height = 640
    image.decoding = 'sync'
    image.fetchPriority = 'high'
    image.className = className
    image.hidden = false
    image.removeAttribute('style')
    slot.replaceChildren(image)
    return () => {
      image.hidden = true
      document.body.appendChild(image)
    }
  }, [alt, className, src])

  return <div ref={slotRef} className={className} />
}
