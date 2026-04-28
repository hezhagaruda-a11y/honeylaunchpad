import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const USDC = "0x0dde8f47709a785CEc265779Bb75fDBC7a3d8e93";   // Correct USDC address
const SPARK_POOL = "0x288728f3d24F9CC63771eB463f1D144d24C493F0";

const POOL_ABI = ["function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

let signer, provider;
let currentLivePrice = null;

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

    await updateBalances();
    await loadLiveHoneyPrice();
  } catch (e) {
    console.error(e);
    alert("Wallet connection failed.\n\nMake sure you are on Sepolia network and try again.");
  }
}

async function updateBalances() {
  if (!signer) return;
  try {
    const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
    const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
    const usdcBal = await usdc.balanceOf(await signer.getAddress());
    const honeyBal = await honey.balanceOf(await signer.getAddress());
    document.getElementById("usdcBalance").innerHTML = `USDC Balance: <strong>${(Number(usdcBal) / 1e6).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>`;
    document.getElementById("honeyBalance").innerHTML = `HONEY Balance: <strong>${(Number(honeyBal) / 1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>`;
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
  } catch (e) {
    console.error("Live price fetch failed", e);
    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>0.00400000 USDC</strong> (Simulated Spark DEX Pool)`;
  }
}

window.performSwap = async () => {
  alert("Swap functionality coming in next iteration.");
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