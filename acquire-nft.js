import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

// === Reown AppKit Setup ===
const projectId = "756fef86a90a45b894fd6e7b365619bb";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";
const SPARK_POOL = "0x288728f3d24F9CC63771eB463f1D144d24C493F0";

const TIER_USD = { 1: 300, 2: 1000, 3: 5000 };

const POOL_ABI = ["function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];
const ERC20_ABI = ["function approve(address,uint256)", "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"];
const NFT_ABI = ["function mintTier(uint256)", "function getUserTier(address) view returns (uint256)"];

let signer, provider;
let currentLivePrice = null;
let web3Modal;

async function initAppKit() {
  if (web3Modal) return web3Modal;
  console.log("Waiting for Reown AppKit script to load...");
  for (let i = 0; i < 50; i++) {   // retry up to 5 seconds
    if (window.AppKit && typeof window.AppKit.init === 'function') {
      console.log("Reown AppKit script loaded successfully");
      web3Modal = await window.AppKit.init({
        projectId: projectId,
        chains: [11155111],
        metadata: {
          name: "Honey Launchpad",
          description: "Honey Protocol Testing Environment",
          url: window.location.href,
          icons: ["https://picsum.photos/id/1015/200/200"]
        }
      });
      console.log("Reown AppKit initialized successfully");
      return web3Modal;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("Reown AppKit script did not load in time. Please hard refresh the page (Cmd+Shift+R).");
}

async function connectWallet() {
  try {
    console.log("Connect Wallet clicked");
    await initAppKit();
    const { provider: wcProvider } = await web3Modal.connect();
    console.log("Wallet connected via Reown");
    provider = new ethers.BrowserProvider(wcProvider);
    signer = await provider.getSigner();
    const addr = await signer.getAddress();
    document.getElementById("wallet").innerHTML = `Connected: <strong>${addr.substring(0,8)}...${addr.substring(36)}</strong>`;

    await showCurrentTier();
    await updateHoneyBalance();
    await loadLiveHoneyPrice();
  } catch (e) {
    console.error("Connect Wallet error:", e);
    alert("Wallet connection failed. Please try again.");
  }
}

async function showCurrentTier() {
  if (!signer) return;
  try {
    const nft = new ethers.Contract(NFT, NFT_ABI, signer);
    const tier = Number(await nft.getUserTier(await signer.getAddress()));
    const tiers = ["None", "Bronze", "Silver", "Gold"];
    document.getElementById("status").innerHTML = `<span style="color:#4caf50">Current Tier: <strong>${tiers[tier]}</strong></span>`;
    console.log(`Current Tier: ${tiers[tier]}`);
  } catch (e) {
    console.error("Failed to fetch current tier", e);
    document.getElementById("status").innerHTML = `<span style="color:#ff9800">Could not load current tier</span>`;
  }
}

async function updateHoneyBalance() {
  if (!signer) return;
  try {
    const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
    const balance = await honey.balanceOf(await signer.getAddress());
    document.getElementById("honeyBalance").innerHTML = `
      HONEY Balance: <strong>${(Number(balance) / 1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</strong>
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

    const usdcReserve = Number(reserve0) / 1e6;
    const honeyReserve = Number(reserve1) / 1e18;
    currentLivePrice = usdcReserve / honeyReserve;

    document.getElementById("honeyPriceDisplay").innerHTML = `
      Live Honey Price: <strong>${currentLivePrice.toFixed(8)} USDC</strong> (Simulated Spark DEX Pool)
    `;

    Object.keys(TIER_USD).forEach(tier => {
      const honeyNeeded = TIER_USD[tier] / currentLivePrice;
      const id = tier === "1" ? "bronzeHONEY" : tier === "2" ? "silverHONEY" : "goldHONEY";
      const formatted = honeyNeeded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      document.getElementById(id).innerHTML = `
        Requires <strong>${formatted} HONEY</strong> (${TIER_USD[tier]} USDC equivalent)
      `;
    });
  } catch (e) {
    console.error("Live price fetch failed", e);
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
    console.log(`[Mint Tier ${tier}] Balance: ${Number(balance) / 1e18} HONEY`);
    console.log(`[Mint Tier ${tier}] Allowance: ${Number(allowance) / 1e18} HONEY`);

    if (balance < ethers.parseUnits(honeyNeeded.toString(), 18)) {
      alert(`Not enough HONEY in wallet.`);
      return;
    }

    if (allowance < ethers.parseUnits(honeyNeeded.toString(), 18)) {
      const approveTx = await honey.approve(NFT, ethers.parseUnits(honeyNeeded.toString(), 18));
      await approveTx.wait();
    }

    const mintTx = await nft.mintTier(tier);
    await mintTx.wait();

    document.getElementById("status").innerHTML = `<span style="color:#4caf50">✅ Successfully minted Tier ${tier}!</span>`;
    await showCurrentTier();
    await updateHoneyBalance();
    await loadLiveHoneyPrice();
  } catch (e) {
    console.error("Mint error:", e);
    let msg = "Mint failed. ";
    if (e.reason) msg += e.reason;
    else if (e.message.includes("CALL_EXCEPTION")) msg += "The contract rejected the transaction (possible reasons: tier already minted, insufficient allowance, or contract restriction).";
    else msg += e.message || "Unknown error";
    document.getElementById("status").innerHTML = `<span style="color:red">❌ ${msg}</span>`;
  }
};

document.getElementById("themeToggle").onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
};

document.getElementById("connectBtn").onclick = connectWallet;

// Initial load
loadLiveHoneyPrice();