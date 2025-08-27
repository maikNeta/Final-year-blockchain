# Multi-Election Voting System

This enhanced version of the VotingSystem smart contract supports multiple elections with complete history tracking and improved management capabilities.

## 🆕 New Features

### 1. **Multiple Elections Support**
- Create and manage multiple elections simultaneously
- Each election has a unique ID and independent state
- Automatic election lifecycle management

### 2. **Enhanced Election Structure**
- **Election ID**: Unique identifier for each election
- **Name & Description**: Detailed election information
- **Timestamps**: Creation, registration deadline, voting deadline, and end times
- **Status Tracking**: Active, ended, and phase-based states
- **Complete Results**: Winner, vote counts, and candidate performance

### 3. **Improved Data Management**
- **Election-specific mappings**: Voters, votes, and candidates are scoped to individual elections
- **Historical data**: All past elections are preserved and queryable
- **Efficient storage**: Optimized data structures for gas efficiency

### 4. **Advanced Admin Functions**
- **Election creation**: Create new elections with custom parameters
- **Admin transfer**: Change contract ownership securely
- **Election management**: End elections manually or automatically

## 🏗️ Smart Contract Architecture

### Core Structures

```solidity
struct Election {
    uint256 id;
    string name;
    string description;
    uint256 registrationDeadline;
    uint256 votingDeadline;
    string[] candidates;
    mapping(string => bool) isCandidate;
    bool isActive;
    bool isEnded;
    string winner;
    uint256 winnerVotes;
    uint256 totalVotes;
    uint256 createdAt;
    uint256 endedAt;
}

struct ElectionResult {
    uint256 id;
    string name;
    string winner;
    uint256 winnerVotes;
    uint256 totalVotes;
    uint256 endedAt;
    string[] candidates;
    uint256[] voteCounts;
}
```

### Key Mappings

```solidity
mapping(uint256 => Election) public elections;                    // electionId => Election
mapping(uint256 => mapping(bytes32 => bool)) public registeredVoters;  // electionId => voterHash => registered
mapping(uint256 => mapping(bytes32 => bool)) public hasVoted;         // electionId => voterHash => voted
mapping(uint256 => mapping(string => uint256)) public votesReceived;  // electionId => candidate => votes
```

## 🚀 Deployment & Setup

### 1. **Initial Deployment**

```bash
# Deploy the contract
npx hardhat run scripts/deploy.js --network polygon

# The script will:
# - Deploy the contract
# - Create the first election
# - Add initial candidates
# - Display election information
```

### 2. **Create Additional Elections**

```bash
# Set the contract address
export CONTRACT_ADDRESS="0x..."

# Create a new election
npx hardhat run scripts/createElection.js --network polygon

# Customize election parameters
export ELECTION_NAME="Student Council Election"
export ELECTION_DESCRIPTION="Annual student council election"
export REGISTRATION_DURATION=1800  # 30 minutes
export VOTING_DURATION=3600        # 1 hour
export CANDIDATES="John,Jane,Mike"
npx hardhat run scripts/createElection.js --network polygon
```

## 📋 Contract Functions

### Admin Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `createElection` | Create a new election | name, description, regDuration, voteDuration |
| `addCandidate` | Add candidate to election | electionId, candidateName |
| `removeCandidate` | Remove candidate from election | electionId, candidateName |
| `registerVoter` | Register voter for election | electionId, voterHash |
| `unregisterVoter` | Unregister voter from election | electionId, voterHash |
| `endElection` | Manually end an election | electionId |
| `changeAdmin` | Transfer admin rights | newAdminAddress |

### Voting Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `vote` | Cast a vote in an election | electionId, voterHash, candidate |

### View Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `getCurrentElection` | Get current active election | Election details |
| `getElection` | Get specific election details | Full election info |
| `getElectionCandidates` | Get candidates for election | Candidate array |
| `getElectionCandidatesWithVotes` | Get candidates with vote counts | Names + votes |
| `getElectionResult` | Get final election results | ElectionResult struct |
| `getAllElections` | Get all election IDs | ID array |
| `getElectionCount` | Get total number of elections | Count |
| `isVoterRegistered` | Check if voter is registered | Boolean |
| `hasVoterVoted` | Check if voter has voted | Boolean |
| `getVoteCount` | Get votes for a candidate | Vote count |

### Phase Checking Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `isInRegistrationPhase` | Check if election is in registration | Boolean |
| `isInVotingPhase` | Check if election is in voting | Boolean |
| `hasElectionEnded` | Check if election has ended | Boolean |

## 🔄 Election Lifecycle

### 1. **Creation Phase**
- Admin creates election with name, description, and durations
- System automatically ends any current active election
- New election becomes the current active election

### 2. **Registration Phase**
- Admin can add/remove candidates
- Admin can register/unregister voters
- Voters cannot vote during this phase

### 3. **Voting Phase**
- Registration phase ends automatically
- Registered voters can cast votes
- Real-time vote counting and updates

### 4. **End Phase**
- Voting phase ends automatically
- Admin can manually end election
- Results are calculated and stored
- Election history is preserved

## 📊 Event System

The contract emits comprehensive events for real-time monitoring:

```solidity
event ElectionCreated(uint256 indexed electionId, string name, uint256 registrationDeadline, uint256 votingDeadline);
event VoterRegistered(uint256 indexed electionId, bytes32 voterHash);
event VoteCast(uint256 indexed electionId, bytes32 voterHash, string candidate);
event ElectionEnded(uint256 indexed electionId, string name, string winner, uint256 votes, uint256 totalVotes);
event CandidateAdded(uint256 indexed electionId, string candidate);
event CandidateRemoved(uint256 indexed electionId, string candidate);
event VoterUnregistered(uint256 indexed electionId, bytes32 voterHash);
event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
```

## 🔧 Frontend Integration

### Key Changes Required

1. **Update contract calls** to include `electionId` parameter
2. **Modify event listeners** to handle election-specific events
3. **Update UI components** to display multiple elections
4. **Add election selection** for admin operations

### Example Contract Calls

```javascript
// Get current election
const currentElection = await contract.methods.getCurrentElection().call();

// Get candidates for specific election
const candidates = await contract.methods.getElectionCandidates(currentElection.id).call();

// Cast vote in specific election
await contract.methods.vote(currentElection.id, voterHash, candidate).send({ from: account });

// Register voter for specific election
await contract.methods.registerVoter(currentElection.id, voterHash).send({ from: account });
```

## 🧪 Testing

### Test Scenarios

1. **Multiple Elections**
   - Create multiple elections
   - Verify independent operation
   - Test election transitions

2. **Voter Management**
   - Register voters for different elections
   - Verify vote isolation between elections
   - Test voter unregistration

3. **Candidate Management**
   - Add/remove candidates per election
   - Verify candidate isolation
   - Test candidate operations during different phases

4. **Voting Process**
   - Cast votes in different elections
   - Verify vote counting accuracy
   - Test phase restrictions

5. **Election End**
   - Test automatic and manual ending
   - Verify result calculation
   - Test history preservation

## 🚨 Important Notes

### Gas Optimization
- The contract uses efficient data structures
- Consider gas costs when creating many elections
- Batch operations where possible

### Security Considerations
- Only admin can create elections and manage voters
- Voters can only vote once per election
- Elections automatically transition between phases
- Admin can manually end elections if needed

### Migration from Single Election
- This is a breaking change from the previous version
- Existing frontend code will need updates
- Consider deploying to a new address or upgrading existing contracts

## 📈 Future Enhancements

Potential improvements for future versions:

1. **Election Templates**: Predefined election configurations
2. **Advanced Voting**: Ranked choice, approval voting
3. **Delegation**: Proxy voting capabilities
4. **Multi-signature**: Enhanced admin controls
5. **Upgradeability**: Contract upgrade mechanisms
6. **Gas Optimization**: Further storage optimizations

## 🤝 Support

For questions or issues with the multi-election system:

1. Check the contract code and comments
2. Review the deployment scripts
3. Test thoroughly on testnets first
4. Consider gas costs and network conditions

---

**Note**: This system represents a significant upgrade from the single-election version. Test thoroughly before deploying to mainnet and ensure your frontend is updated accordingly.
