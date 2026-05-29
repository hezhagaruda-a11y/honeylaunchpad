import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/* 
   ===================================================================
   ACQUIRE INVESTOR NFT – THE THRESHOLD PAGE (Fully Synced Version)
   ===================================================================

   Updated to work perfectly with the new production-ready InvestorNFT contract.
   - Now uses getRequiredHoneyForTier() from the contract (single source of truth)
   - Fixed async price loading (the straw that was causing 0.00 HONEY)
   - Tier preview images added to HTML
*/

const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";
const NFT = "0xd46aC0ae6A040C06234Bcd35A4fd33096759fD48";   // ← Your new deployed address

const ERC20_ABI = [
  "function approve(address,uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)"
];

const NFT_ABI = [
  "function mintBronze()",
  "function mintSilver()",
  "function mintGold()",
  "function getUserTier(address) view returns (uint256)",
  "function getRequiredHoneyForTier(uint256 tier) view returns (uint256)"
];

let signer, provider;
let acquisitionsHistory = [];

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not detected.\n\nBest experience: Open this page inside the MetaMask mobile browser.");
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const addr = await signer.getAddress();
    document.getElementById("wallet").innerHTML = `Connected: <strong>${addr.substring(0,8)}...${addr.substring(36)}</strong>`;

    await showCurrentTier();
    await updateHoneyBalance();
    await loadLiveHoneyPrice();
  } catch (e) {
    console.error(e);
    alert("Wallet connection failed.\n\nMake sure you are on Sepolia network and try again.");
  }
}

async function showCurrentTier() {
  if (!signer) return;
  try {
    const nft = new ethers.Contract(NFT, NFT_ABI, signer);
    const tier = Number(await nft.getUserTier(await signer.getAddress()));
    const tiers = ["None", "Bronze", "Silver", "Gold"];
    document.getElementById("currentTier").innerHTML = `Current Tier: <strong>${tiers[tier]}</strong>`;
  } catch (e) {
    console.error("Failed to fetch current tier", e);
  }
}

async function updateHoneyBalance() {
  if (!signer) return;
  try {
    const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
    const balance = await honey.balanceOf(await signer.getAddress());
    document.getElementById("honeyBalance").innerHTML = `
      HONEY Balance: <strong>${(Number(balance) / 1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
    `;
  } catch (e) {
    console.error("Balance fetch failed", e);
  }
}

async function loadLiveHoneyPrice() {
  try {
    const nft = new ethers.Contract(NFT, NFT_ABI, provider || new ethers.BrowserProvider(window.ethereum));

    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>Fetching from contract...</strong>`;

    for (const tier of [1,2,3]) {
      const honeyNeeded = await nft.getRequiredHoneyForTier(tier);
      const formatted = (Number(honeyNeeded) / 1e18).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const id = tier === 1 ? "bronzeHONEY" : tier === 2 ? "silverHONEY" : "goldHONEY";
      document.getElementById(id).innerHTML = `
        Requires <strong>${formatted} HONEY</strong><br>
        <span style="font-size:0.95em; opacity:0.8; color:#4caf50;">(${tier === 1 ? 300 : tier === 2 ? 1000 : 5000} USDC equivalent)</span>
      `;
    }
  } catch (e) {
    console.error("Live price fetch failed", e);
    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>Error loading</strong>`;
  }
}

window.buyHoneyOnDex = () => window.open("spark-dex.html", "_blank");

window.mintTier = async (tier) => {
  if (!signer) {
    alert("Please connect wallet first");
    return;
  }

  const nft = new ethers.Contract(NFT, NFT_ABI, signer);
  const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);

  try {
    const honeyNeeded = await nft.getRequiredHoneyForTier(tier);
    const balance = await honey.balanceOf(await signer.getAddress());
    const allowance = await honey.allowance(await signer.getAddress(), NFT);

    if (balance < honeyNeeded) {
      alert(`Not enough HONEY in wallet.`);
      return;
    }

    if (allowance < honeyNeeded) {
      const approveTx = await honey.approve(NFT, honeyNeeded);
      await approveTx.wait();
    }

    let mintTx;
    if (tier === 1) mintTx = await nft.mintBronze();
    else if (tier === 2) mintTx = await nft.mintSilver();
    else if (tier === 3) mintTx = await nft.mintGold();

    await mintTx.wait();

    const tierName = tier === 1 ? "Bronze" : tier === 2 ? "Silver" : "Gold";
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});

    acquisitionsHistory.unshift({
      time: timeStr,
      tier: tierName,
      honeyPaid: (Number(honeyNeeded) / 1e18).toFixed(2)
    });

    if (acquisitionsHistory.length > 10) acquisitionsHistory.pop();

    localStorage.setItem("acquisitionsHistory", JSON.stringify(acquisitionsHistory));

    const statusEl = document.getElementById("status");
    statusEl.innerHTML = `
      <span style="color:#4caf50; font-size:1.15em; line-height:1.6;">
        🎉 Congratulations!<br><br>
        You have successfully minted a <strong>${tierName} Investor NFT</strong>!<br><br>
        This is your key to <strong>generational wealth building</strong> and gives you 
        priority access + tiered discounts on <strong>ALL future IDO launches</strong>.
      </span>
    `;
    statusEl.classList.add("show");

    setTimeout(() => statusEl.classList.remove("show"), 8000);

    await showCurrentTier();
    await updateHoneyBalance();
    await loadLiveHoneyPrice();
    await renderAcquisitions();
  } catch (e) {
    console.error("Mint error:", e);
    let msg = "Mint failed. ";
    if (e.reason) msg += e.reason;
    else if (e.message.includes("CALL_EXCEPTION")) msg += "The contract rejected the transaction.";
    else msg += e.message || "Unknown error";
    document.getElementById("status").innerHTML = `<span style="color:red">❌ ${msg}</span>`;
  }
};

function renderAcquisitions() {
  const tbody = document.getElementById("acquisitionsBody");
  tbody.innerHTML = "";

  acquisitionsHistory.forEach(entry => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.time}</td>
      <td><strong>${entry.tier}</strong></td>
      <td style="text-align:right;"><strong>${entry.honeyPaid}</strong> HONEY</td>
    `;
    tbody.appendChild(tr);
  });

  if (acquisitionsHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#888;">No acquisitions yet. Mint your first Investor NFT!</td></tr>`;
  }
}

window.refreshAcquisitions = function refreshAcquisitions() {
  renderAcquisitions();
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("themeToggle").onclick = () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  document.getElementById("connectBtn").onclick = connectWallet;

  const saved = localStorage.getItem("acquisitionsHistory");
  if (saved) acquisitionsHistory = JSON.parse(saved);

  loadLiveHoneyPrice();
});
