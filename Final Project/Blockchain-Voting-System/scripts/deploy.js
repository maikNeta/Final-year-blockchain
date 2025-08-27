const { ethers, network, run } = require("hardhat");

async function verify(address, constructorArgs) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`🔎 Verified at Polygonscan: ${address}`);
  } catch (e) {
    const message = e && e.message ? e.message : String(e);
    if (message.toLowerCase().includes("already verified")) {
      console.log("ℹ️  Already verified");
    } else {
      console.log("⚠️  Verification skipped:", message);
    }
  }
}

async function main() {
  const registrationDuration = Number(process.env.REGISTRATION_DURATION || 3600);
  const votingDuration = Number(process.env.VOTING_DURATION || 7200);
  const electionName = process.env.ELECTION_NAME || "General Election 2025";
  const electionDescription = process.env.ELECTION_DESCRIPTION || "First election on the new multi-election system";
  const candidateCsv = process.env.CANDIDATES || "Alice,Bob,Charlie";
  const initialCandidates = candidateCsv.split(",").map((c) => c.trim()).filter(Boolean);

  console.log(`🚀 Network: ${network.name}`);
  console.log(`⏳ Durations: reg=${registrationDuration}s vote=${votingDuration}s`);
  console.log(`🗳️  Election: ${electionName}`);
  console.log(`📝 Description: ${electionDescription}`);
  console.log(`👤 Candidates: ${initialCandidates.join(", ")}`);

  // Deploy the contract (no constructor parameters needed now)
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy();
  await votingSystem.waitForDeployment();

  const address = await votingSystem.getAddress();
  console.log(`✅ Contract deployed to: ${address}`);

  // Create the first election
  console.log("🗳️  Creating first election...");
  const createElectionTx = await votingSystem.createElection(
    electionName,
    electionDescription,
    registrationDuration,
    votingDuration
  );
  const createReceipt = await createElectionTx.wait();
  console.log(`✅ Election created (tx: ${createReceipt.transactionHash})`);

  // Get the election ID
  const electionId = await votingSystem.currentElectionId();
  console.log(`🆔 Election ID: ${Number(electionId)}`);

  // Add initial candidates to the election
  for (const candidate of initialCandidates) {
    const tx = await votingSystem.addCandidate(electionId, candidate);
    const receipt = await tx.wait();
    console.log(`➕ Candidate added: ${candidate} (tx: ${receipt.transactionHash})`);
  }

  // Display election info
  const electionInfo = await votingSystem.getCurrentElection();
  console.log(`\n📊 Election Information:`);
  console.log(`   ID: ${Number(electionInfo.id)}`);
  console.log(`   Name: ${electionInfo.name}`);
  console.log(`   Description: ${electionInfo.description}`);
  console.log(`   Registration Deadline: ${new Date(Number(electionInfo.registrationDeadline) * 1000).toLocaleString()}`);
  console.log(`   Voting Deadline: ${new Date(Number(electionInfo.votingDeadline) * 1000).toLocaleString()}`);
  console.log(`   Active: ${electionInfo.isActive}`);
  console.log(`   Ended: ${electionInfo.isEnded}`);

  // Verify on Polygonscan if on polygon/amoy and API key is provided
  if (["polygon", "amoy"].includes(network.name)) {
    const hasKey = process.env.POLYGONSCAN_API_KEY || process.env.POLYGON_AMOY_API_KEY;
    if (hasKey) {
      console.log("⏱️  Waiting 6 blocks before verification...");
      await votingSystem.deploymentTransaction().wait(6);
      await verify(address, []); // No constructor arguments needed
    } else {
      console.log("ℹ️  No Polygonscan API key found, skipping verification.");
    }
  }

  console.log(`\n🎉 Deployment complete!`);
  console.log(`📋 Next steps:`);
  console.log(`   1. Update your frontend config with the new contract address: ${address}`);
  console.log(`   2. Register voters using: registerVoter(${Number(electionId)}, voterHash)`);
  console.log(`   3. Start voting when registration phase ends`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
