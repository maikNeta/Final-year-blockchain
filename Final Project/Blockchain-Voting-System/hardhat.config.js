require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const normalizePrivateKey = (key) => {
  if (!key) return undefined;
  return key.startsWith("0x") ? key : `0x${key}`;
};

const PRIVATE_KEY = normalizePrivateKey(process.env.PRIVATE_KEY);

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      chainId: 137,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    amoy: {
      url: process.env.AMOY_RPC_URL,
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonAmoy: process.env.POLYGON_AMOY_API_KEY,
    },
  },
};
