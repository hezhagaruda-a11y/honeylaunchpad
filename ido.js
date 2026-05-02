import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const NFT = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";
const MOCKETH = "0x084283482cAA832eb629a2c7674C2454A8277597";

const NFT_ABI = ["function getUserTier(address) view returns (uint256)"];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];
const IDO_ABI = [
  "function buy(uint256)",
  "function purchased(address) view returns (uint256)",
  "function MAX_PER_WALLET() view returns (uint256)",
  "function PRICE_GOLD() view returns (uint256)",
  "function PRICE_SILVER() view returns (uint256)",
  "function PRICE_BRONZE() view returns (uint256)",
  "function totalSold() view returns (uint256)",
  "function totalSupplyForSale() view returns (uint256)",
  "function startTime() view returns (uint256)"
];

const params = new URLSearchParams(window.location.search);
const pool = params.get("pool");
if (!pool) { alert("Invalid pool address"); throw new Error("Missing pool param"); }

document.getElementById("poolAddress").innerText = pool;

let signer, user, tier = 0, ethBal = 0n, purchased = 0n, ido, startTime, meta;

const MIN_AMOUNT_ETH = {
  1: ethers.parseUnits("0.1", 18),
  2: ethers.parseUnits("0.3", 18),
  3: ethers.parseUnits("1.5", 18)
};

// ====================== DARK MODE ======================
const themeToggle = document.getElementById("themeToggle");
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}
const savedTheme = localStorage.getItem("theme") || "light";
setTheme(savedTheme);
themeToggle.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  setTheme(newTheme);
};

// ====================== CONNECT ======================
document.getElementById("connect").onclick = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  user = await signer.getAddress();
  document.getElementById("wallet").innerText = user;

  const nft = new ethers.Contract(NFT, NFT_ABI, provider);
  ido = new ethers.Contract(pool, IDO_ABI, signer);

  tier = Number(await nft.getUserTier(user));
  const tierNames = ["None","Bronze","Silver","Gold"];
  document.getElementById("tier").innerText = tierNames[tier];

  startTime = Number(await ido.startTime());
  startCountdown();

  await loadPoolMetadata();
  await refreshAll();
  setInterval(refreshAll, 8000);
};

async function loadPoolMetadata() {
  // Dynamically fetch name and symbol from the sale token contract
  const saleToken = new ethers.Contract(pool, ERC20_ABI, signer || new ethers.JsonRpcProvider('https://rpc.sepolia.org'));
  try {
    const name = await saleToken.name();
    const symbol = await saleToken.symbol();
    meta = { name: name || "IDO", symbol: symbol || "TOK" };
  } catch (e) {
    meta = { name: "IDO", symbol: "TOK" };
  }
  document.getElementById("pageTitle").innerText = `🍯 Honey Launchpad • ${meta.name}`;
  document.getElementById("buySectionTitle").innerText = `Buy ${meta.symbol} Tokens`;
  document.getElementById("buyBtn").innerText = `Buy ${meta.symbol} Tokens`;
}

function startCountdown() {
  const container = document.getElementById("countdownContainer");
  container.style.display = "block";
  container.innerHTML = `<strong>IDO Starts in:</strong> <span id="bigCountdown" style="font-size:22px;"></span>`;
  const update = () => {
    const now = Math.floor(Date.now() / 1000);
    const diff = startTime - now;
    const el = document.getElementById("bigCountdown");
    if (diff <= 0) {
      el.innerHTML = `<span style="color:#4caf50">LIVE NOW! 🚀</span>`;
      return;
    }
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    el.textContent = `${d}d ${h}h ${m}m ${s}s`;
  };
  update();
  setInterval(update, 1000);
}

// ... (the rest of the file remains the same as the previous clean version: refreshAll, refreshPoolState, getPrice, updateQuote, minBtn, maxBtn, buyBtn)

async function refreshAll() {
  const mocketh = new ethers.Contract(MOCKETH, ERC20_ABI, signer);
  ethBal = await mocketh.balanceOf(user);
  purchased = await ido.purchased(user);

  document.getElementById("balance").innerText = Number(ethers.formatUnits(ethBal, 18)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " ETH";

  const cap = await ido.MAX_PER_WALLET();
  const price = await getPrice();
  const capETH = Number(ethers.formatUnits(cap * price / (10n ** 36n), 18));
  document.getElementById("allocation").innerText = Number(ethers.formatUnits(cap, 18)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " " + meta.symbol + " (~" + capETH.toFixed(2) + " ETH)";

  document.getElementById("purchaseHistory").innerHTML = `
    You have already purchased <strong>${parseFloat(ethers.formatUnits(purchased, 18)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> ${meta.symbol}
  `;

  await refreshPoolState();
}

// (The rest of the functions — refreshPoolState, getPrice, updateQuote, minBtn, maxBtn, buyBtn — remain exactly as in the previous clean version)