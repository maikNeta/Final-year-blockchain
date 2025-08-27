const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xDbbAdfBb9EcE04Dd729dEe17dbb861c54a5Cbcca";
  
  console.log("🔧 Fixing election creation...");
  console.log(`📋 Contract Address: ${contractAddress}`);
  
  try {
    // Get the deployed contract
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    const votingSystem = VotingSystem.attach(contractAddress);
    
    // Check current election status
    const currentElection = await votingSystem.getCurrentElection();
    console.log("📊 Current Election Status:");
    console.log(`   ID: ${Number(currentElection.id)}`);
    console.log(`   Name: ${currentElection.name}`);
    console.log(`   Active: ${currentElection.isActive}`);
    console.log(`   Ended: ${currentElection.isEnded}`);
    
    // If no election exists, create one
    if (Number(currentElection.id) === 0) {
      console.log("🗳️  Creating first election...");
      
      const electionName = "General Election 2025";
      const electionDescription = "First election on the new multi-election system";
      const registrationDuration = 3600; // 1 hour
      const votingDuration = 7200; // 2 hours
      
      const createElectionTx = await votingSystem.createElection(
        electionName,
        electionDescription,
        registrationDuration,
        votingDuration
      );
      
      console.log("⏳ Waiting for transaction confirmation...");
      const createReceipt = await createElectionTx.wait();
      console.log(`✅ Election created (tx: ${createReceipt.transactionHash})`);
      
      // Get the new election ID
      const electionId = await votingSystem.currentElectionId();
      console.log(`🆔 New Election ID: ${Number(electionId)}`);
      
      // Add initial candidates
      const candidates = ["Alice", "Bob", "Charlie"];
      for (const candidate of candidates) {
        console.log(`➕ Adding candidate: ${candidate}`);
        const tx = await votingSystem.addCandidate(electionId, candidate);
        const receipt = await tx.wait();
        console.log(`   ✅ Added (tx: ${receipt.transactionHash})`);
      }
      
      // Display final election info
      const electionInfo = await votingSystem.getCurrentElection();
      console.log(`\n📊 Final Election Information:`);
      console.log(`   ID: ${Number(electionInfo.id)}`);
      console.log(`   Name: ${electionInfo.name}`);
      console.log(`   Description: ${electionInfo.description}`);
      console.log(`   Registration Deadline: ${new Date(Number(electionInfo.registrationDeadline) * 1000).toLocaleString()}`);
      console.log(`   Voting Deadline: ${new Date(Number(electionInfo.votingDeadline) * 1000).toLocaleString()}`);
      console.log(`   Active: ${electionInfo.isActive}`);
      console.log(`   Ended: ${electionInfo.isEnded}`);
      
    } else {
      console.log("✅ Election already exists!");
    }
    
  } catch (error) {
    console.error("❌ Failed to fix election:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
