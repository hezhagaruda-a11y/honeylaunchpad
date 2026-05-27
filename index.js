import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

const FACTORY = "0x58aF8F88B834C11AD211475C86a76966F6306ABE";
const NFT = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";

const FACTORY_ABI = ["function getAllPools() view returns (address[])"];
const NFT_ABI = ["function getUserTier(address) view returns (uint256)"];
const POOL_ABI = [
  "function totalSold() view returns (uint256)",
  "function totalSupplyForSale() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function purchased(address) view returns (uint256)"
];

const PROJECTS = {};

const connectBtn = document.getElementById("connectBtn");
const walletEl = document.getElementById("wallet");
const tierEl = document.getElementById("tier");
const poolsEl = document.getElementById("pools");
const purchasesEl = document.getElementById("purchases");

let signer, provider, userTier = 0, userAddress;

const themeToggle = document.getElementById("themeToggle");

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

const savedTheme = localStorage.getItem("theme") || "light";
setTheme(savedTheme);

themeToggle.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  setTheme(newTheme);
};

connectBtn.onclick = async () => {
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    walletEl.innerText = userAddress;
    const nft = new ethers.Contract(NFT, NFT_ABI, provider);
    userTier = Number(await nft.getUserTier(userAddress));
    const tiers = ["None", "Bronze", "Silver", "Gold"];
    tierEl.innerText = tiers[userTier];
    await loadPools();
    await loadMyAcquisitions();
  } catch (err) {
    console.error(err);
    tierEl.innerText = "Error — check console";
  }
};

async function loadPools() {
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
  const pools = await factory.getAllPools();
  poolsEl.innerHTML = "<h3 style='margin-top:30px;'>Available Pools</h3>";
  pools.forEach((addr) => {
    const meta = PROJECTS[addr.toLowerCase()] || { name: "Unknown Pool", symbol: "TOK", logo: "", banner: "" };
    const hasNFT = userTier > 0;
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="card pool-card">
        ${meta.banner ? `<img src="${meta.banner}" style="width:100%; height:120px; object-fit:cover; border-radius:12px 12px 0 0;">` : ''}
        <div style="padding:20px;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${meta.logo ? `<img src="${meta.logo}" width="40" height="40" style="border-radius:50%; object-fit:cover;">` : ''}
            <strong>${meta.name}</strong>
          </div>
          <div style="margin-top:8px; font-size:13px; color:#666; word-break:break-all;">${addr}</div>
          <div style="margin-top:4px; font-size:12px; color:#888;">IDO Launch Pool Address</div>
          <div style="margin-top:16px;">
            ${hasNFT
              ? `<button onclick="window.location.href='ido.html?pool=${addr}'" style="width:100%; padding:14px;">Enter ${meta.symbol} IDO</button>`
              : `<button style="background:#aaa; width:100%; padding:14px; margin-bottom:8px;">Investor NFT Required</button>
                 <button onclick="window.location.href='acquire-nft.html'" style="background:#4caf50; width:100%; padding:14px;">Acquire Investor NFT</button>`}
          </div>
        </div>
      </div>
    `;
    poolsEl.appendChild(div);
  });
}

async function loadMyAcquisitions() {
  if (!purchasesEl) return;
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
  const pools = await factory.getAllPools();
  purchasesEl.innerHTML = `<h3 style="margin-top:30px;">My Acquisitions</h3>`;
  let hasAny = false;
  for (const addr of pools) {
    const meta = PROJECTS[addr.toLowerCase()] || { name: "Unknown Pool", symbol: "TOK" };
    const pool = new ethers.Contract(addr, POOL_ABI, provider);
    const amount = await pool.purchased(userAddress);
    if (amount > 0n) {
      hasAny = true;
      const amountFormatted = parseFloat(ethers.formatUnits(amount, 18)).toLocaleString();
      const div = document.createElement("div");
      div.innerHTML = `
        <div class="card acquisition-card" style="display:flex; justify-content:space-between; align-items:center; padding:16px;">
          <div>
            <strong>${meta.name}</strong><br>
            <span style="color:#666; font-size:13px;">${addr}</span>
          </div>
          <div style="text-align:right;">
            <strong style="color:#4caf50; font-size:18px;">${amountFormatted} ${meta.symbol}</strong>
          </div>
        </div>
      `;
      purchasesEl.appendChild(div);
    }
  }
  if (!hasAny) {
    purchasesEl.innerHTML += `<p style="color:#666; font-style:italic; text-align:center; padding:20px;">You haven't acquired any tokens yet.</p>`;
  }
}
