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

window.loadLeaderboard = async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:60px;">Loading leaderboard...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
    const nft = new ethers.Contract(NFT, NFT_ABI, provider);

    // Expanded demo wallets to show all HONEY holders (some with NFTs, some without)
    const demoWallets = [
      "0x7ee4fe6dc352f830d7f57e2e99cab462c05d5882",
      "0xaFbCFA5A5445f4E6711CB9Fa86991ea4485920b1",
      "0xFD242c04fA7De83fc5BdBa5033122646373B5ce2",
      "0x1234567890abcdef1234567890abcdef12345678",
      "0xabcdef1234567890abcdef1234567890abcdef12"
    ];

    const rows = [];
    let currentWallet = null;
    try {
      const signer = await provider.getSigner();
      currentWallet = await signer.getAddress();
    } catch (e) {}

    for (const wallet of demoWallets) {
      const honeyBalance = await honey.balanceOf(wallet).catch(() => 0);
      const nftBalance = await nft.balanceOf(wallet).catch(() => 0);
      const tier = nftBalance > 0 ? Number(await nft.getUserTier(wallet).catch(() => 0)) : 0;

      let nftIdDisplay = "—";
      if (nftBalance === 1) {
        try {
          const tokenId = await nft.tokenOfOwnerByIndex(wallet, 0);
          nftIdDisplay = tokenId.toString();
        } catch (e) {
          nftIdDisplay = "Error";
        }
      } else if (nftBalance > 1) {
        nftIdDisplay = "Multiple";
      }

      rows.push({
        wallet,
        honey: Number(honeyBalance) / 1e18,
        tier: tier,
        nftCount: Number(nftBalance),
        nftId: nftIdDisplay,
        isCurrent: wallet.toLowerCase() === (currentWallet || "").toLowerCase()
      });
    }

    rows.sort((a, b) => b.honey - a.honey);

    tbody.innerHTML = "";

    rows.forEach((row, index) => {
      const tierName = row.tier === 1 ? "Bronze" : row.tier === 2 ? "Silver" : "Gold";
      const tierClass = row.tier === 1 ? "bronze" : row.tier === 2 ? "silver" : "gold";

      const tr = document.createElement("tr");
      if (row.isCurrent) tr.classList.add("current-user");

      tr.innerHTML = `
        <td class="rank">${index + 1}</td>
        <td><span class="wallet">${row.wallet.substring(0,8)}...${row.wallet.substring(36)}</span></td>
        <td><strong>${row.honey.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td>
        <td class="tier ${tierClass}">${tierName}</td>
        <td>${row.nftCount}</td>
        <td>${row.nftId}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (e) {
    console.error("Leaderboard error:", e);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:60px;">Error loading leaderboard.<br>Please connect wallet and try again.</td></tr>`;
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  window.loadLeaderboard();
});