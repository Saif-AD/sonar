import { NextResponse } from 'next/server'
import { queryAllChains, countAllChains } from '@/app/lib/queryAllChains'

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

export async function GET(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const sinceHours = Number(searchParams.get('sinceHours') || '24')
  const rawMin = searchParams.get('minUsd')
  const rawMax = searchParams.get('maxUsd')
  const token = (searchParams.get('token') || '').trim()
  const side = (searchParams.get('side') || '').trim().toLowerCase()
  const chain = (searchParams.get('chain') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limitRaw = parseInt(searchParams.get('limit') || '100', 10)
  const limit = Math.min(Math.max(1, limitRaw), 100)
  const from = (page - 1) * limit

  const sinceIso = (!Number.isNaN(sinceHours) && sinceHours > 0)
    ? new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
    : null

  const minUsd = rawMin === null || rawMin === '' ? undefined : Number(rawMin)
  const maxUsd = rawMax === null || rawMax === '' ? undefined : Number(rawMax)

  function addFilters(q) {
    if (sinceIso) q = q.gte('timestamp', sinceIso)
    if (typeof minUsd === 'number' && !Number.isNaN(minUsd)) q = q.gte('usd_value', minUsd)
    if (typeof maxUsd === 'number' && !Number.isNaN(maxUsd)) q = q.lte('usd_value', maxUsd)
    if (token) q = q.ilike('token_symbol', `%${token}%`)
    if (side) q = q.ilike('classification', side)
    if (chain) q = q.ilike('blockchain', `%${chain}%`)
    return q
  }

  function buildDataQuery(sb, table) {
    let q = sb
      .from(table)
      .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,to_address,whale_address,counterparty_type,whale_score')
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')
      .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    return addFilters(q)
  }

  function buildCountQuery(sb, table) {
    let q = sb
      .from(table)
      .select('*', { count: 'estimated', head: true })
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')
      .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    return addFilters(q)
  }

  // Fetch data and count in parallel
  const [dataResult, countResult] = await Promise.all([
    queryAllChains(buildDataQuery, {
      globalLimit: from + limit,
      orderBy: 'timestamp',
      ascending: false,
    }),
    countAllChains(buildCountQuery),
  ])

  if (dataResult.error) return NextResponse.json({ error: dataResult.error.message }, { status: 500 })

  // Slice for pagination in JS since queryAllChains doesn't support .range()
  const data = dataResult.data.slice(from, from + limit)

  return NextResponse.json({ data, page, limit, count: countResult.count })
}
