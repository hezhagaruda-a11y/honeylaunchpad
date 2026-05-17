import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/* 
   ===================================================================
   ACQUIRE INVESTOR NFT – THE THRESHOLD PAGE (Clean Slate Version)
   ===================================================================

   This is the heart of the Honey Launchpad protocol.

   Here, a player connects their wallet, sees the live Honey price from the Spark DEX, 
   chooses their tier, and mints their Investor NFT.

   This single action is the moment they step from observer to participant in the honeycomb lattice.
   It is the spark that ignites generational wealth mechanics.

   All addresses are now the final approved Clean Slate State (May 03, 2026).
   Pure 18-decimal math everywhere – MockUSDC (18 decimals) and HONEY (18 decimals).
   No MockETH is used on this page. No legacy 6-decimal code remains.
*/

const HONEY = "0x8285bd7892F89b65632Ec5De8A700183DBA8cdb2";
const NFT = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";
const SPARK_POOL = "0x7c42daFfbA3a7103d456a0d5d076e58901bE378b";

const TIER_USD = { 1: 300, 2: 1000, 3: 5000 };

const POOL_ABI = ["function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];
const ERC20_ABI = ["function approve(address,uint256)", "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"];
const NFT_ABI = ["function mintBronze()", "function mintSilver()", "function mintGold()", "function getUserTier(address) view returns (uint256)"];

let signer, provider;
let currentLivePrice = null;

// History of acquisitions (historical + new mints in this session)
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
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const pool = new ethers.Contract(SPARK_POOL, POOL_ABI, provider);
    const [reserve0, reserve1] = await pool.getReserves();

    const r0 = Number(reserve0) / 1e18;
    const r1 = Number(reserve1) / 1e18;

    // Pure 18-decimal math – both MockUSDC and HONEY use 18 decimals
    let price;

    if (r0 > 0 && r1 > 0) {
      // Try both possible reserve orders and choose the sensible price
      const p1 = r0 / r1;
      const p2 = r1 / r0;
      price = Math.min(p1, p2);   // The smaller value is the price of HONEY in MockUSDC
    } else {
      price = 0.00004; // reasonable fallback for empty or new pool
    }

    currentLivePrice = price;

    // Clean decimal display – no trailing zeros
    let priceStr = currentLivePrice.toFixed(8).replace(/0+$/, '');
    if (priceStr.endsWith('.')) priceStr = priceStr.slice(0, -1);

    document.getElementById("honeyPriceDisplay").innerHTML = `
      Live Honey Price: <strong>${priceStr} USDC</strong> (Simulated Spark DEX Pool)
    `;

    Object.keys(TIER_USD).forEach(tier => {
      const honeyNeeded = TIER_USD[tier] / currentLivePrice;
      const id = tier === "1" ? "bronzeHONEY" : tier === "2" ? "silverHONEY" : "goldHONEY";
      const formatted = honeyNeeded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById(id).innerHTML = `
        Requires <strong>${formatted} HONEY</strong><br>
        <span style="font-size:0.95em; opacity:0.8; color:#4caf50;">(${TIER_USD[tier]} USDC equivalent)</span>
      `;
    });
  } catch (e) {
    console.error("Live price fetch failed", e);
    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>0.00004 USDC</strong> (Simulated Spark DEX Pool)`;
  }
}

window.buyHoneyOnDex = () => window.open("spark-dex.html", "_blank");

window.mintTier = async (tier) => {
  if (!signer) {
    alert("Please connect wallet first");
    return;
  }
  if (!currentLivePrice) {
    alert("Live price not loaded yet. Please refresh the page.");
    return;
  }

  const honeyNeeded = TIER_USD[tier] / currentLivePrice;
  const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
  const nft = new ethers.Contract(NFT, NFT_ABI, signer);

  try {
    const balance = await honey.balanceOf(await signer.getAddress());
    const allowance = await honey.allowance(await signer.getAddress(), NFT);

    if (balance < ethers.parseUnits(honeyNeeded.toString(), 18)) {
      alert(`Not enough HONEY in wallet.`);
      return;
    }

    if (allowance < ethers.parseUnits(honeyNeeded.toString(), 18)) {
      const approveTx = await honey.approve(NFT, ethers.parseUnits(honeyNeeded.toString(), 18));
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
      honeyPaid: honeyNeeded.toFixed(2)
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
    else if (e.message.includes("CALL_EXCEPTION")) msg += "The contract rejected the transaction (possible reasons: tier already minted, insufficient allowance, or contract restriction).";
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
