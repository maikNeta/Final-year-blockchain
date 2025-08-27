// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingSystem {
    address public admin;
    
    // Election management
    uint256 public nextElectionId;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(bytes32 => bool)) public registeredVoters; // electionId => voterHash => registered
    mapping(uint256 => mapping(bytes32 => bool)) public hasVoted; // electionId => voterHash => voted
    mapping(uint256 => mapping(string => uint256)) public votesReceived; // electionId => candidate => votes
    
    // Current active election
    uint256 public currentElectionId;
    
    // Election structure
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
    
    // Election result structure for easy retrieval
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
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string name, uint256 registrationDeadline, uint256 votingDeadline);
    event VoterRegistered(uint256 indexed electionId, bytes32 voterHash);
    event VoteCast(uint256 indexed electionId, bytes32 voterHash, string candidate);
    event ElectionEnded(uint256 indexed electionId, string name, string winner, uint256 votes, uint256 totalVotes);
    event CandidateAdded(uint256 indexed electionId, string candidate);
    event CandidateRemoved(uint256 indexed electionId, string candidate);
    event VoterUnregistered(uint256 indexed electionId, bytes32 voterHash);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= nextElectionId, "Election does not exist");
        _;
    }
    
    modifier electionActive(uint256 _electionId) {
        require(elections[_electionId].isActive && !elections[_electionId].isEnded, "Election is not active");
        _;
    }
    
    modifier beforeDeadline(uint256 _electionId, uint256 deadline) {
        require(block.timestamp <= deadline, "Deadline has passed");
        _;
    }

    modifier afterDeadline(uint256 _electionId, uint256 deadline) {
        require(block.timestamp > deadline, "Deadline not reached yet");
        _;
    }

    constructor() {
        admin = msg.sender;
        nextElectionId = 0;
        currentElectionId = 0;
    }
    
    // Admin functions
    function changeAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        address oldAdmin = admin;
        admin = _newAdmin;
        emit AdminChanged(oldAdmin, _newAdmin);
    }
    
    // Create a new election
    function createElection(
        string memory _name,
        string memory _description,
        uint256 _registrationDuration,
        uint256 _votingDuration
    ) public onlyAdmin {
        require(bytes(_name).length > 0, "Election name cannot be empty");
        require(_registrationDuration > 0, "Registration duration must be positive");
        require(_votingDuration > 0, "Voting duration must be positive");
        
        // End current election if it exists and is active
        if (currentElectionId > 0 && elections[currentElectionId].isActive && !elections[currentElectionId].isEnded) {
            _endElection(currentElectionId);
        }
        
        nextElectionId++;
        uint256 electionId = nextElectionId;
        
        Election storage newElection = elections[electionId];
        newElection.id = electionId;
        newElection.name = _name;
        newElection.description = _description;
        newElection.registrationDeadline = block.timestamp + _registrationDuration;
        newElection.votingDeadline = newElection.registrationDeadline + _votingDuration;
        newElection.isActive = true;
        newElection.isEnded = false;
        newElection.createdAt = block.timestamp;
        
        currentElectionId = electionId;
        
        emit ElectionCreated(electionId, _name, newElection.registrationDeadline, newElection.votingDeadline);
    }
    
    // Add candidate to an election
    function addCandidate(uint256 _electionId, string memory _candidate) 
        public 
        onlyAdmin 
        electionExists(_electionId)
        electionActive(_electionId)
        beforeDeadline(_electionId, elections[_electionId].registrationDeadline) 
    {
        require(bytes(_candidate).length > 0, "Candidate name cannot be empty");
        require(!elections[_electionId].isCandidate[_candidate], "Candidate already exists");
        
        elections[_electionId].candidates.push(_candidate);
        elections[_electionId].isCandidate[_candidate] = true;
        
        emit CandidateAdded(_electionId, _candidate);
    }
    
    // Remove candidate from an election
    function removeCandidate(uint256 _electionId, string memory _candidate) 
        public 
        onlyAdmin 
        electionExists(_electionId)
        electionActive(_electionId)
        beforeDeadline(_electionId, elections[_electionId].registrationDeadline) 
    {
        require(elections[_electionId].isCandidate[_candidate], "Candidate does not exist");
        
        // Remove from candidates array
        string[] storage candidates = elections[_electionId].candidates;
        for (uint i = 0; i < candidates.length; i++) {
            if (keccak256(bytes(candidates[i])) == keccak256(bytes(_candidate))) {
                candidates[i] = candidates[candidates.length - 1];
                candidates.pop();
                break;
            }
        }
        
        elections[_electionId].isCandidate[_candidate] = false;
        
        emit CandidateRemoved(_electionId, _candidate);
    }
    
    // Register voter for an election
    function registerVoter(uint256 _electionId, bytes32 _voterHash)
        public
        onlyAdmin
        electionExists(_electionId)
        electionActive(_electionId)
        beforeDeadline(_electionId, elections[_electionId].registrationDeadline)
    {
        require(!registeredVoters[_electionId][_voterHash], "Voter already registered");
        registeredVoters[_electionId][_voterHash] = true;
        emit VoterRegistered(_electionId, _voterHash);
    }
    
    // Unregister voter from an election
    function unregisterVoter(uint256 _electionId, bytes32 _voterHash) 
        public
        onlyAdmin 
        electionExists(_electionId)
        electionActive(_electionId)
        beforeDeadline(_electionId, elections[_electionId].registrationDeadline) 
    {
        require(registeredVoters[_electionId][_voterHash], "Voter not registered");
        registeredVoters[_electionId][_voterHash] = false;
        emit VoterUnregistered(_electionId, _voterHash);
    }
    
    // Cast vote in an election
    function vote(uint256 _electionId, bytes32 _voterHash, string memory _candidate)
        public
        electionExists(_electionId)
        electionActive(_electionId)
        beforeDeadline(_electionId, elections[_electionId].votingDeadline)
    {
        require(registeredVoters[_electionId][_voterHash], "Voter not registered");
        require(!hasVoted[_electionId][_voterHash], "Voter has already voted");
        require(elections[_electionId].isCandidate[_candidate], "Invalid candidate");
        
        hasVoted[_electionId][_voterHash] = true;
        votesReceived[_electionId][_candidate]++;
        elections[_electionId].totalVotes++;
        
        emit VoteCast(_electionId, _voterHash, _candidate);
    }
    
    // End an election manually (admin only)
    function endElection(uint256 _electionId) 
        public 
        onlyAdmin 
        electionExists(_electionId)
        electionActive(_electionId)
        afterDeadline(_electionId, elections[_electionId].votingDeadline)
    {
        _endElection(_electionId);
    }
    
    // Internal function to end an election
    function _endElection(uint256 _electionId) internal {
        Election storage election = elections[_electionId];
        require(election.candidates.length > 0, "No candidates in election");
        
        // Find winner
        string memory winner = "";
        uint256 maxVotes = 0;
        
        for (uint i = 0; i < election.candidates.length; i++) {
            string memory candidate = election.candidates[i];
            uint256 votes = votesReceived[_electionId][candidate];
            
            if (votes > maxVotes) {
                maxVotes = votes;
                winner = candidate;
            }
        }
        
        require(maxVotes > 0, "No votes cast in election");
        
        // Set election results
        election.winner = winner;
        election.winnerVotes = maxVotes;
        election.isEnded = true;
        election.isActive = false;
        election.endedAt = block.timestamp;
        
        // Update current election if this was the current one
        if (currentElectionId == _electionId) {
            currentElectionId = 0;
        }
        
        emit ElectionEnded(_electionId, election.name, winner, maxVotes, election.totalVotes);
    }
    
    // View functions - optimized to reduce stack usage
    function getCurrentElection() public view returns (
        uint256 id,
        string memory name,
        string memory description,
        uint256 registrationDeadline,
        uint256 votingDeadline,
        bool isActive,
        bool isEnded
    ) {
        if (currentElectionId == 0) {
            return (0, "", "", 0, 0, false, false);
        }
        
        Election storage election = elections[currentElectionId];
        return (
            election.id,
            election.name,
            election.description,
            election.registrationDeadline,
            election.votingDeadline,
            election.isActive,
            election.isEnded
        );
    }
    
    function getElection(uint256 _electionId) public view electionExists(_electionId) returns (
        uint256 id,
        string memory name,
        string memory description,
        uint256 registrationDeadline,
        uint256 votingDeadline,
        bool isActive,
        bool isEnded,
        string memory winner,
        uint256 winnerVotes,
        uint256 totalVotes,
        uint256 createdAt,
        uint256 endedAt
    ) {
        Election storage election = elections[_electionId];
        return (
            election.id,
            election.name,
            election.description,
            election.registrationDeadline,
            election.votingDeadline,
            election.isActive,
            election.isEnded,
            election.winner,
            election.winnerVotes,
            election.totalVotes,
            election.createdAt,
            election.endedAt
        );
    }
    
    function getElectionCandidates(uint256 _electionId) public view electionExists(_electionId) returns (string[] memory) {
        return elections[_electionId].candidates;
    }
    
    function getElectionCandidatesWithVotes(uint256 _electionId) public view electionExists(_electionId) returns (
        string[] memory candidateNames, 
        uint256[] memory voteCounts
    ) {
        string[] memory candidates = elections[_electionId].candidates;
        uint256 length = candidates.length;
        candidateNames = new string[](length);
        voteCounts = new uint256[](length);
        
        for (uint i = 0; i < length; i++) {
            candidateNames[i] = candidates[i];
            voteCounts[i] = votesReceived[_electionId][candidates[i]];
        }
        
        return (candidateNames, voteCounts);
    }
    
    // Split getElectionResult into smaller functions to avoid stack too deep
    function getElectionResultBasic(uint256 _electionId) public view electionExists(_electionId) returns (
        uint256 id,
        string memory name,
        string memory winner,
        uint256 winnerVotes,
        uint256 totalVotes,
        uint256 endedAt
    ) {
        Election storage election = elections[_electionId];
        require(election.isEnded, "Election has not ended yet");
        
        return (
            election.id,
            election.name,
            election.winner,
            election.winnerVotes,
            election.totalVotes,
            election.endedAt
        );
    }
    
    function getElectionResultCandidates(uint256 _electionId) public view electionExists(_electionId) returns (
        string[] memory candidates,
        uint256[] memory voteCounts
    ) {
        Election storage election = elections[_electionId];
        require(election.isEnded, "Election has not ended yet");
        
        return getElectionCandidatesWithVotes(_electionId);
    }
    
    function getAllElections() public view returns (uint256[] memory) {
        uint256[] memory allElections = new uint256[](nextElectionId);
        for (uint i = 1; i <= nextElectionId; i++) {
            allElections[i - 1] = i;
        }
        return allElections;
    }
    
    function getElectionCount() public view returns (uint256) {
        return nextElectionId;
    }
    
    function isVoterRegistered(uint256 _electionId, bytes32 _voterHash) public view electionExists(_electionId) returns (bool) {
        return registeredVoters[_electionId][_voterHash];
    }
    
    function hasVoterVoted(uint256 _electionId, bytes32 _voterHash) public view electionExists(_electionId) returns (bool) {
        return hasVoted[_electionId][_voterHash];
    }
    
    function getVoteCount(uint256 _electionId, string memory _candidate) public view electionExists(_electionId) returns (uint256) {
        return votesReceived[_electionId][_candidate];
    }
    
    // Check if an election is in registration phase
    function isInRegistrationPhase(uint256 _electionId) public view electionExists(_electionId) returns (bool) {
        Election storage election = elections[_electionId];
        return election.isActive && !election.isEnded && block.timestamp <= election.registrationDeadline;
    }
    
    // Check if an election is in voting phase
    function isInVotingPhase(uint256 _electionId) public view electionExists(_electionId) returns (bool) {
        Election storage election = elections[_electionId];
        return election.isActive && !election.isEnded && 
               block.timestamp > election.registrationDeadline && 
               block.timestamp <= election.votingDeadline;
    }
    
    // Check if an election has ended
    function hasElectionEnded(uint256 _electionId) public view electionExists(_electionId) returns (bool) {
        return elections[_electionId].isEnded || block.timestamp > elections[_electionId].votingDeadline;
    }
    
    // Helper function to get admin address (explicit getter)
    function getAdmin() public view returns (address) {
        return admin;
    }
    
    // Helper function to check if caller is admin
    function isAdmin(address _address) public view returns (bool) {
        return _address == admin;
    }
    
    // Get election status summary
    function getElectionStatus(uint256 _electionId) public view electionExists(_electionId) returns (
        bool isActive,
        bool isEnded,
        bool inRegistrationPhase,
        bool inVotingPhase,
        uint256 timeUntilRegistrationDeadline,
        uint256 timeUntilVotingDeadline
    ) {
        Election storage election = elections[_electionId];
        
        uint256 now_ = block.timestamp;
        bool inRegPhase = election.isActive && !election.isEnded && now_ <= election.registrationDeadline;
        bool inVotePhase = election.isActive && !election.isEnded && 
                          now_ > election.registrationDeadline && now_ <= election.votingDeadline;
        
        uint256 regTimeLeft = now_ > election.registrationDeadline ? 0 : election.registrationDeadline - now_;
        uint256 voteTimeLeft = now_ > election.votingDeadline ? 0 : election.votingDeadline - now_;
        
        return (
            election.isActive,
            election.isEnded,
            inRegPhase,
            inVotePhase,
            regTimeLeft,
            voteTimeLeft
        );
    }
}