import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const FACTORY = "0x0388C62Ad1d354d9cb1d3533e143034B4B690102";
const NFT = "0x475C04Ea6428048C28dA7cd9D04Cd62b7dDd54EA";
const USDC = "0x0dde8f47709a785CEc265779Bb75fDBC7a3d8e93";

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

let signer, provider;

const PROJECTS = {
  "0x81eb4d4279027a8b79b017c8d0c7e7d752511a0b": { name: "EEE Launch #1", symbol: "EEE" },
  "0x0857de57bdbf43fcc3df67f9a4076beb97f1c79b": { name: "DDD Launch #4", symbol: "DDD" },
  "0xfdefcb25bbf1525c067a3033b68011efff0e63e2": { name: "DDD Launch #3", symbol: "DDD" },
  "0x1372b8dd99c74b6fbfee15dbe11affde6008e473": { name: "DDD Launch #2", symbol: "DDD" }
};

async function connectWallet() {
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  const addr = await signer.getAddress();
  document.getElementById("adminWallet").innerText = addr;
  document.getElementById("walletInfo").style.display = "block";
  document.getElementById("treasury").value = addr;
  await refreshAll();
}

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
  try {
    const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
    const pools = await factory.getAllPools();

    // Quick Stats - Total USDC Raised = balance of connected wallet (treasury)
    let totalUSDC = 0n;
    if (signer) {
      const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
      totalUSDC = await usdc.balanceOf(await signer.getAddress());
    }

    document.getElementById("quickStats").innerHTML = `
      <p><strong>Total Pools:</strong> ${pools.length}</p>
      <p><strong>Total NFTs Minted:</strong> <span id="totalNFTs">Loading...</span></p>
      <p><strong>Total USDC Raised:</strong> ${Number(ethers.formatUnits(totalUSDC, 6)).toLocaleString()} USDC</p>
    `;

    // Pools Table
    const tbody = document.querySelector("#poolsTable tbody");
    tbody.innerHTML = "";

    for (const addr of pools) {
      let name = "New Pool";
      let symbol = "TOK";
      let startTimeStr = "N/A";
      let endTimeStr = "N/A";
      let soldStr = "0 TOK";
      let remainingStr = "0 TOK";
      let percentStr = "0%";
      let raisedUSDCStr = "0 USDC";

      try {
        const meta = PROJECTS[addr.toLowerCase()] || { name: "New Pool", symbol: "TOK" };
        name = meta.name;
        symbol = meta.symbol || "TOK";

        const pool = new ethers.Contract(addr, POOL_ABI, provider);

        const sold = await pool.totalSold().catch(() => 0n);
        const total = await pool.totalSupplyForSale().catch(() => 0n);
        const startTime = await pool.startTime().catch(() => 0);
        const endTime = await pool.endTime().catch(() => 0);

        const soldNum = parseFloat(ethers.formatUnits(sold, 18)) || 0;
        const totalNum = parseFloat(ethers.formatUnits(total, 18)) || 0;
        const percent = totalNum > 0 ? ((soldNum / totalNum) * 100).toFixed(2) : "0";

        // USDC Raised = totalSold * PRICE_GOLD (accurate value raised)
        let raisedUSDC = 0n;
        try {
          const priceGold = await pool.PRICE_GOLD();
          raisedUSDC = (sold * priceGold) / (10n ** 30n);
        } catch (e) {
          // fallback to treasury balance if price call fails
          const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
          raisedUSDC = await usdc.balanceOf(addr).catch(() => 0n);
        }

        soldStr = soldNum.toLocaleString() + " " + symbol;
        remainingStr = (totalNum - soldNum).toLocaleString() + " " + symbol;
        percentStr = percent + "%";
        raisedUSDCStr = Number(ethers.formatUnits(raisedUSDC, 6)).toLocaleString() + " USDC";

        startTimeStr = startTime > 0 ? new Date(startTime * 1000).toLocaleString() : "N/A";
        endTimeStr = endTime > 0 ? new Date(endTime * 1000).toLocaleString() : "N/A";

      } catch (e) {
        console.error("Error loading pool", addr, e);
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${name}</td>
        <td style="font-size:11px;">${addr}</td>
        <td>${startTimeStr}</td>
        <td>${endTimeStr}</td>
        <td>${soldStr}</td>
        <td>${remainingStr}</td>
        <td>${percentStr}</td>
        <td>${raisedUSDCStr}</td>
      `;
      tbody.appendChild(row);
    }

    // NFT Stats
    const nftContract = new ethers.Contract(NFT, NFT_ABI, provider);
    const totalNFTs = await nftContract.totalSupply();
    document.getElementById("totalNFTs").innerText = totalNFTs;

  } catch (e) {
    console.error("Refresh failed", e);
  }
}

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("launchBtn").onclick = launchNewPool;
document.getElementById("refreshBtn").onclick = refreshAll;