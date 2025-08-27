import React, { useState, useEffect } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import Loading from "./Loading";
import { mapTxError } from "../utils/errors";
import { sendSafeTx } from "../utils/tx";
import { verifyBiometric, getBiometricConfig } from "../utils/biometricService";

export default function AdminPanel() {
  const { web3, account, contract, isConnected, isLoading: web3Loading, error: web3Error, isAdmin, currentElection, refreshElectionData } = useWeb3();
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [voters, setVoters] = useState([]);
  
  // New election form
  const [newElectionName, setNewElectionName] = useState("");
  const [newElectionDescription, setNewElectionDescription] = useState("");
  const [registrationDuration, setRegistrationDuration] = useState(3600); // 1 hour
  const [votingDuration, setVotingDuration] = useState(7200); // 2 hours
  
  // Candidate management
  const [newCandidate, setNewCandidate] = useState("");
  const [candidateToRemove, setCandidateToRemove] = useState("");
  
  // Voter management
  const [newVoterId, setNewVoterId] = useState("");
  const [voterToRemove, setVoterToRemove] = useState("");

  useEffect(() => {
    if (contract && currentElection && Number(currentElection.id) > 0) {
      fetchCandidates();
      fetchVoters();
    }
  }, [contract, currentElection]);

  const fetchCandidates = async () => {
    if (!contract || !currentElection) return;
    try {
      const list = await contract.methods.getElectionCandidates(Number(currentElection.id)).call();
      setCandidates(list);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setStatus("❌ Failed to fetch candidates. Please try again.");
    }
  };

  const fetchVoters = async () => {
    // Note: This would require additional contract functions to get all registered voters
    // For now, we'll just show a placeholder
    setVoters([]);
  };

  const createElection = async () => {
    if (!contract || !newElectionName.trim() || !newElectionDescription.trim()) {
      return setStatus("⚠️ Please fill in all election details.");
    }
    
    setLoading(true);
    try {
      const tx = await sendSafeTx(
        web3,
        contract.methods.createElection(
          newElectionName.trim(),
          newElectionDescription.trim(),
          registrationDuration,
          votingDuration
        ),
        account,
        {
          maxRetries: 3,
          gasMultiplier: 1.4, // 40% safety margin for election creation
          extraParams: {}
        }
      );
      
      if (tx.status) {
        setStatus("✅ New election created successfully!");
        setNewElectionName("");
        setNewElectionDescription("");
        setRegistrationDuration(3600);
        setVotingDuration(7200);
        await refreshElectionData();
      } else {
        setStatus("❌ Failed to create election.");
      }
    } catch (err) {
      setStatus(mapTxError(err, "❌ Error creating election: Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const addCandidate = async () => {
    if (!contract || !currentElection || !newCandidate.trim()) {
      return setStatus("⚠️ Please enter a candidate name and ensure there's an active election.");
    }
    
    setLoading(true);
    try {
      const tx = await sendSafeTx(
        web3,
        contract.methods.addCandidate(Number(currentElection.id), newCandidate.trim()),
        account,
        {
          maxRetries: 3,
          gasMultiplier: 1.2,
          extraParams: {}
        }
      );
      
      if (tx.status) {
        setStatus("✅ Candidate added successfully!");
        setNewCandidate("");
        await fetchCandidates();
      } else {
        setStatus("❌ Failed to add candidate.");
      }
    } catch (err) {
      setStatus(mapTxError(err, "❌ Error adding candidate: Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const removeCandidate = async () => {
    if (!contract || !currentElection || !candidateToRemove.trim()) {
      return setStatus("⚠️ Please enter a candidate name to remove and ensure there's an active election.");
    }
    
    setLoading(true);
    try {
      const tx = await sendSafeTx(
        web3,
        contract.methods.removeCandidate(Number(currentElection.id), candidateToRemove.trim()),
        account,
        {
          maxRetries: 3,
          gasMultiplier: 1.2,
          extraParams: {}
        }
      );
      
      if (tx.status) {
        setStatus("✅ Candidate removed successfully!");
        setCandidateToRemove("");
        await fetchCandidates();
      } else {
        setStatus("❌ Failed to remove candidate.");
      }
    } catch (err) {
      setStatus(mapTxError(err, "❌ Error removing candidate: Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const registerVoter = async () => {
    if (!contract || !currentElection || !newVoterId.trim()) {
      return setStatus("⚠️ Please enter a Voter ID and ensure there's an active election.");
    }

    {/* Biometric Check UI */ }
    <button
      onClick={handleBiometricCheck}
      className="w-full px-4 py-2 bg-purple-700 text-white rounded mb-2"
      disabled={biometricChecked}
    >
      {biometricChecked ? 'Biometric Check Complete' : 'Start Biometric Check'}
    </button>
    { biometricStatus && <p className={`text-sm ${biometricStatus.startsWith('✅') ? 'text-green-700' : biometricStatus.startsWith('❌') ? 'text-red-600' : 'text-gray-800'}`}>{biometricStatus}</p> }



    
    setLoading(true);
    try {
      // Mandatory biometric verification via external service before registration
      try {
        setStatus("🔐 Contacting biometric device for registration...");
        const cfg = getBiometricConfig();
        const result = await verifyBiometric(newVoterId.trim(), { timeoutMs: 45000 });
        if (!result.success) {
          setLoading(false);
          return setStatus("❌ Biometric verification failed. Registration blocked.");
        }
      } catch (bioErr) {
        setLoading(false);
        return setStatus(`❌ Biometric check error: ${bioErr.message}`);
      }

      const voterHash = web3.utils.keccak256(newVoterId.trim());
      const tx = await sendSafeTx(
        web3,
        contract.methods.registerVoter(Number(currentElection.id), voterHash),
        account,
        {
          maxRetries: 3,
          gasMultiplier: 1.2,
          extraParams: {}
        }
      );
      
      if (tx.status) {
        setStatus("✅ Voter registered successfully!");
        setNewVoterId("");
        await fetchVoters();
      } else {
        setStatus("❌ Failed to register voter.");
      }
    } catch (err) {
      setStatus(mapTxError(err, "❌ Error registering voter: Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const unregisterVoter = async () => {
    if (!contract || !currentElection || !voterToRemove.trim()) {
      return setStatus("⚠️ Please enter a Voter ID to remove and ensure there's an active election.");
    }
    
    setLoading(true);
    try {
      const voterHash = web3.utils.keccak256(voterToRemove.trim());
      const tx = await sendSafeTx(
        web3,
        contract.methods.unregisterVoter(Number(currentElection.id), voterHash),
        account,
        {
          maxRetries: 3,
          gasMultiplier: 1.2,
          extraParams: {}
        }
      );
      
      if (tx.status) {
        setStatus("✅ Voter unregistered successfully!");
        setVoterToRemove("");
        await fetchVoters();
      } else {
        setStatus("❌ Failed to unregister voter.");
      }
    } catch (err) {
      setStatus(mapTxError(err, "❌ Error unregistering voter: Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const endElection = async () => {
    if (!contract || !currentElection) {
      return setStatus("⚠️ No active election to end.");
    }
    
    setLoading(true);
    try {
      const tx = await sendSafeTx(
        web3,
        contract.methods.endElection(Number(currentElection.id)),
        account,
        {
          maxRetries: 3,
          gasMultiplier: 1.3,
          extraParams: {}
        }
      );
      
      if (tx.status) {
        setStatus("✅ Election ended successfully!");
        await refreshElectionData();
      } else {
        setStatus("❌ Failed to end election.");
      }
    } catch (err) {
      setStatus(mapTxError(err, "❌ Error ending election: Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (web3Loading) {
    return <Loading message="Connecting to blockchain..." fullScreen />;
  }

  if (!isConnected) {
  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white text-black max-w-md p-6 rounded-2xl shadow-lg w-full text-center">
          <h1 className="text-2xl font-bold mb-4">⚠️ Connection Required</h1>
          <p className="text-gray-600 mb-4">Please connect your wallet to access the admin panel.</p>
          {web3Error && <p className="text-red-600 text-sm">{web3Error}</p>}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white text-black max-w-md p-6 rounded-2xl shadow-lg w-full text-center">
          <h1 className="text-2xl font-bold mb-4">🚫 Access Denied</h1>
          <p className="text-gray-600 mb-4">Only administrators can access this panel.</p>
          <p className="text-sm text-gray-500">Your address: {account}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔧 Admin Panel</h1>
        
        {status && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.startsWith('✅') ? 'bg-green-100 text-green-800' : 
            status.startsWith('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {status}
          </div>
        )}

        {/* Current Election Status */}
        {currentElection && Number(currentElection.id) > 0 && (
          <div className="bg-white rounded-lg p-6 shadow border mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Election Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-blue-700">{currentElection.name}</h3>
                <p className="text-gray-600">{currentElection.description}</p>
                <p className="text-sm text-gray-500">ID: {Number(currentElection.id)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Registration Deadline: {new Date(Number(currentElection.registrationDeadline) * 1000).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Voting Deadline: {new Date(Number(currentElection.votingDeadline) * 1000).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Status: {currentElection.isEnded ? 'Ended' : currentElection.isActive ? 'Active' : 'Inactive'}
                </p>
            </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Election */}
          <div className="bg-white rounded-lg p-6 shadow border">
            <h2 className="text-xl font-semibold mb-4">Create New Election</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Election Name</label>
                <input
                  type="text"
                  value={newElectionName}
                  onChange={(e) => setNewElectionName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter election name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newElectionDescription}
                  onChange={(e) => setNewElectionDescription(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                  placeholder="Enter election description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Registration Duration (seconds)</label>
                  <input
                    type="number"
                    value={registrationDuration}
                    onChange={(e) => setRegistrationDuration(parseInt(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                    min="60"
                  />
          </div>
            <div>
                  <label className="block text-sm font-medium mb-2">Voting Duration (seconds)</label>
                  <input
                    type="number"
                    value={votingDuration}
                    onChange={(e) => setVotingDuration(parseInt(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                    min="60"
                  />
                  </div>
              </div>
              <button
                onClick={createElection}
                disabled={loading || !newElectionName.trim() || !newElectionDescription.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Election'}
              </button>
            </div>
          </div>

          {/* Manage Current Election */}
          {currentElection && Number(currentElection.id) > 0 && (
            <div className="bg-white rounded-lg p-6 shadow border">
              <h2 className="text-xl font-semibold mb-4">Manage Current Election</h2>
              
              {/* End Election */}
              <div className="mb-6">
              <button
                  onClick={endElection}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                  {loading ? 'Ending...' : 'End Election'}
              </button>
            </div>

        {/* Candidate Management */}
        <div className="mb-6">
                <h3 className="font-semibold mb-3">Candidates</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
            <input
              type="text"
                      value={newCandidate}
                      onChange={(e) => setNewCandidate(e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="New candidate name"
            />
            <button
              onClick={addCandidate}
                      disabled={loading || !newCandidate.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Add
                    </button>
          </div>
                  <div className="flex gap-2">
                    <select
                      value={candidateToRemove}
                      onChange={(e) => setCandidateToRemove(e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                    >
                      <option value="">Select candidate to remove</option>
                      {candidates.map((candidate, index) => (
                        <option key={index} value={candidate}>{candidate}</option>
                      ))}
                    </select>
                  <button
                      onClick={removeCandidate}
                      disabled={loading || !candidateToRemove}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                    >
                      Remove
                    </button>
                  </div>
          </div>
        </div>

              {/* Voter Management */}
              <div>
                <h3 className="font-semibold mb-3">Voters</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newVoterId}
                      onChange={(e) => setNewVoterId(e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="New voter ID"
                    />
                    <button
                      onClick={registerVoter}
                      disabled={loading || !newVoterId.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Register
                    </button>
                  </div>
                  <div className="flex gap-2">
        <input
          type="text"
                      value={voterToRemove}
                      onChange={(e) => setVoterToRemove(e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="Voter ID to remove"
                    />
        <button
                      onClick={unregisterVoter}
                      disabled={loading || !voterToRemove.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                    >
                      Unregister
        </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Candidates List */}
        {currentElection && Number(currentElection.id) > 0 && candidates.length > 0 && (
          <div className="mt-8 bg-white rounded-lg p-6 shadow border">
            <h2 className="text-xl font-semibold mb-4">Current Candidates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-gray-800">{candidate}</h4>
                  <p className="text-sm text-gray-600">Candidate #{index + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
    </div>
  );
}
