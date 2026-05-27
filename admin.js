import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  ===================================================================
  HIVE CONTROL DASHBOARD – THE SANCTUM OF THE HONEYCOMB LATTICE
  ===================================================================
  
  This is the private forge where the visible game is quietly shaped.
  
  While players experience the warm, honeycomb-patterned public protocol — 
  with its celebratory mint messages, live traffic, competitive leaderboard, 
  and tiered privilege — the builder sits here in emerald silence, holding 
  the keys to the entire lattice.
  
  Updated contract addresses (clean slate, May 2026):
  - IDOFactory: 0x58aF8F88B834C11AD211475C86a76966F6306ABE
  - InvestorNFT: 0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037
  - Payment Token (HONEY): 0x1364819B3367f37c77813FE149074d963F2A5021
  
  The dashboard now supports real image upload for logo and banner with live preview.
  Files are stored in memory for future IPFS upload when launching the pool.
*/

const FACTORY = "0x58aF8F88B834C11AD211475C86a76966F6306ABE";
const NFT = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";
const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";

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
    const chainId = network.chainId;

    console.log("Detected network chainId:", chainId.toString());

    const SEPOLIA_CHAIN_ID = 11155111n;

    if (chainId !== SEPOLIA_CHAIN_ID && chainId !== 11155111) {
      alert("Please switch to Sepolia network in MetaMask and try again.\n\nCurrent network: " + chainId.toString());
      return;
    }

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    console.log("✅ Connected wallet:", userAddress);
    console.log("✅ Network confirmed: Sepolia");

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
    alert("Wallet connection failed.\n\nMake sure MetaMask is unlocked, on Sepolia network, and try again.");
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
    alert(`✅ New IDO Pool launched successfully!\n\nPool Address: ${tx.to}\n\nRemember to top up the pool with ${document.getElementById("totalSupply").value} tokens for sale.`);
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

    let totalHONEY = 0n;

    for (const poolAddr of pools) {
      const honey = new ethers.Contract(HONEY, ERC20_ABI, provider);
      const poolHONEY = await honey.balanceOf(poolAddr).catch(() => 0n);
      totalHONEY += poolHONEY;
    }

    const nftContract = new ethers.Contract(NFT, NFT_ABI, provider);
    const totalNFTs = await nftContract.totalSupply();

    document.getElementById("quickStats").innerHTML = `
      <p><strong>Total Pools:</strong> ${pools.length}</p>
      <p><strong>Total NFTs Minted:</strong> ${totalNFTs}</p>
      <p><strong>Total HONEY Raised:</strong> ${Number(ethers.formatUnits(totalHONEY, 18)).toLocaleString()} HONEY</p>
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

// Image upload preview logic
document.getElementById("logoFile").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById("logoPreview").src = ev.target.result;
      document.getElementById("logoPreview").style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById("bannerFile").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById("bannerPreview").src = ev.target.result;
      document.getElementById("bannerPreview").style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});
