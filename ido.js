import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  ===================================================================
  IDO LAUNCH POOL PAGE – THE LIVING HEART OF THE HONEYCOMB
  ===================================================================
  This page is where belief becomes action.
  A player connects their wallet, sees their tier, feels the live price of the sale token,
  and buys into the next sovereign hexagon using Honey as the permanent payment token.

  Honey is now the official payment token for all IDO pools.
  Every purchase increases demand for Honey, which raises its price, which makes Investor NFTs more valuable,
  which attracts more participants, which fuels more launches — a self-reinforcing flywheel.

  The Olympus 3,3 model is fused here: the IDO purchase is the stake, the 14.5% reserve is the rebase engine.
  No legacy 6-decimal logic remains. No static mappings. Pure 18-decimal mathematics.
*/

const NFT = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";
const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";   // Honey is the permanent payment token

const NFT_ABI = ["function getUserTier(address) view returns (uint256)"];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256)",
  "function allowance(address,address) view returns (uint256)",
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
if (!pool) {
  alert("Invalid pool address. Please open from the dashboard with ?pool=...");
  throw new Error("Missing pool param");
}

document.getElementById("poolAddress").innerText = pool;

let signer, user, tier = 0, honeyBal = 0n, purchased = 0n, ido, startTime, meta = { name: "IDO", symbol: "TOK" };

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
  try {
    if (!window.ethereum) {
      alert("MetaMask not detected");
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    user = await signer.getAddress();

    document.getElementById("wallet").innerText = user;

    const nft = new ethers.Contract(NFT, NFT_ABI, provider);
    ido = new ethers.Contract(pool, IDO_ABI, signer);

    tier = Number(await nft.getUserTier(user));
    const tierNames = ["None", "Bronze", "Silver", "Gold"];
    document.getElementById("tier").innerText = tierNames[tier] || "None";

    startTime = Number(await ido.startTime());
    startCountdown();

    await loadPoolMetadata();
    await refreshAll();
    setInterval(refreshAll, 8000);
  } catch (e) {
    console.error(e);
    alert("Connection failed. Make sure you are on Sepolia.");
  }
};

async function loadPoolMetadata() {
  try {
    let saleTokenAddr;
    try {
      saleTokenAddr = await ido.saleToken();
    } catch (_) {
      saleTokenAddr = pool;
    }

    const saleToken = new ethers.Contract(saleTokenAddr, ERC20_ABI, signer || new ethers.JsonRpcProvider("https://rpc.sepolia.org"));
    const name = await saleToken.name().catch(() => "IDO");
    const symbol = await saleToken.symbol().catch(() => "TOK");

    meta = { name, symbol };
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
    if (!el) return;

    if (diff <= 0) {
      el.innerHTML = `<span style="color:#10b981; font-weight:700">LIVE NOW! 🚀</span>`;
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
  if (!signer || !ido) return;

  const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
  honeyBal = await honey.balanceOf(user);
  purchased = await ido.purchased(user);

  document.getElementById("balance").innerText =
    Number(ethers.formatUnits(honeyBal, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " HONEY";

  const cap = await ido.MAX_PER_WALLET();
  const price = await getPrice();
  const capHONEY = Number(ethers.formatUnits((cap * price) / (10n ** 36n), 18));

  document.getElementById("allocation").innerText =
    Number(ethers.formatUnits(cap, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    ` ${meta.symbol} (~${capHONEY.toFixed(2)} HONEY)`;

  document.getElementById("purchaseHistory").innerHTML =
    `You have already purchased <strong>${parseFloat(ethers.formatUnits(purchased, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ${meta.symbol}`;

  await refreshPoolState();
}

async function refreshPoolState() {
  const sold = await ido.totalSold();
  const total = await ido.totalSupplyForSale();
  const soldNum = parseFloat(ethers.formatUnits(sold, 18));
  const totalNum = parseFloat(ethers.formatUnits(total, 18));
  const remainingNum = totalNum - soldNum;
  const percent = totalNum > 0 ? (soldNum / totalNum) * 100 : 0;

  const price = await getPrice();
  const honeyRaised = Number(ethers.formatUnits((sold * price) / (10n ** 36n), 18));

  document.getElementById("ethRaised").innerText = honeyRaised.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " HONEY";
  document.getElementById("sold").innerText = soldNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + meta.symbol;
  document.getElementById("remaining").innerText = remainingNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + meta.symbol;
  document.getElementById("percent").innerText = percent.toFixed(2) + "% SOLD";
  document.getElementById("progressBar").style.width = percent + "%";
}

async function getPrice() {
  if (tier === 3) return await ido.PRICE_GOLD();
  if (tier === 2) return await ido.PRICE_SILVER();
  return await ido.PRICE_BRONZE();
}

async function updateQuote() {
  const val = document.getElementById("ethInput").value.trim();
  if (!val || tier === 0) {
    document.getElementById("quote").innerText = `You receive: 0 ${meta.symbol}`;
    return;
  }
  const honeyAmountBig = ethers.parseUnits(val, 18);
  const priceBig = await getPrice();
  const tokensBig = (honeyAmountBig * (10n ** 18n)) / priceBig;
  document.getElementById("quote").innerText =
    `You receive: ${parseFloat(ethers.formatUnits(tokensBig, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${meta.symbol}`;
}

document.getElementById("ethInput").oninput = updateQuote;

document.getElementById("maxBtn").onclick = async () => {
  if (tier === 0) return;
  const price = await getPrice();
  const cap = await ido.MAX_PER_WALLET();
  const remainingCap = cap - purchased;
  const maxFromCap = (remainingCap * price) / (10n ** 36n);
  const usable = maxFromCap < honeyBal ? maxFromCap : honeyBal;
  document.getElementById("ethInput").value = parseFloat(ethers.formatUnits(usable, 18)).toFixed(4);
  await updateQuote();
};

document.getElementById("buyBtn").onclick = async () => {
  try {
    if (!signer || tier === 0) {
      alert("You need an Investor NFT to participate");
      return;
    }
    const val = document.getElementById("ethInput").value.trim();
    if (!val || Number(val) <= 0) {
      alert("Enter a valid amount");
      return;
    }

    const payment = ethers.parseUnits(val, 18);
    const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);

    const approveTx = await honey.approve(pool, payment);
    await approveTx.wait();

    const buyTx = await ido.buy(payment);
    await buyTx.wait();

    await refreshAll();
    alert(`🎉 Purchase successful! You received ${meta.symbol} tokens.`);
  } catch (err) {
    console.error(err);
    let msg = err?.reason || err?.message || "Transaction failed";
    if (msg.includes("Wallet cap") || msg.includes("cap exceeded")) msg = "You reached your wallet allocation limit";
    alert("❌ " + msg);
  }
};

// Auto-load pool state for display even before connect
(async () => {
  try {
    await loadPoolMetadata();
  } catch (e) {}
})();
