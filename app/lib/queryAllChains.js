import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'

/**
 * Per-chain tables that the backend writes transactions into.
 * The old `all_whale_transactions` view only unions whale_transactions + alchemy_transactions,
 * but the backend now routes to these per-chain tables instead.
 */
const CHAIN_TABLES = [
  'ethereum_transactions',
  'bitcoin_transactions',
  'solana_transactions',
  'polygon_transactions',
  'xrp_transactions',
]

/**
 * Query all per-chain transaction tables in parallel and merge results.
 *
 * @param {function} buildQuery - receives (supabaseAdmin, tableName) and must return
 *   a Supabase query builder (before .execute()). The caller applies all filters.
 * @param {object} [opts]
 * @param {number} [opts.limit] - per-table row limit (default 1000)
 * @param {string} [opts.orderBy] - column to order by (default 'timestamp')
 * @param {boolean} [opts.ascending] - sort direction (default false = desc)
 * @param {number} [opts.globalLimit] - total rows to return after merging
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function queryAllChains(buildQuery, opts = {}) {
  const {
    limit = 1000,
    orderBy = 'timestamp',
    ascending = false,
    globalLimit,
  } = opts

  try {
    const results = await Promise.all(
      CHAIN_TABLES.map(async (table) => {
        try {
          let q = buildQuery(supabaseAdmin, table)
          q = q.order(orderBy, { ascending }).limit(limit)
          const { data, error } = await q
          if (error) {
            console.warn(`queryAllChains: ${table} error:`, error.message)
            return []
          }
          return data || []
        } catch (e) {
          console.warn(`queryAllChains: ${table} exception:`, e.message)
          return []
        }
      })
    )

    let merged = results.flat()

    // Sort merged results
    merged.sort((a, b) => {
      const aVal = a[orderBy]
      const bVal = b[orderBy]
      if (aVal < bVal) return ascending ? -1 : 1
      if (aVal > bVal) return ascending ? 1 : -1
      return 0
    })

    if (globalLimit) {
      merged = merged.slice(0, globalLimit)
    }

    return { data: merged, error: null }
  } catch (error) {
    console.error('queryAllChains unexpected error:', error)
    return { data: [], error }
  }
}

/**
 * Count rows across all per-chain tables matching the given filters.
 *
 * @param {function} buildQuery - receives (supabaseAdmin, tableName) and must return
 *   a Supabase query builder with { count: 'exact', head: true }.
 * @returns {Promise<{count: number, error: any}>}
 */
export async function countAllChains(buildQuery) {
  try {
    const results = await Promise.all(
      CHAIN_TABLES.map(async (table) => {
        try {
          const { count, error } = await buildQuery(supabaseAdmin, table)
          if (error) {
            console.warn(`countAllChains: ${table} error:`, error.message)
            return 0
          }
          return count || 0
        } catch (e) {
          console.warn(`countAllChains: ${table} exception:`, e.message)
          return 0
        }
      })
    )
    return { count: results.reduce((sum, c) => sum + c, 0), error: null }
  } catch (error) {
    console.error('countAllChains unexpected error:', error)
    return { count: 0, error }
  }
}

/**
 * Get the most recent timestamp across all chain tables.
 * Used for health checks / "LIVE" indicator.
 */
export async function getLatestTimestamp() {
  try {
    const results = await Promise.all(
      CHAIN_TABLES.map(async (table) => {
        try {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1)
          if (error || !data || !data[0]) return 0
          return new Date(data[0].timestamp).getTime()
        } catch {
          return 0
        }
      })
    )
    return Math.max(...results)
  } catch {
    return 0
  }
}

export { CHAIN_TABLES }
