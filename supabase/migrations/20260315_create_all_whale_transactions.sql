-- Create the unified all_whale_transactions table
-- This is the primary table that the Sonar dashboard reads from.
-- The whale-transaction-monitor writes to this table alongside chain-specific tables.

CREATE TABLE IF NOT EXISTS all_whale_transactions (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_hash text NOT NULL UNIQUE,
  timestamp       timestamptz NOT NULL DEFAULT now(),
  blockchain      text NOT NULL,
  token_symbol    text,
  token_address   text DEFAULT '',
  classification  text NOT NULL DEFAULT 'TRANSFER',
  usd_value       double precision DEFAULT 0,
  whale_score     double precision DEFAULT 0,
  confidence      double precision DEFAULT 0,
  whale_address   text DEFAULT '',
  counterparty_address text DEFAULT '',
  counterparty_type text DEFAULT '',
  is_cex_transaction boolean DEFAULT false,
  from_address    text DEFAULT '',
  to_address      text DEFAULT '',
  from_label      text DEFAULT '',
  to_label        text DEFAULT '',
  reasoning       text DEFAULT '',
  analysis_phases integer DEFAULT 0,
  monitoring_group text DEFAULT ''
);

-- Indexes for common Sonar dashboard queries
CREATE INDEX IF NOT EXISTS idx_awt_timestamp ON all_whale_transactions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_awt_token_symbol ON all_whale_transactions (token_symbol);
CREATE INDEX IF NOT EXISTS idx_awt_classification ON all_whale_transactions (classification);
CREATE INDEX IF NOT EXISTS idx_awt_whale_address ON all_whale_transactions (whale_address);
CREATE INDEX IF NOT EXISTS idx_awt_blockchain ON all_whale_transactions (blockchain);
CREATE INDEX IF NOT EXISTS idx_awt_token_timestamp ON all_whale_transactions (token_symbol, timestamp DESC);

-- Allow the service role full access (no RLS needed - this is backend-only data)
ALTER TABLE all_whale_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON all_whale_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Backfill from existing chain-specific tables if they have data
INSERT INTO all_whale_transactions (
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
)
SELECT
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
FROM ethereum_transactions
WHERE NOT EXISTS (SELECT 1 FROM all_whale_transactions WHERE transaction_hash = ethereum_transactions.transaction_hash)
ON CONFLICT (transaction_hash) DO NOTHING;

INSERT INTO all_whale_transactions (
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
)
SELECT
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
FROM bitcoin_transactions
ON CONFLICT (transaction_hash) DO NOTHING;

INSERT INTO all_whale_transactions (
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
)
SELECT
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
FROM solana_transactions
ON CONFLICT (transaction_hash) DO NOTHING;

INSERT INTO all_whale_transactions (
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
)
SELECT
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
FROM polygon_transactions
ON CONFLICT (transaction_hash) DO NOTHING;

INSERT INTO all_whale_transactions (
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
)
SELECT
  transaction_hash, timestamp, blockchain, token_symbol, token_address,
  classification, usd_value, whale_score, confidence,
  whale_address, counterparty_address, counterparty_type,
  is_cex_transaction, from_address, to_address, from_label, to_label,
  reasoning, analysis_phases, monitoring_group
FROM xrp_transactions
ON CONFLICT (transaction_hash) DO NOTHING;
