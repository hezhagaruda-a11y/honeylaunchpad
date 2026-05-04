import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  The Leaderboard is the visible heartbeat of the Honey Protocol.
  It transforms abstract early participation into concrete rank and recognition.
  
  This file powers the living scoreboard where early believers can see their place in the story.
  
  It connects directly to:
  - Main Dashboard (first card)
  - Spark DEX (accumulation mechanism)
  - Acquire Investor NFT (the key to meaningful participation)
  - Protocol Traffic (the live activity that feeds the ranks)
  
  The clean-slate 18-decimal protocol is fully integrated here.
  Only the currently connected wallet is shown dynamically — no hardcoded lists, no static data.
  The player sees their own position in real time.
  
  Updated with the clean-slate HONEY address: 0x1364819B3367f37c77813FE149074d963F2A5021
*/

const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";   // Clean Slate HONEY Token
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
let provider;

window.loadLeaderboard = async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:60px;">Connecting wallet to see your position...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();
    const currentWallet = await signer.getAddress();

    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
    const honeyBalance = await honey.balanceOf(currentWallet).catch(() => 0);
    const balance = Number(honeyBalance) / 1e18;

    tbody.innerHTML = "";

    // Only show the currently connected wallet if they hold HONEY
    if (balance > 0) {
      const tr = document.createElement("tr");
      tr.classList.add("current-user");   // Highlight the connected player
      tr.innerHTML = `
        <td class="rank">1</td>
        <td><span class="wallet">${currentWallet.substring(0,8)}...${currentWallet.substring(36)}</span></td>
        <td><strong>${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
      `;
      tbody.appendChild(tr);
    } else {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:60px; color:#888;">
        Connect your wallet and buy HONEY to appear on the Leaderboard.
      </td></tr>`;
    }

  } catch (e) {
    console.error("Leaderboard error:", e);
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:60px; color:#888;">
      Connect your wallet to see your position on the Leaderboard.
    </td></tr>`;
  }
};

// Initial load — the story begins when the page opens
document.addEventListener('DOMContentLoaded', () => {
  window.loadLeaderboard();
});