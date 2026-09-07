// research/probes/test_movers.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  const cats = [
    'top_gainer', 'top_loser', 'top_volume', 'top_value', 'top_frequency',
    'most_active', 'top_net_foreign_buy', 'top_net_foreign_sell',
    'net_foreign_buy', 'net_foreign_sell', 'top_turnover', 'top_active_value', 'top_active_volume'
  ];

  for (const c of cats) {
    try {
      const res = await bridge.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/market-mover?category=${c}`, 'at');
      console.log(`[PASS] mover category=${c} -> count: ${res.data?.mover_list?.length || 0}`);
      if (res.data?.mover_list?.length > 0) {
        console.log(`  Sample: ${res.data.mover_list[0].symbol} change: ${res.data.mover_list[0].change} (${res.data.mover_list[0].change_percentage}%)`);
      }
    } catch(e) {
      console.log(`[FAIL] mover category=${c} -> ${e.message.slice(0, 70)}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
