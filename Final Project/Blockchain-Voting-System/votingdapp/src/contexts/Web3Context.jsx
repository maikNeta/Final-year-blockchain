import React, { createContext, useContext, useState, useEffect } from "react";
import Web3 from "web3";
import VotingSystem from "../abi/VotingSystem.json";
import { CONTRACT_ADDRESS } from "../config";
import { rpcManager } from "../utils/rpcManager.js";
import { classifyError } from "../utils/errors.js";

// Create the Web3 context
const Web3Context = createContext();

// Custom hook to use the Web3 context
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};

// Web3 Provider component
export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [readContract, setReadContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentElection, setCurrentElection] = useState(null);
  const [electionCount, setElectionCount] = useState(0);
  const [rpcStatus, setRpcStatus] = useState({});

  // Ensure wallet is on Polygon and initialize Web3 and contract
  const initializeWeb3 = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (!window.ethereum) {
        throw new Error("🦊 Please install MetaMask to use this app.");
      }

      // Request network change to Polygon Mainnet if needed
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x89" }], // 137
        });
      } catch (switchError) {
        // If the chain is not added to MetaMask, request to add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x89",
                chainName: "Polygon Mainnet",
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                rpcUrls: [
                  "https://polygon-rpc.com",
                  "https://rpc.ankr.com/polygon",
                  "https://polygon.llamarpc.com"
                ],
                blockExplorerUrls: ["https://polygonscan.com"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Find working RPC endpoint for reads
      const workingEndpoint = await rpcManager.findWorkingEndpoint();
      console.log(`✅ Using RPC endpoint for reads: ${workingEndpoint}`);

      // Create Web3 instances: one for writes (MetaMask), one for reads (RPC)
      const web3Write = new Web3(window.ethereum);
      const web3Read = new Web3(workingEndpoint);
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      const currentAccount = accounts[0];
      
      if (!CONTRACT_ADDRESS) {
        throw new Error("Missing VITE_CONTRACT_ADDRESS. Set it in your frontend .env file.");
      }

      // Validate contract exists at address with retry logic (via read RPC)
      const code = await rpcManager.executeWithRetry(() => 
        web3Read.eth.getCode(CONTRACT_ADDRESS)
      );
      if (!code || code === "0x" || code === "0x0") {
        throw new Error("No contract found at VITE_CONTRACT_ADDRESS on Polygon. Check the address.");
      }

      // Create contract instances
      const contractWrite = new web3Write.eth.Contract(
        VotingSystem.abi,
        CONTRACT_ADDRESS
      );
      const contractRead = new web3Read.eth.Contract(
        VotingSystem.abi, 
        CONTRACT_ADDRESS
      );

      // Check if current account is admin with retry logic
      const adminAddr = await rpcManager.executeWithRetry(() => 
        contractRead.methods.admin().call()
      );
      const adminStatus = currentAccount.toLowerCase() === adminAddr.toLowerCase();

      // Get current election and election count with retry logic
      const [currentElectionData, electionCountData] = await Promise.all([
        rpcManager.executeWithRetry(() => contractRead.methods.getCurrentElection().call()),
        rpcManager.executeWithRetry(() => contractRead.methods.getElectionCount().call())
      ]);
      
      // Expose write-enabled web3 and contract; keep readContract internally and in context
      setWeb3(web3Write);
      setAccount(currentAccount);
      setContract(contractWrite);
      setReadContract(contractRead);
      setIsAdmin(adminStatus);
      setIsConnected(true);
      setCurrentElection(currentElectionData);
      setElectionCount(Number(electionCountData));

      // Update RPC status
      const status = await rpcManager.getEndpointStatus();
      setRpcStatus(status);

    } catch (err) {
      console.error("Web3 initialization error:", err);
      
      // Classify error for better user feedback
      const errorInfo = classifyError(err);
      let errorMessage = err.message || "Failed to initialize Web3";
      
      if (errorInfo.type === 'RPC_ERROR') {
        errorMessage = "🌐 Network connection issue. Please check your internet connection and try again.";
      }
      
      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWeb3(null);
    setAccount("");
    setContract(null);
    setIsAdmin(false);
    setIsConnected(false);
    setError("");
    setCurrentElection(null);
    setElectionCount(0);
    setRpcStatus({});
  };

  // Reconnect wallet
  const reconnectWallet = async () => {
    await initializeWeb3();
  };

  // Refresh election data
  const refreshElectionData = async () => {
    if (!readContract && !contract) return;
    try {
      const target = readContract || contract;
      const [currentElectionData, electionCountData] = await Promise.all([
        rpcManager.executeWithRetry(() => target.methods.getCurrentElection().call()),
        rpcManager.executeWithRetry(() => target.methods.getElectionCount().call())
      ]);
      setCurrentElection(currentElectionData);
      setElectionCount(Number(electionCountData));
    } catch (err) {
      console.error("Failed to refresh election data:", err);
      const errorInfo = classifyError(err);
      if (errorInfo.type === 'RPC_ERROR') {
        setError("🌐 Network error while refreshing data. Please try again.");
      }
    }
  };

  // Check RPC health
  const checkRPCHealth = async () => {
    try {
      const status = await rpcManager.getEndpointStatus();
      setRpcStatus(status);
      return status;
    } catch (err) {
      console.error("Failed to check RPC health:", err);
      return {};
    }
  };

  // Initialize on component mount
  useEffect(() => {
    initializeWeb3();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet();
        } else {
          // Account changed, reinitialize
          window.location.reload();
        }
      };

      const handleChainChanged = () => {
        // Reload the page when network changes
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Cleanup listeners
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // Context value
  const value = {
    web3,
    account,
    contract,
    readContract,
    isAdmin,
    isConnected,
    isLoading,
    error,
    currentElection,
    electionCount,
    rpcStatus,
    initializeWeb3,
    disconnectWallet,
    reconnectWallet,
    refreshElectionData,
    checkRPCHealth,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}; 