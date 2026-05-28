// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";

/// @notice Market types for GoalSwap pools
enum MarketType {
    MATCH_PREDICTION,
    FAN_TOKEN,
    META_MARKET
}

/// @notice Metadata stored per V4 pool
struct PoolMetadata {
    MarketType marketType;
    bytes32 matchId;
    bytes32 tournamentId;
    address teamToken;
    bool isSettled;
}

/// @notice Live state of a World Cup match
struct MatchState {
    uint8 homeScore;
    uint8 awayScore;
    uint16 minute;
    uint8 redCards;
    bool penaltyShootout;
    bool isFinished;
    uint256 lastGoalTimestamp;
    uint256 lastUpdateBlock;
}

/// @notice Bonding curve state for fan tokens
struct FanTokenState {
    uint256 bondingCurveProgress;
    uint256 jackpotBalance;
    uint256 totalVolume;
    bool fundingGoalReached;
}

/// @notice Bracket prediction state
struct BracketState {
    bytes32[] predictedPath;
    uint256 stakeAmount;
    bool isValidated;
    uint256 creationTime;
}

/// @notice Tier data for soulbound trophies
struct TrophyTier {
    string name;
    string description;
    uint256 threshold;
    bool exists;
}

/// @title IWorldCupArenaHook
/// @notice Interface for the GoalSwap Arena Uniswap V4 Hook
interface IWorldCupArenaHook {
    // ───── Events ─────

    /// @notice Emitted when a match state is updated by the oracle
    event MatchStateUpdated(
        bytes32 indexed matchId,
        uint8 homeScore,
        uint8 awayScore,
        uint16 minute,
        address oracle,
        uint256 timestamp
    );

    /// @notice Emitted when a goal is scored
    event GoalScored(
        bytes32 indexed matchId,
        uint8 homeScore,
        uint8 awayScore,
        uint16 minute,
        uint256 timestamp
    );

    /// @notice Emitted when a match is settled
    event MatchSettled(bytes32 indexed matchId, uint8 homeScore, uint8 awayScore);

    /// @notice Emitted when a trophy is minted to a user
    event TrophyMinted(address indexed user, uint256 indexed tier, bytes32 indexed matchId);

    /// @notice Emitted when pool metadata is registered
    /// @param teamToken The fan token address (address(0) for prediction/meta pools)
    event PoolRegistered(PoolKey indexed poolKey, MarketType marketType, bytes32 indexed matchId, address teamToken);

    /// @notice Emitted when the oracle address is updated
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    /// @notice Emitted when a new oracle is authorized
    event OracleAuthorized(address indexed oracle);

    /// @notice Emitted when an oracle is deauthorized
    event OracleDeauthorized(address indexed oracle);

    // ───── State Management ─────

    /// @notice Update match state (oracle-only, requires valid signature)
    function updateMatchState(
        bytes32 matchId,
        uint8 homeScore,
        uint8 awayScore,
        uint16 minute,
        uint8 redCards,
        bool isFinished,
        uint256 timestamp,
        bytes calldata signature
    ) external;

    /// @notice Register pool metadata after initialization
    function registerPool(PoolKey calldata key, MarketType marketType, bytes32 matchId, address teamToken) external;

    // ───── Oracle Management ─────

    /// @notice Authorize an additional oracle
    function authorizeOracle(address _oracle) external;

    /// @notice Remove an oracle
    function deauthorizeOracle(address _oracle) external;

    /// @notice Set the primary oracle address
    function setOracle(address _oracle) external;

    // ───── Emergency ─────

    /// @notice Pause all non-essential operations
    function pause() external;

    /// @notice Unpause operations
    function unpause() external;

    // ───── Queries ─────

    /// @notice Calculate dynamic fee based on match state
    function calculateDynamicFee(MatchState calldata state, MarketType marketType, bool isSellingFanToken)
        external
        view
        returns (uint24 fee, string memory reason);

    /// @notice Get match state for a matchId
    function getMatchState(bytes32 matchId) external view returns (MatchState memory);

    /// @notice Get pool metadata
    function getPoolMetadata(PoolKey calldata key) external view returns (PoolMetadata memory);

    /// @notice Check if match exists
    function matchExists(bytes32 matchId) external view returns (bool);

    /// @notice Verify oracle signature
    function verifyOracleSignature(bytes32 hash, bytes memory signature) external view returns (bool);

    /// @notice Get the current fee for a pool
    function getCurrentFee(PoolKey calldata key) external view returns (uint24 fee, string memory reason);
}
