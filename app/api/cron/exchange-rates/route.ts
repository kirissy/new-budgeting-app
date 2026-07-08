import { createServiceClient } from '@/lib/supabase/service'
import { CURRENCIES } from '@/lib/currencies'

const SUPPORTED_CODES = new Set(CURRENCIES.map((c) => c.code))

interface OpenErApiResponse {
  result: string
  rates?: Record<string, number>
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('base_currency')
  if (profilesError) {
    return Response.json({ error: profilesError.message }, { status: 500 })
  }

  const baseCurrencies = [...new Set((profiles ?? []).map((p) => p.base_currency))]
    .filter((code) => SUPPORTED_CODES.has(code))

  let basesUpdated = 0
  let ratesUpserted = 0

  for (const base of baseCurrencies) {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
    if (!res.ok) continue

    const json = (await res.json()) as OpenErApiResponse
    if (json.result !== 'success' || !json.rates) continue

    const rows = Object.entries(json.rates)
      .filter(([code]) => code !== base && SUPPORTED_CODES.has(code))
      .map(([target_currency, rate]) => ({
        base_currency: base,
        target_currency,
        rate,
        fetched_at: new Date().toISOString(),
      }))

    if (rows.length === 0) continue

    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert(rows, { onConflict: 'base_currency,target_currency' })
    if (upsertError) continue

    basesUpdated++
    ratesUpserted += rows.length
  }

  return Response.json({ basesUpdated, ratesUpserted })
}
