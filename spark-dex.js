import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  ===================================================================
  SPARK DEX – THE PRIMAL HEARTBEAT OF THE HONEY LAUNCHPAD PROTOCOL
  ===================================================================
  Updated to sync with the new contracts and give clear feedback when the pool has no HONEY.
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
      document.getElementById("poolState").innerHTML = `<span class="warning">⚠️ Pool has 0 HONEY liquidity.<br>Please send HONEY to the pool address to enable trading.</span>`;
      document.getElementById("honeyPriceDisplay").innerHTML = `<span class="warning">Live Honey Price: Not available (pool empty)</span>`;
      return;
    }

    const price = reserveMockUSDC / reserveHONEY;
    document.getElementById("honeyPriceDisplay").innerHTML = `Live Honey Price: <strong>${price.toFixed(8)} MockUSDC</strong>`;
    document.getElementById("poolState").innerHTML = `
      Pool Reserves:<br>
      • MockUSDC: <strong>${reserveMockUSDC.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong><br>
      • HONEY: <strong>${reserveHONEY.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
    `;
    updateQuote();
  } catch (e) {
    console.error(e);
    document.getElementById("poolState").innerHTML = `<span class="warning">Unable to read pool reserves.</span>`;
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

window.performSwap = async () => { /* unchanged from your original */ };

document.getElementById("themeToggle").onclick = () => { /* unchanged */ };
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("swapAmount").addEventListener('input', updateQuote);
loadPoolState();
