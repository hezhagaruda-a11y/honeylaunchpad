import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/* 
  ===================================================================
  SPARK DEX – THE PRIMAL HEARTBEAT OF THE HONEY LAUNCHPAD PROTOCOL
  ===================================================================
  This page is the sacred forge where the first spark of belief is struck.
  The constant-product pool, seeded with 300 MockUSDC and 7,500,000 HONEY,
  is the origin point of all price discovery, all early advantage, 
  all arbitrage, and ultimately all generational wealth mechanics.

  Every swap here is a microcosm of the entire protocol: a player brings MockUSDC 
  (the clean-slate stable value) and receives HONEY in return. 
  This simple act is the ignition of the honeycomb lattice.

  The page has been fully aligned with the clean slate state.
  MockUSDC is the payment token for Spark DEX.
  MockETH remains reserved for IDO launch pools only.

  New Spark DEX pool deployed: 0x7c42daFfbA3a7103d456a0d5d076e58901bE378b
*/

const HONEY = "0x8285bd7892F89b65632Ec5De8A700183DBA8cdb2";
const MOCKUSDC = "0x9544B69170Da4c1916140d955972Bfd53848E106";
const SPARK_POOL = "0x7c42daFfbA3a7103d456a0d5d076e58901bE378b";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256)", "function allowance(address,address) view returns (uint256)"];
const PAIR_ABI = ["function swap(uint256,uint256,address,bytes)"];

let signer, provider;
let reserveMockUSDC = 0;
let reserveHONEY = 0;
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
    const mockusdc = new ethers.Contract(MOCKUSDC, ERC20_ABI, signer);
    const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
    const mockusdcBal = await mockusdc.balanceOf(await signer.getAddress());
    const honeyBal = await honey.balanceOf(await signer.getAddress());
    document.getElementById("usdcBalance").innerHTML = `MockUSDC Balance: <strong>${(Number(mockusdcBal) / 1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>`;
    document.getElementById("honeyBalance").innerHTML = `HONEY Balance: <strong>${(Number(honeyBal) / 1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>`;
  } catch (e) {
    console.error("Balance fetch failed", e);
  }
}

async function loadPoolState() {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const mockusdc = new ethers.Contract(MOCKUSDC, ERC20_ABI, provider);
    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);

    reserveMockUSDC = Number(await mockusdc.balanceOf(SPARK_POOL)) / 1e18;
    reserveHONEY = Number(await honey.balanceOf(SPARK_POOL)) / 1e18;

    currentLivePrice = (reserveMockUSDC > 0) ? reserveMockUSDC / reserveHONEY : 0;

    let priceStr = currentLivePrice > 0 ? currentLivePrice.toFixed(8).replace(/0+$/, '').replace(/\.$/, '') : "0";
    document.getElementById("honeyPriceDisplay").innerHTML = `
      Live Honey Price: <strong>${priceStr} MockUSDC</strong>
    `;

    document.getElementById("poolState").innerHTML = `
      Pool Reserves:<br>
      • MockUSDC: <strong>${reserveMockUSDC.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong><br>
      • HONEY: <strong>${reserveHONEY.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
    `;

    updateQuote();
  } catch (e) {
    console.error("Pool state fetch failed", e);
    document.getElementById("poolState").innerHTML = `
      <span style="color:#f44336">Unable to read pool reserves.<br>
      The pool may not be funded yet or there is a network issue.</span>
    `;
    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>—</strong>`;
  }
}

function updateQuote() {
  const input = document.getElementById('swapAmount');
  const receiveDisplay = document.getElementById('quote');
  const mockusdcAmount = parseFloat(input.value) || 0;
  if (!currentLivePrice || mockusdcAmount <= 0) {
    receiveDisplay.innerHTML = `You will receive: <strong>— HONEY</strong>`;
    return;
  }
  const honeyAmount = (reserveHONEY * mockusdcAmount) / (reserveMockUSDC + mockusdcAmount);
  receiveDisplay.innerHTML = `You will receive: <strong>${honeyAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} HONEY</strong>`;
}

window.performSwap = async () => {
  const input = document.getElementById('swapAmount');
  const mockusdcAmount = parseFloat(input.value) || 0;
  if (mockusdcAmount <= 0) {
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
  statusEl.innerHTML = `<span style="color:#ff9800">Approving & swapping MockUSDC...</span>`;

  try {
    const mockusdc = new ethers.Contract(MOCKUSDC, ERC20_ABI, signer);
    const pool = new ethers.Contract(SPARK_POOL, PAIR_ABI, signer);

    const mockusdcToSwap = ethers.parseUnits(mockusdcAmount.toString(), 18);

    const expectedHoney = (reserveHONEY * mockusdcAmount) / (reserveMockUSDC + mockusdcAmount);
    const honeyOutMin = ethers.parseUnits((expectedHoney * 0.995).toString(), 18);

    const allowance = await mockusdc.allowance(await signer.getAddress(), SPARK_POOL);
    if (allowance < mockusdcToSwap) {
      const approveTx = await mockusdc.approve(SPARK_POOL, mockusdcToSwap);
      await approveTx.wait();
    }

    const tx = await pool.swap(0, honeyOutMin, await signer.getAddress(), "0x");
    await tx.wait();

    const honeyReceived = (reserveHONEY * mockusdcAmount) / (reserveMockUSDC + mockusdcAmount);

    statusEl.innerHTML = `
      <span style="color:#4caf50; font-size:1.1em; line-height:1.6; display:block; padding:12px; background:#e8f5e9; border-radius:8px; margin-top:12px;">
        🎉 Congratulations!<br>
        You have successfully swapped MockUSDC for HONEY!<br><br>
        This is your key to <strong>generational wealth fuel</strong> and priority access 
        in the Honey ecosystem.
      </span>
    `;

    await updateBalances();
    await loadPoolState();
  } catch (e) {
    console.error(e);
    if (e.message.includes("TRANSFER_FAILED")) {
      statusEl.innerHTML = `<span style="color:red">❌ TRANSFER_FAILED<br>The pool contract does not have enough HONEY tokens.<br>Please send 7,500,000 HONEY to the pool address.</span>`;
    } else {
      statusEl.innerHTML = `<span style="color:red">❌ Swap failed. Check console for details.</span>`;
    }
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
