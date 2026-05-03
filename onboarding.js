import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/*
  STORYLIKE DOCUMENTATION – Onboarding.js
  This file is the digital threshold ritual of the Honey Protocol.
  It is the moment a new player moves from curiosity to participation.
  Every line here serves the greater whole: welcoming, guiding, and empowering the first believers.
  The code is intentionally simple and consistent with all other pages so the player feels at home immediately.
  In the clean-slate protocol, this is the first pure experience — no legacy decimals, no hidden complexity.
  This page is the bridge between the outside world and the living honeycomb.
*/

const HONEY = "0x1364819B3367f37c77813FE149074d963F2A5021";
const NFT = "0xa2c21b49c9f09f20C409591f9EFfc7bD2EDE8037";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const NFT_ABI = ["function getUserTier(address) view returns (uint256)"];

let signer, provider;

document.getElementById("connectBtn").onclick = async () => {
  try {
    if (!window.ethereum) {
      alert("MetaMask not detected.\n\nBest experience: Open this page inside the MetaMask mobile browser.");
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const addr = await signer.getAddress();

    document.getElementById("wallet").innerHTML = `<strong>${addr.substring(0,8)}...${addr.substring(36)}</strong>`;

    const nft = new ethers.Contract(NFT, NFT_ABI, signer);
    const tier = Number(await nft.getUserTier(addr));
    const tierNames = ["None", "Bronze", "Silver", "Gold"];
    document.getElementById("tier").innerHTML = tierNames[tier];

    const honey = new ethers.Contract(HONEY, ERC20_ABI, signer);
    const balance = await honey.balanceOf(addr);
    document.getElementById("honeyBalance").innerHTML = 
      (Number(balance) / 1e18).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " HONEY";

    document.getElementById("walletInfo").style.display = "block";
  } catch (e) {
    console.error(e);
    alert("Wallet connection failed. Please make sure you are on Sepolia network.");
  }
};