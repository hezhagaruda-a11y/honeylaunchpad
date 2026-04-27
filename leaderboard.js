import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const NFT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function getUserTier(address) view returns (uint256)"
];

let provider;

async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">Loading leaderboard...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
    const nft = new ethers.Contract(NFT, NFT_ABI, provider);

    // For simplicity in this phase, we show known wallets or top holders
    // In a full version we would index all holders, but for now we show a clean leaderboard
    // You can expand this later with a backend or subgraph

    const rows = [];

    // Example known wallets - replace or expand as more players join
    const knownWallets = [
      // Add real wallets that have minted or bought HONEY here
      // For now it will show current connected wallet + some placeholders
    ];

    // Add current connected wallet if available
    if (window.ethereum) {
      try {
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        knownWallets.unshift(addr);
      } catch(e) {}
    }

    for (const wallet of knownWallets) {
      const honeyBalance = await honey.balanceOf(wallet);
      const nftBalance = await nft.balanceOf(wallet);
      let highestTier = 0;

      if (nftBalance > 0) {
        for (let i = 0; i < nftBalance; i++) {
          const tokenId = await nft.tokenOfOwnerByIndex(wallet, i);
          const tier = Number(await nft.getUserTier(wallet)); // getUserTier already returns highest
          if (tier > highestTier) highestTier = tier;
        }
      }

      rows.push({
        wallet,
        honey: Number(honeyBalance) / 1e18,
        tier: highestTier,
        nftCount: Number(nftBalance)
      });
    }

    // Sort by HONEY balance descending
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
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#888;">No data yet. Be one of the first players!</td></tr>`;
    }

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading leaderboard. Please try again.</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', loadLeaderboard);