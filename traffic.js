import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const FACTORY_ADDRESS = '0x0388C62Ad1d354d9cb1d3533e143034B4B690102';
const RPC_URL = 'https://rpc.sepolia.org';

const provider = new ethers.JsonRpcProvider(RPC_URL);

const FACTORY_ABI = [
  "event PoolCreated(address indexed poolAddress, address indexed saleToken, address treasury, uint256 startTime, uint256 endTime, uint256 totalSupplyForSale)"
];

const POOL_ABI = [
  "event Purchase(address indexed buyer, uint256 amount, uint256 cost)"
];

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

const recentDexSwaps = [];
const recentIdoEvents = [];

// Real-time listeners
factory.on("PoolCreated", (poolAddress, saleToken, treasury, startTime, endTime, totalSupplyForSale) => {
  const timeStr = new Date().toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  recentIdoEvents.unshift({
    time: timeStr,
    pool: poolAddress,
    event: "New IDO Launched"
  });

  // Limit to 5 entries
  if (recentIdoEvents.length > 5) recentIdoEvents.pop();

  renderTraffic();
});

window.loadTraffic = function loadTraffic() {
  renderTraffic();
};

function renderTraffic() {
  // DEX Table (demo for now - can be expanded later)
  const dexBody = document.getElementById("dexBody");
  dexBody.innerHTML = `
    <tr><td>2m ago</td><td>Buy HONEY</td><td><strong>1,245 HONEY</strong></td></tr>
    <tr><td>5m ago</td><td>Sell HONEY</td><td><strong>8,420 HONEY</strong></td></tr>
    <tr><td>11m ago</td><td>Buy HONEY</td><td><strong>3,100 HONEY</strong></td></tr>
  `;

  // IDO Table (real-time)
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

// Start listening
document.addEventListener('DOMContentLoaded', () => {
  window.loadTraffic();
  console.log("🚀 Real-time Protocol Traffic monitoring started");
});