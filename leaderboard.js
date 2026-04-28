import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const NFT_ABI = ["function balanceOf(address) view returns (uint256)", "function getUserTier(address) view returns (uint256)"];

let provider;

window.loadLeaderboard = async function loadLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:60px;">Loading leaderboard...</td></tr>`;

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const wallet = await signer.getAddress();

    const nft = new ethers.Contract(NFT, NFT_ABI, provider);
    const tier = Number(await nft.getUserTier(wallet));

    if (tier === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:60px; color:#f57c00; font-size:1.1em;">
        🍯 This Leaderboard is <strong>Investor NFT Exclusive</strong><br><br>
        Only holders of Bronze, Silver, or Gold Investor NFTs can view the full rankings.
      </td></tr>`;
      return;
    }

    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
    const honeyBalance = Number(await honey.balanceOf(wallet)) / 1e18;
    const nftBalance = Number(await nft.balanceOf(wallet));

    const rows = [{
      rank: 1,
      wallet: wallet,
      honey: honeyBalance,
      tier: tier,
      nftCount: nftBalance,
      nftId: nftBalance > 0 ? "Multiple" : "—",
      isCurrent: true
    }];

    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tierName = row.tier === 1 ? "Bronze" : row.tier === 2 ? "Silver" : "Gold";
      const tierClass = row.tier === 1 ? "bronze" : row.tier === 2 ? "silver" : "gold";

      const tr = document.createElement("tr");
      if (row.isCurrent) tr.classList.add("current-user");

      tr.innerHTML = `
        <td class="rank">${row.rank}</td>
        <td><span class="wallet">${row.wallet.substring(0,8)}...${row.wallet.substring(36)}</span></td>
        <td><strong>${row.honey.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td>
        <td class="tier ${tierClass}">${tierName}</td>
        <td>${row.nftCount}</td>
        <td>${row.nftId}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:60px;">Error loading leaderboard.<br>Please connect wallet and try again.</td></tr>`;
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  window.loadLeaderboard();
});