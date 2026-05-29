import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  ===================================================================
  SPARK DEX – THE PRIMAL HEARTBEAT OF THE HONEY LAUNCHPAD PROTOCOL
  ===================================================================
  Updated with clean price formatting (no trailing zeros).
*/

const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";
const MOCKUSDC = "0x9544B69170Da4c1916140d955972Bfd53848E106";
const SPARK_POOL = "0xE479823072D2c7b1881Fa7315cd2557A8D5A7b9b";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256)", "function allowance(address,address) view returns (uint256)"];
const PAIR_ABI = ["function swap(uint256,uint256,address,bytes)"];

let signer, provider;
let reserveMockUSDC = 0;
let reserveHONEY = 0;

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not detected.");
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
    alert("Wallet connection failed.");
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
    const mockusdc = new ethers.Contract(MOCKUSDC, ERC20_ABI, provider || new ethers.BrowserProvider(window.ethereum));
    const honey = new ethers.Contract(HONEY, ERC20_ABI, provider || new ethers.BrowserProvider(window.ethereum));

    reserveMockUSDC = Number(await mockusdc.balanceOf(SPARK_POOL)) / 1e18;
    reserveHONEY = Number(await honey.balanceOf(SPARK_POOL)) / 1e18;

    if (reserveHONEY === 0) {
      document.getElementById("poolState").innerHTML = `<span style="color:#f44336">⚠️ Pool has 0 HONEY liquidity.<br>Please send HONEY to the pool address.</span>`;
      document.getElementById("honeyPriceDisplay").innerHTML = `<span style="color:#f44336">Live Honey Price: Not available</span>`;
      return;
    }

    const price = reserveMockUSDC / reserveHONEY;

    // Clean price formatting – removes trailing zeros (the fix you asked for)
    let priceStr = price.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');

    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>${priceStr} MockUSDC</strong>`;
    document.getElementById("poolState").innerHTML = `
      Pool Reserves:<br>
      • MockUSDC: <strong>${reserveMockUSDC.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong><br>
      • HONEY: <strong>${reserveHONEY.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
    `;
    updateQuote();
  } catch (e) {
    console.error(e);
    document.getElementById("poolState").innerHTML = `<span style="color:#f44336">Unable to read pool reserves.</span>`;
  }
}

function updateQuote() {
  const input = document.getElementById('swapAmount');
  const receiveDisplay = document.getElementById('quote');
  const mockusdcAmount = parseFloat(input.value) || 0;
  if (reserveHONEY === 0 || mockusdcAmount <= 0) {
    receiveDisplay.innerHTML = `You will receive: <strong>— HONEY</strong>`;
    return;
  }
  const honeyAmount = (reserveHONEY * mockusdcAmount) / (reserveMockUSDC + mockusdcAmount);
  receiveDisplay.innerHTML = `You will receive: <strong>${honeyAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} HONEY</strong>`;
}

window.performSwap = async () => {
  // Your original swap logic (unchanged)
  const input = document.getElementById('swapAmount');
  const mockusdcAmount = parseFloat(input.value) || 0;
  if (mockusdcAmount <= 0) {
    alert("Please enter a valid amount");
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
