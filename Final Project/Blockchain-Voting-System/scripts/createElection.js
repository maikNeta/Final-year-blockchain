const { ethers } = require("hardhat");

async function main() {
  // Get the contract address from environment or input
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ Please set CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }

  // Get election parameters from environment or use defaults
  const electionName = process.env.ELECTION_NAME || "New Election";
  const electionDescription = process.env.ELECTION_DESCRIPTION || "Additional election created by admin";
  const registrationDuration = Number(process.env.REGISTRATION_DURATION || 3600); // 1 hour
  const votingDuration = Number(process.env.VOTING_DURATION || 7200); // 2 hours
  const candidateCsv = process.env.CANDIDATES || "Candidate1,Candidate2,Candidate3";
  const initialCandidates = candidateCsv.split(",").map((c) => c.trim()).filter(Boolean);

  console.log(`🚀 Creating new election on contract: ${contractAddress}`);
  console.log(`⏳ Durations: reg=${registrationDuration}s vote=${votingDuration}s`);
  console.log(`🗳️  Election: ${electionName}`);
  console.log(`📝 Description: ${electionDescription}`);
  console.log(`👤 Candidates: ${initialCandidates.join(", ")}`);

  try {
    // Get the deployed contract
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    const votingSystem = VotingSystem.attach(contractAddress);

    // Check if we're the admin
    const admin = await votingSystem.admin();
    const [signer] = await ethers.getSigners();
    if (admin.toLowerCase() !== signer.address.toLowerCase()) {
      console.error("❌ Only admin can create elections");
      console.error(`Current admin: ${admin}`);
      console.error(`Your address: ${signer.address}`);
      process.exit(1);
    }

    // Check current election status
    const currentElection = await votingSystem.getCurrentElection();
    if (currentElection.isActive && !currentElection.isEnded) {
      console.log(`⚠️  Warning: There's an active election (ID: ${Number(currentElection.id)})`);
      console.log("   Creating a new election will end the current one");
      
      // Ask for confirmation (in a real scenario, you might want to add a prompt)
      console.log("   Proceeding with creating new election...");
    }

    // Create the new election
    console.log("🗳️  Creating new election...");
    const createElectionTx = await votingSystem.createElection(
      electionName,
      electionDescription,
      registrationDuration,
      votingDuration
    );
    const createReceipt = await createElectionTx.wait();
    console.log(`✅ Election created (tx: ${createReceipt.transactionHash})`);

    // Get the new election ID
    const electionId = await votingSystem.currentElectionId();
    console.log(`🆔 New Election ID: ${Number(electionId)}`);

    // Add initial candidates to the election
    for (const candidate of initialCandidates) {
      const tx = await votingSystem.addCandidate(electionId, candidate);
      const receipt = await tx.wait();
      console.log(`➕ Candidate added: ${candidate} (tx: ${receipt.transactionHash})`);
    }

    // Display election info
    const electionInfo = await votingSystem.getCurrentElection();
    console.log(`\n📊 New Election Information:`);
    console.log(`   ID: ${Number(electionInfo.id)}`);
    console.log(`   Name: ${electionInfo.name}`);
    console.log(`   Description: ${electionInfo.description}`);
    console.log(`   Registration Deadline: ${new Date(Number(electionInfo.registrationDeadline) * 1000).toLocaleString()}`);
    console.log(`   Voting Deadline: ${new Date(Number(electionInfo.votingDeadline) * 1000).toLocaleString()}`);
    console.log(`   Active: ${electionInfo.isActive}`);
    console.log(`   Ended: ${electionInfo.isEnded}`);

    // Get total election count
    const totalElections = await votingSystem.getElectionCount();
    console.log(`\n📈 Total elections in system: ${Number(totalElections)}`);

    console.log(`\n🎉 Election creation complete!`);
    console.log(`📋 Next steps:`);
    console.log(`   1. Register voters using: registerVoter(${Number(electionId)}, voterHash)`);
    console.log(`   2. Start voting when registration phase ends`);
    console.log(`   3. Monitor election progress`);

  } catch (error) {
    console.error("❌ Failed to create election:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
