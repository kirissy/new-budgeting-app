import { createClient } from '@/lib/supabase/server'

export async function getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('target_currency, rate')
    .eq('base_currency', baseCurrency)

  const rates: Record<string, number> = { [baseCurrency]: 1 }
  data?.forEach((r) => { rates[r.target_currency] = r.rate })
  return rates
}
