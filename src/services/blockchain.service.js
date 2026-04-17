const { createContracts } = require("../config/blockchain");
const env = require("../config/env");
const { ethers } = require("ethers");
const ApiError = require("../utils/ApiError");

const contractsByChain = createContracts(env);

function resolveNetworkLabel(network) {
  const preferred = String(network || env.activeChain || "l1")
    .trim()
    .toLowerCase();

  if (contractsByChain[preferred]) {
    return preferred;
  }
  if (contractsByChain.l1) {
    return "l1";
  }
  if (contractsByChain.l2) {
    return "l2";
  }
  throw new ApiError(500, "No blockchain network is configured");
}

function chainMeta(network) {
  const cfg = env[network] || {};
  return {
    network,
    chainId: cfg.chainId || null,
    registryAddress: cfg.productRegistryAddress || null,
    lifecycleAddress: cfg.productLifecycleAddress || null,
  };
}

function receiptHash(receipt) {
  return receipt.hash || receipt.transactionHash || null;
}

function gasMetricsFromReceipt(receipt) {
  const gasUsed = receipt.gasUsed ?? null;
  const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? null;
  if (!gasUsed || !gasPrice) {
    return {
      gasUsed: null,
      gasPriceWei: null,
      costWei: null,
      costEth: null,
    };
  }
  const costWei = gasUsed * gasPrice;
  return {
    gasUsed: gasUsed.toString(),
    gasPriceWei: gasPrice.toString(),
    costWei: costWei.toString(),
    costEth: ethers.formatEther(costWei),
  };
}

async function addProductOnChain(productIdOnChain, name, options = {}) {
  const network = resolveNetworkLabel(options.network);
  const contracts = contractsByChain[network];
  const tx = await contracts.productRegistry.addProduct(BigInt(productIdOnChain), name);
  const receipt = await tx.wait();
  return {
    ...chainMeta(network),
    txHash: receiptHash(receipt),
    blockNumber: Number(receipt.blockNumber),
    gas: gasMetricsFromReceipt(receipt),
  };
}

async function addLifecycleEventOnChain(
  productIdOnChain,
  eventType,
  locationText,
  options = {}
) {
  const network = resolveNetworkLabel(options.network);
  const contracts = contractsByChain[network];
  const tx = await contracts.productLifecycle.addEvent(
    BigInt(productIdOnChain),
    eventType,
    locationText
  );
  const receipt = await tx.wait();
  return {
    ...chainMeta(network),
    txHash: receiptHash(receipt),
    blockNumber: Number(receipt.blockNumber),
    gas: gasMetricsFromReceipt(receipt),
  };
}

module.exports = {
  contractsByChain,
  addProductOnChain,
  addLifecycleEventOnChain,
};
