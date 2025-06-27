/* ===== CONFIG ===== */
const COINS = ['solana','avalanche-2','dogecoin','pepe','bonk','injective-protocol']; // CoinGecko IDs
const COIN_SYMBOL = {solana:'SOL', 'avalanche-2':'AVAX', dogecoin:'DOGE', pepe:'PEPE', bonk:'BONK', 'injective-protocol':'INJ'};
const AUD = 'aud';
const DAY_MS = 86_400_000;
const START_TODAY      = dayjs('2025-06-28');          // first lump-sum
const FIRST_FORTNIGHT  = dayjs('2025-07-04');          // first recurring buy
const END_DATE         = START_TODAY.add(1,'year');
const FREQ_DAYS        = 14;
const BUY_AMOUNT_AUD   = 50;

/* ===== HELPERS ===== */
const q = sel => document.querySelector(sel);
const log = (...args) => q('#log').textContent += args.join(' ') + '\n';

async function fetchPrice(id, dateIso /*yyyy-mm-dd*/) {
  // CoinGecko "history" endpoint gives close price for that date in AUD
  const url = `https://api.coingecko.com/api/v3/coins/${id}/history?date=${dayjs(dateIso).format('DD-MM-YYYY')}&localization=false`;
  const r   = await fetch(url);
  if (!r.ok) throw Error(`${id} ${r.status}`);
  const json = await r.json();
  return json.market_data.current_price[AUD];
}

function buildSchedule() {
  const buys = [{t: START_TODAY, amt: BUY_AMOUNT_AUD}];
  let t = FIRST_FORTNIGHT.clone();
  while (t.isBefore(END_DATE) || t.isSame(END_DATE)) {
    buys.push({t: t.clone(), amt: BUY_AMOUNT_AUD});
    t = t.add(FREQ_DAYS,'day');
  }
  return buys;
}

async function valuePortfolio(buys) {
  const snapshot = []; // one entry per buy {date,totalInvested,valueNow}
  let invested = 0;

  for (const buy of buys) {
    invested += buy.amt;
    let basketValue = 0;

    for (const id of COINS) {
      const price = await fetchPrice(id, buy.t);   // AUD
      const unitsBought = (buy.amt / COINS.length) / price;
      basketValue += unitsBought * price;          // ≈ buy.amt/6
    }
    snapshot.push({t: buy.t, invested, value: basketValue});
    log(buy.t.format('YYYY-MM-DD'), 'invested', invested, 'value', basketValue.toFixed(2));
    await new Promise(r => setTimeout(r, 1400));   // polite rate-limit (10 calls/min)
  }
  return snapshot;
}

function plot(snapshot) {
  const ctx = q('#dcaChart');
  const labels = snapshot.map(s => s.t.format('MMM D YYYY'));
  new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Cumulative AUD Invested', data:snapshot.map(s=>s.invested)},
        {label:'Portfolio Market Value',  data:snapshot.map(s=>s.value)}
      ]
    },
    options:{
      plugins:{title:{display:true,text:'AUD-Denominated Portfolio vs Capital In'}} ,
      scales:{y:{beginAtZero:true}}
    }
  });
}

/* ===== MAIN ===== */
(async function(){
  const buys = buildSchedule().filter((_,idx)=> [0,6,13,25].includes(idx)); // plot 0-, 3-, 6-, 12-month marks
  const snap = await valuePortfolio(buys);
  plot(snap);
})();
