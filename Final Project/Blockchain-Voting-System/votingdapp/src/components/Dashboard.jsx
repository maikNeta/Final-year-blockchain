import React, { useEffect, useState } from "react";
import { Progress } from "./Progress";
import { Link } from "react-router-dom";
import { useWeb3 } from "../contexts/Web3Context";
import Loading from "./Loading";

export default function Dashboard() {
  const { 
    web3, 
    account, 
    contract, 
    isConnected, 
    isAdmin,
    isLoading: web3Loading, 
    error: web3Error, 
    initializeWeb3, 
    disconnectWallet,
    currentElection,
    electionCount,
    refreshElectionData
  } = useWeb3();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletStatus, setWalletStatus] = useState("");
  const [candidatesWithVotes, setCandidatesWithVotes] = useState([]);
  const [notification, setNotification] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pastElections, setPastElections] = useState([]);
  const [pastElectionsLoading, setPastElectionsLoading] = useState(false);

  const handleConnectWallet = async () => {
    try {
      setWalletStatus("Connecting...");
      await initializeWeb3();
      setWalletStatus("✅ Wallet connected.");
    } catch (err) {
      setWalletStatus("❌ Failed to connect wallet.");
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setWalletStatus("Wallet disconnected.");
  };

  // Function to fetch candidates with votes for current election
  const fetchCandidatesWithVotes = async () => {
    if (!contract || !currentElection || Number(currentElection.id) === 0) return;
    try {
      const [candidateNames, voteCounts] = await contract.methods.getElectionCandidatesWithVotes(Number(currentElection.id)).call();
      const candidatesData = candidateNames.map((name, index) => ({
        name,
        votes: Number(voteCounts[index])
      }));
      setCandidatesWithVotes(candidatesData);
    } catch (err) {
      console.error("Failed to fetch candidates with votes:", err);
    }
  };

  // Function to fetch past elections
  const fetchPastElections = async () => {
    if (!contract || Number(electionCount) === 0) return;
    setPastElectionsLoading(true);
    try {
      const allElectionIds = await contract.methods.getAllElections().call();
      const pastElectionsData = [];
      
      for (const electionId of allElectionIds) {
        try {
          const electionData = await contract.methods.getElection(Number(electionId)).call();
          if (electionData.isEnded) {
            const [basicResult, candidatesResult] = await Promise.all([
              contract.methods.getElectionResultBasic(Number(electionId)).call(),
              contract.methods.getElectionResultCandidates(Number(electionId)).call()
            ]);
            pastElectionsData.push({
              id: Number(electionId),
              name: electionData.name,
              description: electionData.description,
              winner: basicResult.winner,
              winnerVotes: Number(basicResult.winnerVotes),
              totalVotes: Number(basicResult.totalVotes),
              endedAt: Number(electionData.endedAt),
              candidates: candidatesResult.candidates,
              voteCounts: candidatesResult.voteCounts.map(v => Number(v))
            });
          }
        } catch (err) {
          console.error(`Failed to fetch election ${electionId}:`, err);
        }
      }
      
      // Sort by end date (newest first)
      pastElectionsData.sort((a, b) => b.endedAt - a.endedAt);
      setPastElections(pastElectionsData);
    } catch (err) {
      console.error("Failed to fetch past elections:", err);
    } finally {
      setPastElectionsLoading(false);
    }
  };

  // Function to show notification
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 5000); // Hide after 5 seconds
  };

  // Function to refresh all dashboard data
  const refreshAllData = async () => {
    if (!contract) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshElectionData(),
        fetchCandidatesWithVotes(),
        fetchPastElections()
      ]);
      showNotification("Dashboard refreshed successfully!");
    } catch (err) {
      console.error("Failed to refresh data:", err);
      showNotification("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (web3Error) {
      setError(web3Error);
    }
    setLoading(false);
  }, [web3Error]);

  // Fetch data when contract or current election changes
  useEffect(() => {
    if (contract && currentElection) {
      fetchCandidatesWithVotes();
      fetchPastElections();
    }
  }, [contract, currentElection]);

  // Add event listeners for real-time updates
  useEffect(() => {
    if (!contract) return;

    // Listen for VoteCast events
    const voteCastEvent = contract.events.VoteCast({}, (error, event) => {
      if (error) {
        console.error("Error in VoteCast event:", error);
        return;
      }
      console.log("VoteCast event received:", event);
      // Update vote counts immediately when a vote is cast
      fetchCandidatesWithVotes();
      showNotification(`New vote cast for ${event.returnValues.candidate}!`);
    });

    // Listen for VoterRegistered events
    const voterRegisteredEvent = contract.events.VoterRegistered({}, (error, event) => {
      if (error) {
        console.error("Error in VoterRegistered event:", error);
        return;
      }
      console.log("VoterRegistered event received:", event);
    });

    // Listen for ElectionCreated events
    const electionCreatedEvent = contract.events.ElectionCreated({}, (error, event) => {
      if (error) {
        console.error("Error in ElectionCreated event:", error);
        return;
      }
      console.log("ElectionCreated event received:", event);
      showNotification(`New election created: ${event.returnValues.name}!`);
      refreshElectionData();
    });

    // Listen for ElectionEnded events
    const electionEndedEvent = contract.events.ElectionEnded({}, (error, event) => {
      if (error) {
        console.error("Error in ElectionEnded event:", error);
        return;
      }
      console.log("ElectionEnded event received:", event);
      showNotification(`Election ended: ${event.returnValues.name}!`);
      refreshElectionData();
      fetchPastElections();
    });

    // Set up periodic refresh as a fallback (every 30 seconds)
    const intervalId = setInterval(() => {
      refreshElectionData();
      fetchCandidatesWithVotes();
    }, 30000);

    // Cleanup event listeners and interval
    return () => {
      voteCastEvent.removeAllListeners();
      voterRegisteredEvent.removeAllListeners();
      electionCreatedEvent.removeAllListeners();
      electionEndedEvent.removeAllListeners();
      clearInterval(intervalId);
    };
  }, [contract]);



  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10 text-gray-800">
      {/* Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {notification}
        </div>
      )}
      
                          {error && <div className="mb-4 text-red-600 font-medium">{error}</div>}
                    {walletStatus && <div className="mb-2 text-blue-600 text-sm">{walletStatus}</div>}
                    {web3Loading ? (
                        <Loading message="Connecting to blockchain..." fullScreen />
                    ) : loading ? (
                        <Loading message="Loading dashboard data..." />
                    ) : (
        <>
      {/* Main Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Election Status */}
        <div className="bg-white rounded-lg p-6 shadow border">
              <h2 className="text-lg font-semibold mb-2">Current Election</h2>
              {currentElection && Number(currentElection.id) > 0 ? (
                <div>
                  <h3 className="text-md font-bold text-blue-700 mb-2">{currentElection.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{currentElection.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Registration Deadline: {new Date(Number(currentElection.registrationDeadline) * 1000).toLocaleString()}</p>
                    <p>Voting Deadline: {new Date(Number(currentElection.votingDeadline) * 1000).toLocaleString()}</p>
                    <p>Status: {currentElection.isEnded ? 'Ended' : currentElection.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">No Active Election</p>
          )}
          <p className="text-xs text-gray-500 mb-4">
                Total Elections: {Number(electionCount)}
              </p>
        </div>

            {/* System Status */}
        <div className="bg-white rounded-lg p-6 shadow border">
              <h2 className="text-lg font-semibold mb-2">System Status</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Blockchain Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 ${isAdmin ? 'bg-blue-500' : 'bg-gray-400'} rounded-full`}></div>
                  <span className="text-sm">Admin: {isAdmin ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Real-time Updates</span>
                </div>
              </div>
        </div>
      </div>

          {/* Live Vote Counts for Current Election */}
          {currentElection && Number(currentElection.id) > 0 && candidatesWithVotes.length > 0 && (
        <div className="mt-10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">📊 Live Vote Counts - {currentElection.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live
                  </div>
                </div>
                <button 
                  onClick={refreshAllData}
                  disabled={refreshing}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                </button>
              </div>
          <div className="bg-white rounded-lg p-4 shadow border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidatesWithVotes.map((candidate, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800">{candidate.name}</h4>
                    <span className="text-2xl font-bold text-blue-600">{candidate.votes}</span>
                  </div>
                  <div className="text-sm text-gray-600">votes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past Elections */}
      <div className="mt-10">
        <h3 className="text-lg font-bold mb-4">Previous Elections</h3>
        <div className="bg-white rounded-lg p-4 shadow border">
              {pastElectionsLoading ? (
                <div className="text-center py-4">Loading past elections...</div>
              ) : pastElections.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No completed elections found.</div>
              ) : (
                <div className="space-y-4">
                  {pastElections.map((election) => (
                    <div key={election.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
              <div>
                          <h4 className="font-semibold text-lg">{election.name}</h4>
                          <p className="text-sm text-gray-600">{election.description}</p>
                          <p className="text-xs text-gray-500">
                                                         Ended: {new Date(Number(election.endedAt) * 1000).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">🏆 {election.winner}</div>
                          <div className="text-sm text-gray-600">{election.winnerVotes} votes</div>
                          <div className="text-xs text-gray-500">Total: {election.totalVotes} votes</div>
                        </div>
              </div>
                      
                      {/* Candidate Results */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                        {election.candidates.map((candidate, index) => (
                          <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                            <span className="font-medium">{candidate}</span>
                            <span className="float-right text-blue-600">{election.voteCounts[index]}</span>
            </div>
          ))}
        </div>
      </div>
                  ))}
                </div>
          )}
        </div>
      </div>


      {/* Wallet connect/disconnect UI */}
      <div className="fixed top-4 right-4 z-50">
        {account ? (
          <button
            onClick={handleDisconnectWallet}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded shadow hover:bg-gray-300"
          >
            Disconnect Wallet ({account.slice(0, 6)}...{account.slice(-4)})
          </button>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Connect Wallet
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
