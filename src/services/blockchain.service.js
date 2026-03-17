const { createContracts } = require("../config/blockchain");
const env = require("../config/env");

const contracts = createContracts(env);

async function addProductOnChain(productIdOnChain, name) {
  const tx = await contracts.productRegistry.addProduct(BigInt(productIdOnChain), name);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
}

async function addLifecycleEventOnChain(productIdOnChain, eventType, locationText) {
  const tx = await contracts.productLifecycle.addEvent(
    BigInt(productIdOnChain),
    eventType,
    locationText
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
}

module.exports = {
  contracts,
  addProductOnChain,
  addLifecycleEventOnChain,
};
