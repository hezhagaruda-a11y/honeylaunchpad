import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";
const FACTORY_ADDRESS = '0x9c6CF08f7F5D278508A939091933D7fE85557a95';
const SPARK_DEX_POOL = '0x288728f3d24F9CC63771eB463f1D144d24C493F0';
const RPC_URL = 'https://rpc.sepolia.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);
const FACTORY_ABI = [
  "event PoolCreated(address indexed poolAddress, address indexed saleToken, address treasury, uint256 startTime, uint256 endTime, uint256 totalSupplyForSale)",
  "function getAllPools() view returns (address[])"
];
const POOL_ABI = [
  "event Purchase(address indexed buyer, uint256 amount, uint256 cost)"
];
const PAIR_ABI = [
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)"
];
const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
const sparkPool = new ethers.Contract(SPARK_DEX_POOL, PAIR_ABI, provider);
const recentDexSwaps = [];
const recentIdoEvents = [];
// Real-time Spark DEX swaps
sparkPool.on("Swap", (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {
  const timeStr = new Date().toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  const action = amount0Out > 0 ? "Buy HONEY" : "Sell HONEY";
  const amount = amount0Out > 0 ? ethers.formatUnits(amount0Out, 18) : ethers.formatUnits(amount1Out, 18);
  recentDexSwaps.unshift({
    time: timeStr,
    action: action,
    amount: parseFloat(amount).toLocaleString('en-US') + " HONEY"
  });
  if (recentDexSwaps.length > 8) recentDexSwaps.pop();
  renderTraffic();
});
// Real-time IDO events
factory.on("PoolCreated", (poolAddress, saleToken, treasury, startTime, endTime, totalSupplyForSale) => {
  const timeStr = new Date().toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  recentIdoEvents.unshift({
    time: timeStr,
    pool: poolAddress,
    event: "New IDO Launched"
  });
  if (recentIdoEvents.length > 8) recentIdoEvents.pop();
  renderTraffic();
});
window.loadTraffic = async function loadTraffic() {
  try {
    const pools = await factory.getAllPools().catch(() => []);
    pools.forEach(pool => {
      recentIdoEvents.unshift({
        time: "Existing",
        pool: pool,
        event: "Pool Available"
      });
    });
  } catch (e) {
    console.warn("Could not load existing pools", e);
  }
  renderTraffic();
};
function renderTraffic() {
  const dexBody = document.getElementById("dexBody");
  dexBody.innerHTML = "";
  recentDexSwaps.forEach(swap => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${swap.time}</td><td>${swap.action}</td><td><strong>${swap.amount}</strong></td>`;
    dexBody.appendChild(tr);
  });
  const idoBody = document.getElementById("idoBody");
  idoBody.innerHTML = "";
  recentIdoEvents.forEach(event => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${event.time}</td><td><code>${event.pool.substring(0,8)}...</code></td><td>${event.event}</td>`;
    idoBody.appendChild(tr);
  });
  if (recentIdoEvents.length === 0) {
    idoBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#888;">No IDO activity yet. First pool coming soon...</td></tr>`;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  window.loadTraffic();
  console.log("🚀 Real-time Protocol Traffic monitoring started");
});