import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

// Demo data — will be replaced with real events later
const demoDexSwaps = [
  { time: "2m ago", action: "Buy HONEY", amount: "1,245 HONEY" },
  { time: "5m ago", action: "Sell HONEY", amount: "8,420 HONEY" },
  { time: "11m ago", action: "Buy HONEY", amount: "3,100 HONEY" },
];

const demoIdoEvents = [
  { time: "18m ago", pool: "0xA1B2...C3D4", event: "New IDO Launched" },
  { time: "47m ago", pool: "0xE5F6...G7H8", event: "Purchase (Silver tier)" },
  { time: "1h ago", pool: "0xI9J0...K1L2", event: "New IDO Launched" },
];

window.loadTraffic = function loadTraffic() {
  // DEX Table
  const dexBody = document.getElementById("dexBody");
  dexBody.innerHTML = "";
  demoDexSwaps.forEach(swap => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${swap.time}</td><td>${swap.action}</td><td><strong>${swap.amount}</strong></td>`;
    dexBody.appendChild(tr);
  });

  // IDO Table
  const idoBody = document.getElementById("idoBody");
  idoBody.innerHTML = "";
  demoIdoEvents.forEach(event => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${event.time}</td><td><code>${event.pool}</code></td><td>${event.event}</td>`;
    idoBody.appendChild(tr);
  });
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  window.loadTraffic();
});