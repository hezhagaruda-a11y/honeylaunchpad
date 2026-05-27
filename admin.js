import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  ===================================================================
  HIVE CONTROL DASHBOARD – THE SANCTUM OF THE HONEYCOMB LATTICE
  ===================================================================
 
  This is the private command center of the Honey Launchpad Protocol.
  Only authorized wallets can enter. From here the builder forges new
  sovereign IDO pools that become living hexagons in the lattice.
 
  Current canonical addresses (May 2026 Clean Slate):
  - IDOFactory : 0x7Df7c9253A88d2C2dBaBB1dA18BF234aa0D111B0
  - InvestorNFT: 0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037
  - Payment    : MockETH (0x084283482cAA832eb629a2c7674C2454A8277597)
 
  Every launch here creates a new pool. The success message now correctly
  shows the real new pool address + a clear top-up reminder.
*/

const FACTORY = "0x58aF8F88B834C11AD211475C86a76966F6306ABE";
const NFT     = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";
const ETH     = "0x084283482cAA832eb629a2c7674C2454A8277597";   // MockETH – official payment token

const FACTORY_ABI = [
  "function getAllPools() view returns (address[])",
  "function launchIDO(address _saleToken, address _treasury, uint256 _startTime, uint256 _endTime, uint256 _totalSupplyForSale)"
];

const NFT_ABI = [
  "function getUserTier(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

const POOL_ABI = [
  "function totalSold() view returns (uint256)",
  "function totalSupplyForSale() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function purchased(address) view returns (uint256)",
  "function PRICE_GOLD() view returns (uint256)"
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

let signer, provider, userAddress = null;

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

  const saleToken = document.getElementById("saleToken").value.trim();
  const treasury  = document.getElementById("treasury").value.trim();
  let start = parseInt(document.getElementById("startTime").value) || Math.floor(Date.now() / 1000) + 300;
  let end   = parseInt(document.getElementById("endTime").value) || start + 86400;
  const total = document.getElementById("totalSupply").value || "145500000000000000000000000";

  if (!saleToken || !treasury) {
    return alert("Please fill in Sale Token and Treasury addresses");
  }

  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, signer);

  try {
    const tx = await factory.launchIDO(saleToken, treasury, start, end, total);
    alert("Launching new IDO pool...\nTx: " + tx.hash);

    await tx.wait();

    // === Get the actual newly created pool address ===
    const updatedPools = await factory.getAllPools();
    const newPoolAddress = updatedPools[updatedPools.length - 1];

    const projectName = document.getElementById("projectName").value || "New IDO";
    const symbol      = document.getElementById("symbol").value || "TOK";

    alert(
      `✅ New IDO Pool launched successfully!\n\n` +
      `Project: ${projectName} (${symbol})\n` +
      `Pool Address: ${newPoolAddress}\n\n` +
      `⚠️ IMPORTANT REMINDER:\n` +
      `Top up the pool contract above with the full sale supply so participants can buy tokens.\n\n` +
      `You can now share this pool address on the main dashboard.`
    );

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

    let totalETH = 0n;

    for (const poolAddr of pools) {
      const ethContract = new ethers.Contract(ETH, ERC20_ABI, provider);
      const poolETH = await ethContract.balanceOf(poolAddr).catch(() => 0n);
      totalETH += poolETH;
    }

    const nftContract = new ethers.Contract(NFT, NFT_ABI, provider);
    const totalNFTs = await nftContract.totalSupply();

    document.getElementById("quickStats").innerHTML = `
      <p><strong>Total Pools:</strong> ${pools.length}</p>
      <p><strong>Total NFTs Minted:</strong> ${totalNFTs}</p>
      <p><strong>Total ETH Raised:</strong> ${Number(ethers.formatUnits(totalETH, 18)).toLocaleString()} ETH</p>
    `;
  } catch (e) {
    console.error("Refresh failed", e);
  }
}

// Event listeners
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("launchBtn").onclick = launchNewPool;
document.getElementById("refreshBtn").onclick = refreshAll;

console.log("🚀 Hive Control Dashboard loaded - Wallet gated access active");
console.log("Authorized wallets:", authorizedWallets);
