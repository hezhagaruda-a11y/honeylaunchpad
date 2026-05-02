import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";
const FACTORY = "0x9c6CF08f7F5D278508A939091933D7fE85557a95";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";
const USDC = "0x0dde8f47709a785CEc265779Bb75fDBC7a3d8e93";
const SPARK_POOL = "0x288728f3d24F9CC63771eB463f1D144d24C493F0";
const FACTORY_ABI = [
  "function getAllPools() view returns (address[])",
  "function launchIDO(address _saleToken, address _treasury, uint256 _startTime, uint256 _endTime, uint256 _totalSupplyForSale)"
];
const NFT_ABI = ["function getUserTier(address) view returns (uint256)", "function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)"];
const POOL_ABI = [
  "function totalSold() view returns (uint256)",
  "function totalSupplyForSale() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function purchased(address) view returns (uint256)",
  "function PRICE_GOLD() view returns (uint256)"
];
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const PAIR_ABI = ["function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];
let signer, provider, userAddress = null;
// Authorized wallets - your wallet is the first authorized one
let authorizedWallets = JSON.parse(localStorage.getItem("hiveAuthorizedWallets") || "[]");
if (authorizedWallets.length === 0) {
  authorizedWallets = ["0x7EE4fe6dc352f830D7F57E2E99CaB462c05D5882"];
  localStorage.setItem("hiveAuthorizedWallets", JSON.stringify(authorizedWallets));
}
console.log("🚀 Hive Control Dashboard loaded - Wallet gated access active");
console.log("Authorized wallets:", authorizedWallets);
async function connectWallet() {
  console.log("🔌 Connect Wallet button clicked");
  try {
    if (!window.ethereum) {
      alert("MetaMask not detected.\n\nPlease open this page inside the MetaMask browser.");
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    // Explicit Sepolia network check
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
      alert("Please switch to Sepolia network in MetaMask and try again.");
      return;
    }
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    console.log("✅ Connected wallet:", userAddress);
    console.log("Network confirmed: Sepolia");
    document.getElementById("adminWallet").innerText = userAddress;
    document.getElementById("walletInfo").style.display = "block";
    const normalizedConnected = userAddress.toLowerCase();
    const isAuthorized = authorizedWallets.some(addr => addr.toLowerCase() === normalizedConnected);
    console.log("Authorization check:", isAuthorized ? "✅ Authorized" : "❌ Not authorized");
    if (!isAuthorized) {
      document.getElementById("unauthorizedMessage").style.display = "block";
      document.getElementById("mainContent").style.display = "none";
      return;
    }
    document.getElementById("unauthorizedMessage").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("treasury").value = userAddress;
    await refreshAll();
    renderAuthorizedList();
    document.getElementById("refreshBtn").onclick = refreshAll;
  } catch (e) {
    console.error("Wallet connection failed:", e);
    alert("Wallet connection failed.\n\nMake sure you are on Sepolia network and try again.");
  }
}
function renderAuthorizedList() {
  const container = document.getElementById("authorizedList");
  container.innerHTML = "";
  authorizedWallets.forEach((wallet, index) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.padding = "16px 0";
    div.style.borderBottom = "1px solid #ddd";
    div.innerHTML = `
      <span style="font-family:monospace; font-size:15px;">${wallet.substring(0,8)}...${wallet.substring(36)}</span>
      <button onclick="removeAuthorizedWallet(${index})" style="background:#f44336; padding:8px 16px; font-size:13px;">Remove</button>
    `;
    container.appendChild(div);
  });
}
window.addAuthorizedWallet = function addAuthorizedWallet() {
  const input = document.getElementById("newWalletInput");
  const newWallet = input.value.trim();
  if (!newWallet || !newWallet.startsWith("0x") || newWallet.length !== 42) {
    alert("Please enter a valid wallet address (0x...)");
    return;
  }
  const normalized = newWallet.toLowerCase();
  if (authorizedWallets.some(addr => addr.toLowerCase() === normalized)) {
    alert("Wallet already authorized");
    return;
  }
  authorizedWallets.push(newWallet);
  localStorage.setItem("hiveAuthorizedWallets", JSON.stringify(authorizedWallets));
  renderAuthorizedList();
  input.value = "";
  alert("Wallet added to authorized list");
};
window.removeAuthorizedWallet = function removeAuthorizedWallet(index) {
  if (confirm("Remove this wallet from authorized list?")) {
    authorizedWallets.splice(index, 1);
    localStorage.setItem("hiveAuthorizedWallets", JSON.stringify(authorizedWallets));
    renderAuthorizedList();
  }
};
async function launchNewPool() {
  if (!signer) return alert("Connect wallet first");
  const saleToken = document.getElementById("saleToken").value;
  const treasury = document.getElementById("treasury").value;
  let start = parseInt(document.getElementById("startTime").value) || Math.floor(Date.now() / 1000) + 300;
  let end = parseInt(document.getElementById("endTime").value) || start + 86400;
  const total = document.getElementById("totalSupply").value;
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, signer);
  try {
    const tx = await factory.launchIDO(saleToken, treasury, start, end, total);
    alert("Launching pool... Tx: " + tx.hash);
    await tx.wait();
    alert("✅ New pool launched successfully!");
    await refreshAll();
  } catch (e) {
    console.error(e);
    alert("Launch failed: " + (e.reason || e.message));
  }
}
async function refreshAll() {
  console.log("🔄 Refresh button clicked - refreshing all sections");
  try {
    const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
    const pools = await factory.getAllPools();
    let totalUSDC = 0n;
    for (const poolAddr of pools) {
      const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
      const poolUSDC = await usdc.balanceOf(poolAddr).catch(() => 0n);
      totalUSDC += poolUSDC;
    }
    const nftContract = new ethers.Contract(NFT, NFT_ABI, provider);
    const totalNFTs = await nftContract.totalSupply();
    document.getElementById("quickStats").innerHTML = `
      <p><strong>Total Pools:</strong> ${pools.length}</p>
      <p><strong>Total NFTs Minted:</strong> ${totalNFTs}</p>
      <p><strong>Total USDC Raised:</strong> ${Number(ethers.formatUnits(totalUSDC, 6)).toLocaleString()} USDC</p>
    `;
  } catch (e) {
    console.error("Refresh failed", e);
  }
}
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("launchBtn").onclick = launchNewPool;
document.getElementById("refreshBtn").onclick = refreshAll;
console.log("🚀 Hive Control Dashboard loaded - Wallet gated access active");
console.log("Authorized wallets:", authorizedWallets);