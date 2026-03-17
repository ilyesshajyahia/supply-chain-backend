const { ethers } = require("ethers");

const rolesManagerAbi = [
  "function isManufacturer(address _addr) view returns (bool)",
  "function isReseller(address _addr) view returns (bool)",
  "function isRetailer(address _addr) view returns (bool)"
];

const productRegistryAbi = [
  "function addProduct(uint256 productID, string name)",
  "function exists(uint256 productID) view returns (bool)",
  "function getProduct(uint256 productID) view returns (string,address,uint256)"
];

const productLifecycleAbi = [
  "function addEvent(uint256 productID, string eventType, string location)",
  "function getEvents(uint256 productID) view returns ((string eventType,address actor,uint256 timestamp,string location)[])"
];

function createContracts(env) {
  const provider = new ethers.JsonRpcProvider(env.rpcUrl, env.chainId || undefined);
  const signer = new ethers.Wallet(env.signerPrivateKey, provider);

  return {
    provider,
    signer,
    rolesManager: new ethers.Contract(env.rolesManagerAddress, rolesManagerAbi, signer),
    productRegistry: new ethers.Contract(env.productRegistryAddress, productRegistryAbi, signer),
    productLifecycle: new ethers.Contract(env.productLifecycleAddress, productLifecycleAbi, signer),
  };
}

module.exports = { createContracts };
