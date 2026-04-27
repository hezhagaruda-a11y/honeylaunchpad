import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const NFT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function getUserTier(address) view returns (uint256)"
];

let provider;

// Make this function global so the button can call it
window.loadLeaderboard = async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">Loading leaderboard...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum || window.ethereum);

    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
    const nft = new ethers.Contract(NFT, NFT_ABI, provider);

    // For now, show the currently connected wallet (if any) + a few placeholders
    // In the future we can expand this to show top holders
    const rows = [];

    // Try to get current connected wallet
    let currentWallet = null;
    try {
      const signer = await provider.getSigner();
      currentWallet = await signer.getAddress();
    } catch (e) {}

    if (currentWallet) {
      try {
        const honeyBalance = await honey.balanceOf(currentWallet);
        const nftBalance = await nft.balanceOf(currentWallet);
        const tier = Number(await nft.getUserTier(currentWallet));

        rows.push({
          wallet: currentWallet,
          honey: Number(honeyBalance) / 1e18,
          tier: tier,
          nftCount: Number(nftBalance)
        });
      } catch (e) {
        console.error("Error fetching current wallet data", e);
      }
    }

    // Sort by HONEY balance
    rows.sort((a, b) => b.honey - a.honey);

    tbody.innerHTML = "";

    rows.forEach((row, index) => {
      const tierName = row.tier === 1 ? "Bronze" : row.tier === 2 ? "Silver" : row.tier === 3 ? "Gold" : "None";
      const tierClass = row.tier === 1 ? "bronze" : row.tier === 2 ? "silver" : row.tier === 3 ? "gold" : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="rank">${index + 1}</td>
        <td><code>${row.wallet.substring(0,8)}...${row.wallet.substring(36)}</code></td>
        <td><strong>${row.honey.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td>
        <td class="tier ${tierClass}">${tierName}</td>
        <td>${row.nftCount}</td>
      `;
      tbody.appendChild(tr);
    });

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#888;">No data yet. Be one of the first players to appear here!</td></tr>`;
    }

  } catch (e) {
    console.error("Leaderboard error:", e);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:40px;">Error loading leaderboard.<br>Please try again later.</td></tr>`;
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  window.loadLeaderboard();
});