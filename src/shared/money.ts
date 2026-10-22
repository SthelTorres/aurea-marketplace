const ETH_DECIMALS = 8
const ETH_SCALE = 10n ** BigInt(ETH_DECIMALS)

export function parseEth(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value
  const normalized = String(value).trim()
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(normalized)
  if (!match) throw new Error(`Valor ETH inválido: ${normalized}`)

  const [, sign, integer, fraction = ''] = match
  if (fraction.length > ETH_DECIMALS) {
    throw new Error(`ETH aceita no máximo ${ETH_DECIMALS} casas decimais`)
  }
  const units = BigInt(integer) * ETH_SCALE + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
  return sign === '-' ? -units : units
}

export function formatEth(units: bigint): string {
  const sign = units < 0n ? '-' : ''
  const absolute = units < 0n ? -units : units
  const integer = absolute / ETH_SCALE
  const fraction = (absolute % ETH_SCALE).toString().padStart(ETH_DECIMALS, '0').replace(/0+$/, '')
  return `${sign}${integer}${fraction ? `.${fraction}` : ''}`
}

export function multiplyEth(value: string, multiplier: number | string): string {
  const factor = parseEth(String(multiplier))
  return formatEth((parseEth(value) * factor) / ETH_SCALE)
}

export function multiplyEthByInt(value: string, quantity: number): string {
  return formatEth(parseEth(value) * BigInt(quantity))
}

export function percentOfEth(value: string, percent: number): string {
  return formatEth((parseEth(value) * BigInt(percent)) / 100n)
}

export function minEth(values: string[]): string {
  const first = values[0]
  if (first === undefined) throw new Error('Lista de valores ETH vazia')
  let best = parseEth(first)
  for (const value of values.slice(1)) {
    const parsed = parseEth(value)
    if (parsed < best) best = parsed
  }
  return formatEth(best)
}

export function ethEqual(left: string, right: string): boolean {
  return parseEth(left) === parseEth(right)
}

export const NETWORK_FEES = {
  ethereum: '0.0021',
  polygon: '0.0004',
} as const

export function addEth(...values: string[]): string {
  return formatEth(values.reduce((total, value) => total + parseEth(value), 0n))
}

export function subtractEth(value: string, ...values: string[]): string {
  return formatEth(values.reduce((total, item) => total - parseEth(item), parseEth(value)))
}
