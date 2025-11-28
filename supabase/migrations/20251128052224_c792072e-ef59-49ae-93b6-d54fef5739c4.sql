-- Update token_info to reflect Solana network
UPDATE token_info 
SET 
  contract_address = 'LCTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  token_name = 'LearnChain Token',
  token_symbol = 'LCT',
  decimals = 9,
  total_supply = 1000000000
WHERE token_symbol = 'LCT';

-- If no token exists, insert it
INSERT INTO token_info (token_name, token_symbol, contract_address, decimals, total_supply)
SELECT 'LearnChain Token', 'LCT', 'LCTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 9, 1000000000
WHERE NOT EXISTS (SELECT 1 FROM token_info WHERE token_symbol = 'LCT');