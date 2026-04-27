import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const NFT_ABI = ["function balanceOf(address) view returns (uint256)", "function getUserTier(address) view returns (uint256)"];

let provider;

window.loadLeaderboard = async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">Loading leaderboard...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
    const nft = new ethers.Contract(NFT, NFT_ABI, provider);

    const demoWallets = [
      "0xFD242c04fA7De83fc5BdBa5033122646373B5ce2",
      "0x7ee4fe6dc352f830d7f57e2e99cab462c05d5882",
      "0xaFbCFA5A5445f4E6711CB9Fa86991ea4485920b1",
      "0x1234567890abcdef1234567890abcdef12345678"
    ];

    const rows = [];

    for (const wallet of demoWallets) {
      const honeyBalance = await honey.balanceOf(wallet).catch(() => 0);
      const nftBalance = await nft.balanceOf(wallet).catch(() => 0);
      const tier = nftBalance > 0 ? Number(await nft.getUserTier(wallet).catch(() => 0)) : 0;

      rows.push({
        wallet,
        honey: Number(honeyBalance) / 1e18,
        tier: tier,
        nftCount: Number(nftBalance)
      });
    }

    rows.sort((a, b) => b.honey - a.honey);

    tbody.innerHTML = "";

    rows.forEach((row, index) => {
      const tierName = row.tier === 1 ? "Bronze" : row.tier === 2 ? "Silver" : row.tier === 3 ? "Gold" : "None";
      const tierClass = row.tier === 1 ? "bronze" : row.tier === 2 ? "silver" : row.tier === 3 ? "gold" : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="rank">${index + 1}</td>
        <td><span class="wallet">${row.wallet.substring(0,8)}...${row.wallet.substring(36)}</span></td>
        <td><strong>${row.honey.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td>
        <td class="tier ${tierClass}">${tierName}</td>
        <td>${row.nftCount}</td>
      `;
      tbody.appendChild(tr);
    });

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#888;">No data yet. Be one of the first players!</td></tr>`;
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