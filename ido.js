import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";
const USDC = "0x0dde8f47709a785CEc265779Bb75fDBC7a3d8e93";

const NFT_ABI = ["function getUserTier(address) view returns (uint256)"];
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256)"];
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

const PROJECTS = {
  "0x81eb4d4279027a8b79b017c8d0c7e7d752511a0b": { name: "EEE Launch #1", symbol: "EEE" },
  "0x0857de57bdbf43fcc3df67f9a4076beb97f1c79b": { name: "DDD Launch #4", symbol: "DDD" },
  "0xfdefcb25bbf1525c067a3033b68011efff0e63e2": { name: "DDD Launch #3", symbol: "DDD" },
  "0x1372b8dd99c74b6fbfee15dbe11affde6008e473": { name: "DDD Launch #2", symbol: "DDD" }
};

const params = new URLSearchParams(window.location.search);
const pool = params.get("pool");
if (!pool) { alert("Invalid pool address"); throw new Error("Missing pool param"); }
document.getElementById("poolAddress").innerText = pool;

const meta = PROJECTS[pool.toLowerCase()] || { name: "IDO", symbol: "TOK" };

// Dynamic page title and buy section
document.getElementById("pageTitle").innerText = `🍯 Honey Launchpad • ${meta.name}`;
document.getElementById("buySectionTitle").innerText = `Buy ${meta.symbol} Tokens`;
document.getElementById("buyBtn").innerText = `Buy ${meta.symbol} Tokens`;

let signer, user, tier = 0, usdcBal = 0n, purchased = 0n, ido, startTime;

// Tier minimums in USDC (6 decimals)
const MIN_AMOUNT = {
  1: ethers.parseUnits("300", 6),   // Bronze
  2: ethers.parseUnits("1000", 6),  // Silver
  3: ethers.parseUnits("5000", 6)   // Gold
};

// ====================== DARK MODE TOGGLE ======================
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
  await refreshAll();
};

function startCountdown() {
  const container = document.getElementById("countdownContainer");
  container.style.display = "block";
  container.innerHTML = `<strong>IDO Starts in:</strong> <span id="bigCountdown"></span>`;

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

async function refreshAll() {
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
  usdcBal = await usdc.balanceOf(user);
  purchased = await ido.purchased(user);

  document.getElementById("balance").innerText = Number(ethers.formatUnits(usdcBal, 6)).toLocaleString() + " USDC";

  const cap = await ido.MAX_PER_WALLET();
  const price = await getPrice();
  const capUSDC = Number(ethers.formatUnits(cap * price / (10n ** 30n), 6));
  document.getElementById("allocation").innerText = Number(ethers.formatUnits(cap, 18)).toLocaleString() + " " + meta.symbol + " (~" + capUSDC.toFixed(2) + " USDC)";

  await refreshPoolState();
}

async function refreshPoolState() {
  const sold = await ido.totalSold();
  const total = await ido.totalSupplyForSale();
  const soldNum = parseFloat(ethers.formatUnits(sold, 18));
  const totalNum = parseFloat(ethers.formatUnits(total, 18));
  const remainingNum = totalNum - soldNum;
  const percent = totalNum > 0 ? (soldNum / totalNum) * 100 : 0;

  document.getElementById("sold").innerText = soldNum.toLocaleString() + " " + meta.symbol;
  document.getElementById("remaining").innerText = remainingNum.toLocaleString() + " " + meta.symbol;
  document.getElementById("percent").innerText = percent.toFixed(2) + "% SOLD";
  document.getElementById("progressBar").style.width = percent + "%";
}

async function getPrice() {
  if (tier === 3) return await ido.PRICE_GOLD();
  if (tier === 2) return await ido.PRICE_SILVER();
  return await ido.PRICE_BRONZE();
}

async function updateQuote() {
  const val = document.getElementById("usdcInput").value.trim();
  if (!val || tier === 0) {
    document.getElementById("quote").innerText = "You receive: 0 " + meta.symbol;
    return;
  }
  const payment = ethers.parseUnits(val, 6);
  const price = await getPrice();
  const tokens = (payment * 10n**12n * 10n**18n) / price;
  document.getElementById("quote").innerText = "You receive: " + parseFloat(ethers.formatUnits(tokens, 18)).toLocaleString() + " " + meta.symbol;
}
document.getElementById("usdcInput").oninput = updateQuote;

document.getElementById("maxBtn").onclick = async () => {
  if (tier === 0) return;
  const price = await getPrice();
  const cap = await ido.MAX_PER_WALLET();
  const remainingCap = cap - purchased;
  const maxFromCap = (remainingCap * price) / (10n**30n);
  const usable = maxFromCap < usdcBal ? maxFromCap : usdcBal;
  document.getElementById("usdcInput").value = parseFloat(ethers.formatUnits(usable, 6)).toFixed(2);
  await updateQuote();
};

document.getElementById("minBtn").onclick = () => {
  if (tier === 0) return;
  const minUSDC = Number(ethers.formatUnits(MIN_AMOUNT[tier], 6));
  document.getElementById("usdcInput").value = minUSDC;
  updateQuote();
};

document.getElementById("buyBtn").onclick = async () => {
  try {
    if (!signer || tier === 0) { alert("You need an Investor NFT"); return; }
    const val = document.getElementById("usdcInput").value.trim();
    if (!val || Number(val) <= 0) { alert("Enter a valid amount"); return; }

    const payment = ethers.parseUnits(val, 6);
    const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);

    const approveTx = await usdc.approve(pool, payment);
    await approveTx.wait();

    const buyTx = await ido.buy(payment);
    await buyTx.wait();

    await refreshAll();
    alert("🎉 Purchase successful! You received " + meta.symbol + " tokens.");
  } catch (err) {
    console.error(err);
    let msg = err?.reason || err?.message || "Transaction failed";

    if (msg.includes("Below min") || msg.includes("amount too low") || msg.includes("min amount")) {
      const minUSDC = Number(ethers.formatUnits(MIN_AMOUNT[tier], 6));
      const tierName = tier === 3 ? "Gold" : tier === 2 ? "Silver" : "Bronze";
      msg = `Amount is below minimum for ${tierName} tier (${minUSDC.toLocaleString()} USDC)`;
    }
    if (msg.includes("Wallet cap") || msg.includes("cap exceeded")) msg = "You reached your wallet allocation limit";

    alert("❌ " + msg);
  }
};