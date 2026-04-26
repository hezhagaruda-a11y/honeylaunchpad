import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const HONEY = "0xe750381c8e13f2c59c3EFb7DA37af7232Da03aD2";
const USDC = "0x0dde8f47709a785CEc265779Bb75fDBC7a3d8e93";
const SPARK_POOL = "0x288728f3d24F9CC63771eB463f1D144d24C493F0";

let signer, provider;

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
    calculateQuote();
  } catch (e) {
    console.error(e);
    alert("Wallet connection failed.\n\nMake sure you are on Sepolia network and try again.");
  }
}

async function updateBalances() {
  if (!signer) return;
  const address = await signer.getAddress();

  const usdcContract = new ethers.Contract(USDC, ["function balanceOf(address) view returns (uint256)"], signer);
  const honeyContract = new ethers.Contract(HONEY, ["function balanceOf(address) view returns (uint256)"], signer);

  try {
    const usdcBal = await usdcContract.balanceOf(address);
    const honeyBal = await honeyContract.balanceOf(address);

    document.getElementById("usdcBalance").innerHTML = `USDC Balance: <strong>${(Number(usdcBal)/1e6).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</strong>`;
    document.getElementById("honeyBalance").innerHTML = `HONEY Balance: <strong>${(Number(honeyBal)/1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</strong>`;
  } catch (e) {}
}

async function calculateQuote() {
  const usdcInput = parseFloat(document.getElementById("usdcAmount").value) || 0;
  if (usdcInput <= 0) {
    document.getElementById("quote").innerHTML = "You will receive: <strong>0.00 HONEY</strong>";
    return;
  }

  try {
    const pool = new ethers.Contract(SPARK_POOL, ["function getReserves() view returns (uint112,uint112,uint32)"], provider || new ethers.BrowserProvider(window.ethereum));
    const [reserve0, reserve1] = await pool.getReserves();

    const usdcReserve = Number(reserve0) / 1e6;
    const honeyReserve = Number(reserve1) / 1e18;

    const k = usdcReserve * honeyReserve;
    const newUsdc = usdcReserve + usdcInput;
    const newHoney = k / newUsdc;
    const honeyOut = honeyReserve - newHoney;

    document.getElementById("quote").innerHTML = `
      You will receive: <strong>${honeyOut.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})} HONEY</strong>
    `;
  } catch (e) {}
}

window.swapUSDCForHONEY = async () => {
  if (!signer) {
    alert("Please connect wallet first");
    return;
  }

  const usdcInput = parseFloat(document.getElementById("usdcAmount").value) || 0;
  if (usdcInput <= 0) return;

  try {
    const usdcContract = new ethers.Contract(USDC, ["function approve(address,uint256)"], signer);
    const pool = new ethers.Contract(SPARK_POOL, ["function swapUSDCForHONEY(uint256)"], signer);

    const approveTx = await usdcContract.approve(SPARK_POOL, ethers.parseUnits(usdcInput.toString(), 6));
    await approveTx.wait();

    const swapTx = await pool.swapUSDCForHONEY(ethers.parseUnits(usdcInput.toString(), 6));
    await swapTx.wait();

    document.getElementById("status").innerHTML = `<span style="color:#4caf50">✅ Swap successful! HONEY transferred to your wallet.</span>`;
    await updateBalances();
    calculateQuote();
  } catch (e) {
    console.error(e);
    document.getElementById("status").innerHTML = `<span style="color:red">❌ Swap failed: ${e.reason || e.message}</span>`;
  }
};

document.getElementById("themeToggle").onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
};

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("usdcAmount").oninput = calculateQuote;

// Initial load
calculateQuote();