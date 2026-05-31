import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  ===================================================================
  HONEY PROTOCOL – GLOBAL LEADERBOARD (Live On-Chain Version)
  ===================================================================
  Fully live — powered by The Graph indexing.
*/

const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";
const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/1754385/honey-protocol-sepolia/v0.0.1";

let provider;

window.loadLeaderboard = async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:60px;">Loading global leaderboard...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const currentWallet = await signer.getAddress();

    const query = `
      query {
        holderBalances(orderBy: balance, orderDirection: desc, first: 100) {
          id
          balance
        }
      }
    `;

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    const holders = data.data.holderBalances || [];

    tbody.innerHTML = "";

    holders.forEach((holder, index) => {
      const tr = document.createElement("tr");
      const isCurrent = holder.id.toLowerCase() === currentWallet.toLowerCase();
      if (isCurrent) tr.classList.add("current-user");
      tr.innerHTML = `
        <td class="rank">${index + 1}</td>
        <td><span class="wallet">${holder.id.substring(0,8)}...${holder.id.substring(36)}</span></td>
        <td><strong>${(Number(holder.balance) / 1e18).toLocaleString('en-US')}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("Leaderboard error:", e);
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:60px; color:#888;">
      Connect your wallet to see your position on the global leaderboard.
    </td></tr>`;
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  window.loadLeaderboard();
});
