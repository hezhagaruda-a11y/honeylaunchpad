import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const USDC = "0x0dde8f47709a785CEc265779Bb75fDBC7a3d8e93";
const SPARK_POOL = "0x288728f3d24F9CC63771eB463f1D144d24C493F0";

const POOL_ABI = ["function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256)", "function allowance(address,address) view returns (uint256)"];
const PAIR_ABI = ["function swap(uint256,uint256,address,bytes)"];

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
    await loadPoolState();
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

async function loadPoolState() {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const pool = new ethers.Contract(SPARK_POOL, POOL_ABI, provider);
    const [reserve0, reserve1] = await pool.getReserves();

    const usdcReserve = Number(reserve0) / 1e6;
    const honeyReserve = Number(reserve1) / 1e18;
    currentLivePrice = usdcReserve / honeyReserve;

    // Live Honey Price: clean, no trailing zeros
    let priceStr = currentLivePrice.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    document.getElementById("honeyPriceDisplay").innerHTML = `
      Live Honey Price: <strong>${priceStr} USDC</strong>
    `;

    document.getElementById("poolState").innerHTML = `
      Pool Reserves:<br>
      • USDC: <strong>${usdcReserve.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong><br>
      • HONEY: <strong>${honeyReserve.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
    `;

    updateQuote();
  } catch (e) {
    console.error("Pool state fetch failed", e);
  }
}

function updateQuote() {
  const input = document.getElementById('swapAmount');
  const receiveDisplay = document.getElementById('quote');
  const usdcAmount = parseFloat(input.value) || 0;
  if (!currentLivePrice || usdcAmount <= 0) {
    receiveDisplay.innerHTML = `You will receive: <strong>— HONEY</strong>`;
    return;
  }
  const honeyAmount = usdcAmount / currentLivePrice;
  receiveDisplay.innerHTML = `You will receive: <strong>${honeyAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} HONEY</strong>`;
}

window.performSwap = async () => {
  const input = document.getElementById('swapAmount');
  const usdcAmount = parseFloat(input.value) || 0;
  if (usdcAmount <= 0) {
    alert("Please enter a valid amount");
    return;
  }
  if (!currentLivePrice) {
    alert("Price not loaded yet");
    return;
  }
  if (!signer) {
    alert("Please connect wallet first");
    return;
  }

  const statusEl = document.getElementById("status");
  statusEl.innerHTML = `<span style="color:#ff9800">Approving & swapping USDC...</span>`;

  try {
    const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
    const pool = new ethers.Contract(SPARK_POOL, PAIR_ABI, signer);

    const usdcToSwap = ethers.parseUnits(usdcAmount.toString(), 6);
    const honeyOutMin = ethers.parseUnits((usdcAmount / currentLivePrice * 0.97).toString(), 18);

    const allowance = await usdc.allowance(await signer.getAddress(), SPARK_POOL);
    if (allowance < usdcToSwap) {
      const approveTx = await usdc.approve(SPARK_POOL, usdcToSwap);
      await approveTx.wait();
    }

    const tx = await pool.swap(0, honeyOutMin, await signer.getAddress(), "0x");
    await tx.wait();

    const honeyReceived = usdcAmount / currentLivePrice;
    statusEl.innerHTML = `<span style="color:#4caf50">✅ Swap successful!<br>You received <strong>${honeyReceived.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} HONEY</strong></span>`;

    await updateBalances();
    await loadPoolState();
  } catch (e) {
    console.error(e);
    statusEl.innerHTML = `<span style="color:red">❌ Swap failed. Check console for details.</span>`;
  }
};

document.getElementById("themeToggle").onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
};

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("swapAmount").addEventListener('input', updateQuote);

// Initial load
loadPoolState();