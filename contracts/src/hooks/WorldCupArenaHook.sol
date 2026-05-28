// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/types/PoolId.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/types/PoolOperation.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/libraries/LPFeeLibrary.sol";

import {IWorldCupArenaHook, MarketType, MatchState, PoolMetadata, FanTokenState, BracketState} from "../interfaces/IWorldCupArenaHook.sol";
import {IGoalSwapTrophies} from "../interfaces/IGoalSwapTrophies.sol";

/// @title WorldCupArenaHook
/// @notice Uniswap V4 hook that powers GoalSwap Arena — dynamic fees, match state, trophies
/// @dev Implements beforeSwap/afterSwap for dynamic fee override and gamification
contract WorldCupArenaHook is IHooks, IWorldCupArenaHook, Ownable, ReentrancyGuard {
    using LPFeeLibrary for uint24;
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════════
    //  Constants
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice USDC address on X Layer (mainnet). For testnet, use mock or bridged.
    address public constant USDC = 0x74b7F16337b8972027F6196A17a631aC6dE26d22;

    /// @notice Fee thresholds (hundredths of basis points: 3000 = 0.3%)
    uint24 public constant FEE_KICKOFF        = 3000;   // 0.3%
    uint24 public constant FEE_NORMAL         = 10000;  // 1.0%
    uint24 public constant FEE_POST_GOAL      = 30000;  // 3.0%
    uint24 public constant FEE_HIGH_VOLATILITY = 50000; // 5.0%
    uint24 public constant FEE_PENALTY_SHOOTOUT = 100000; // 10.0%
    uint24 public constant FEE_SETTLEMENT     = 0;      // 0%
    uint24 public constant FEE_FAN_PANIC_SELL = 100000; // 10.0%
    uint24 public constant FEE_FAN_NORMAL     = 30000;  // 3.0%
    uint24 public constant FEE_META_MARKET    = 10000;  // 1.0%

    /// @notice Time windows
    uint256 public constant GOAL_FEE_WINDOW   = 300;    // 5 minutes
    uint256 public constant KICKOFF_WINDOW    = 900;    // 15 minutes
    uint256 public constant TROPHY_GOAL_WINDOW = 60;    // 60 seconds for Lightning Reflex SBT
    uint256 public constant ORACLE_TIMEOUT    = 300;    // 5 minutes for stale data check
    uint256 public constant ORACLE_MAX_FUTURE = 60;     // 60 seconds for future data check

    /// @notice Multi-oracle
    uint256 public requiredOracleConfirmations = 1;

    // ══════════════════════════════════════════════════════════════════════════════
    //  State
    // ══════════════════════════════════════════════════════════════════════════════

    IPoolManager public immutable manager;

    /// @notice Pool metadata keyed by PoolId
    mapping(PoolId => PoolMetadata) public poolMetadata;

    /// @notice Match states keyed by matchId
    mapping(bytes32 => MatchState) public matchStates;

    /// @notice Fan token state keyed by token address
    mapping(address => FanTokenState) public fanTokenStates;

    /// @notice Bracket states keyed by bracketId
    mapping(bytes32 => BracketState) public bracketStates;

    /// @notice User XP
    mapping(address => uint256) public userXP;

    /// @notice User trading streak (consecutive days)
    mapping(address => uint256) public userStreak;

    /// @notice User volume per match
    mapping(address => mapping(bytes32 => uint256)) public userMatchVolume;

    /// @notice Oracle signatures for on-chain verification
    mapping(bytes32 => bytes) public matchProofs;

    /// @notice Primary oracle address
    address public oracle;

    /// @notice Authorized oracle addresses (multi-oracle support)
    mapping(address => bool) public authorizedOracles;

    /// @notice GoalSwapTrophies contract (soulbound achievements)
    IGoalSwapTrophies public trophies;

    /// @notice OutcomeTokenFactory contract (authorized to register pools)
    address public factory;

    /// @notice Tracks user's last swap block for MEV protection
    mapping(address => uint256) public lastSwapBlock;

    /// @notice Whether the hook is paused
    bool public paused;

    /// @notice Tracks if pool keys are registered
    mapping(PoolId => bool) public registeredPools;

    // ══════════════════════════════════════════════════════════════════════════════
    //  Modifiers
    // ══════════════════════════════════════════════════════════════════════════════

    modifier onlyOracle() {
        require(msg.sender == oracle || authorizedOracles[msg.sender], "Unauthorized oracle");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Constructor
    // ══════════════════════════════════════════════════════════════════════════════

    constructor(IPoolManager _manager, address _oracle) Ownable(msg.sender) {
        manager = _manager;
        oracle = _oracle;
        authorizedOracles[_oracle] = true;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  IHooks — Permission Flags
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Returns the hook permissions (encoded in address bits).
    /// We use: beforeSwap, afterSwap, afterInitialize, afterAddLiquidity
    function getHookPermissions() public pure returns (uint24) {
        // Flag bits (from Hooks.sol):
        // BEFORE_SWAP_FLAG   = 1 << 9  = 0x200
        // AFTER_SWAP_FLAG    = 1 << 8  = 0x100
        // AFTER_INITIALIZE_FLAG = 1 << 11 = 0x800
        // AFTER_ADD_LIQUIDITY_FLAG = 1 << 6 = 0x40
        // Combined: 0x200 | 0x100 | 0x800 | 0x40 = 0xAE0
        return 0xAE0;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  IHooks — Core Callbacks
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice AfterInitialize — register pool metadata
    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24
    ) external override view returns (bytes4) {
        require(msg.sender == address(manager), "Only manager");
        return IHooks.afterInitialize.selector;
    }

    /// @notice BeforeSwap — dynamic fee override based on match state
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata
    )
        external
        override
        whenNotPaused
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        require(msg.sender == address(manager), "Only manager");

        // MEV protection: prevent back-to-back swaps from same address
        require(block.number > lastSwapBlock[sender], "MEV protection");
        lastSwapBlock[sender] = block.number;

        PoolId poolId = key.toId();
        require(registeredPools[poolId], "Pool not registered");

        PoolMetadata memory meta = poolMetadata[poolId];
        (uint24 fee, ) = _calculateDynamicFee(meta.matchId, meta.marketType, false);

        // Return fee override with flag
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    /// @notice AfterSwap — value distribution and trophy minting
    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta delta,
        bytes calldata
    )
        external
        override
        returns (bytes4, int128)
    {
        require(msg.sender == address(manager), "Only manager");

        PoolId poolId = key.toId();
        PoolMetadata memory meta = poolMetadata[poolId];

        // Track user volume
        uint256 volume = uint256(int256(delta.amount0()) > 0 ? uint256(int256(delta.amount0())) : uint256(-int256(delta.amount0())));
        userMatchVolume[sender][meta.matchId] += volume;

        // Update user XP
        userXP[sender] += volume / 1e18; // Rough XP: 1 XP per 1 USDC volume

        // Check trophy conditions
        _checkAndMintTrophy(sender, meta.matchId);

        // Track fan token state
        if (meta.marketType == MarketType.FAN_TOKEN) {
            fanTokenStates[meta.teamToken].totalVolume += volume;
        }

        return (IHooks.afterSwap.selector, int128(0));
    }

    /// @notice AfterAddLiquidity — track LP positions for gamification
    function afterAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    )
        external
        override
        view
        returns (bytes4, BalanceDelta)
    {
        require(msg.sender == address(manager), "Only manager");
        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Unused IHooks (must be implemented but revert)
    // ══════════════════════════════════════════════════════════════════════════════

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IHooks.beforeAddLiquidity.selector;
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata)
        external
        pure
        override
        returns (bytes4, BalanceDelta)
    {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IHooks.afterDonate.selector;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Match State Management
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Update match state (oracle-only with signature verification)
    function updateMatchState(
        bytes32 matchId,
        uint8 homeScore,
        uint8 awayScore,
        uint16 minute,
        uint8 redCards,
        bool _isFinished,
        uint256 timestamp,
        bytes memory signature
    ) external override onlyOracle nonReentrant whenNotPaused {
        // Verify oracle signature to prevent replay attacks
        bytes32 messageHash = keccak256(abi.encodePacked(
            matchId, homeScore, awayScore, minute, redCards, _isFinished, timestamp
        ));
        require(verifyOracleSignature(messageHash, signature), "Invalid signature");

        // Prevent stale or future data
        require(timestamp >= block.timestamp - ORACLE_TIMEOUT, "Stale data");
        require(timestamp <= block.timestamp + ORACLE_MAX_FUTURE, "Future data");

        MatchState storage state = matchStates[matchId];

        // Prevent score regression
        require(homeScore >= state.homeScore, "Invalid home score");
        require(awayScore >= state.awayScore, "Invalid away score");
        require(minute >= state.minute || _isFinished, "Invalid minute");

        bool goalScored = (homeScore > state.homeScore) || (awayScore > state.awayScore);

        // Check if match is newly finished (before overwriting state.isFinished)
        bool newlyFinished = _isFinished && !state.isFinished;

        state.homeScore = homeScore;
        state.awayScore = awayScore;
        state.minute = minute;
        state.redCards = redCards;
        state.isFinished = _isFinished;
        state.lastUpdateBlock = block.number;
        matchProofs[matchId] = signature;

        if (goalScored) {
            state.lastGoalTimestamp = block.timestamp;
            emit GoalScored(matchId, homeScore, awayScore, minute, block.timestamp);
        }

        if (newlyFinished) {
            _settleMatch(matchId);
        }

        emit MatchStateUpdated(matchId, homeScore, awayScore, minute, msg.sender, timestamp);
    }

    /// @notice Register pool metadata (called by OutcomeTokenFactory or FanToken)
    function registerPool(
        PoolKey calldata key,
        MarketType marketType,
        bytes32 matchId,
        address teamToken
    ) external override {
        require(
            msg.sender == owner() || msg.sender == address(this) || msg.sender == factory,
            "Unauthorized"
        );
        PoolId poolId = key.toId();

        poolMetadata[poolId] = PoolMetadata({
            marketType: marketType,
            matchId: matchId,
            tournamentId: 0, // Will be set on initialization
            teamToken: teamToken,
            isSettled: false
        });

        registeredPools[poolId] = true;
        emit PoolRegistered(key, marketType, matchId, teamToken);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Oracle Management
    // ══════════════════════════════════════════════════════════════════════════════

    function authorizeOracle(address _oracle) external override onlyOwner {
        require(_oracle != address(0), "Zero address");
        authorizedOracles[_oracle] = true;
        emit OracleAuthorized(_oracle);
    }

    function deauthorizeOracle(address _oracle) external override onlyOwner {
        require(_oracle != address(0), "Zero address");
        authorizedOracles[_oracle] = false;
        emit OracleDeauthorized(_oracle);
    }

    function setOracle(address _oracle) external override onlyOwner {
        require(_oracle != address(0), "Zero address");
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
        authorizedOracles[_oracle] = true;
    }

    /// @notice Set the GoalSwapTrophies contract address
    function setTrophiesAddress(address _trophies) external onlyOwner {
        require(_trophies != address(0), "Zero address");
        trophies = IGoalSwapTrophies(_trophies);
        emit TrophyContractUpdated(_trophies);
    }

    /// @notice Set the OutcomeTokenFactory address (authorized to register pools)
    function setFactoryAddress(address _factory) external onlyOwner {
        require(_factory != address(0), "Zero address");
        factory = _factory;
        emit FactoryAddressUpdated(_factory);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Emergency Controls
    // ══════════════════════════════════════════════════════════════════════════════

    function pause() external override onlyOwner {
        paused = true;
    }

    function unpause() external override onlyOwner {
        paused = false;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Public Queries
    // ══════════════════════════════════════════════════════════════════════════════

    function calculateDynamicFee(MatchState calldata state, MarketType marketType, bool isSellingFanToken)
        external
        view
        override
        returns (uint24 fee, string memory reason)
    {
        return _calculateDynamicFeeFromState(state, marketType, isSellingFanToken);
    }

    function getMatchState(bytes32 matchId) external view override returns (MatchState memory) {
        return matchStates[matchId];
    }

    function getPoolMetadata(PoolKey calldata key) external view override returns (PoolMetadata memory) {
        return poolMetadata[key.toId()];
    }

    function matchExists(bytes32 matchId) external view override returns (bool) {
        return matchStates[matchId].lastUpdateBlock > 0;
    }

    function verifyOracleSignature(bytes32 hash, bytes memory signature) public view override returns (bool) {
        if (signature.length != 65) return false;

        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(ethSignedHash, signature);
        if (err != ECDSA.RecoverError.NoError) return false;

        if (requiredOracleConfirmations == 1) {
            return signer == oracle || authorizedOracles[signer];
        }
        // Multi-sig verification would go here (2-of-3, etc.)
        return false;
    }

    function getCurrentFee(PoolKey calldata key) external view override returns (uint24 fee, string memory reason) {
        PoolId poolId = key.toId();
        require(registeredPools[poolId], "Pool not registered");
        PoolMetadata memory meta = poolMetadata[poolId];
        return _calculateDynamicFee(meta.matchId, meta.marketType, false);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Internal — Dynamic Fee Calculation
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Calculate dynamic fee for a match
    function _calculateDynamicFee(bytes32 matchId, MarketType marketType, bool isSellingFanToken)
        internal
        view
        returns (uint24 fee, string memory reason)
    {
        MatchState storage state = matchStates[matchId];

        // If match hasn't been created yet, return normal fee
        if (state.lastUpdateBlock == 0) {
            return (FEE_NORMAL, "No data");
        }

        return _calculateDynamicFeeFromState(state, marketType, isSellingFanToken);
    }

    /// @notice Calculate dynamic fee from match state (pure logic)
    function _calculateDynamicFeeFromState(MatchState memory state, MarketType marketType, bool isSellingFanToken)
        internal
        view
        returns (uint24 fee, string memory reason)
    {
        // Meta-market pools (brackets, props)
        if (marketType == MarketType.META_MARKET) {
            return (FEE_META_MARKET, "Meta-market");
        }

        // Fan token pools
        if (marketType == MarketType.FAN_TOKEN) {
            if (isSellingFanToken) {
                // Team winning + user selling = panic-sell penalty
                return (FEE_FAN_PANIC_SELL, "Fan panic-sell");
            }
            return (FEE_FAN_NORMAL, "Fan token");
        }

        // Match prediction pools
        if (state.isFinished) {
            return (FEE_SETTLEMENT, "Settlement");
        }

        if (state.penaltyShootout) {
            return (FEE_PENALTY_SHOOTOUT, "Penalty shootout");
        }

        // Post-goal volatility window (5 min window)
        if (state.lastGoalTimestamp > 0 && block.timestamp <= state.lastGoalTimestamp + GOAL_FEE_WINDOW) {
            return (FEE_POST_GOAL, "Post-goal volatility");
        }

        // Red card or final minutes (minute >= 90)
        if (state.redCards > 0 || state.minute >= 90) {
            return (FEE_HIGH_VOLATILITY, state.redCards > 0 ? "Red card" : "Final minutes");
        }

        // Kickoff window (first 15 minutes)
        if (state.minute <= 15) {
            return (FEE_KICKOFF, "Kickoff");
        }

        // Normal play
        return (FEE_NORMAL, "Normal play");
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Internal — Trophy Minting
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Check and mint trophy if conditions met
    function _checkAndMintTrophy(address user, bytes32 matchId) internal {
        if (address(trophies) == address(0)) return; // Not configured yet

        MatchState storage state = matchStates[matchId];

        // Lightning Reflex (Tier 1): traded within 60s of a goal
        if (state.lastGoalTimestamp > 0 && block.timestamp <= state.lastGoalTimestamp + TROPHY_GOAL_WINDOW) {
            trophies.mintTrophy(user, 1, matchId);
            emit TrophyMinted(user, 1, matchId);
        }

        // Silver Prophet (Tier 3): 5+ trades in this match
        if (userMatchVolume[user][matchId] >= 5) {
            trophies.mintTrophy(user, 3, matchId);
            emit TrophyMinted(user, 3, matchId);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Internal — Match Settlement
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Settle a match — updates pool metadata to finished state
    function _settleMatch(bytes32 matchId) internal {
        emit MatchSettled(matchId, matchStates[matchId].homeScore, matchStates[matchId].awayScore);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Fallback
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when the GoalSwapTrophies contract address is set
    event TrophyContractUpdated(address indexed trophies);

    /// @notice Emitted when the OutcomeTokenFactory address is set
    event FactoryAddressUpdated(address indexed factory);

    /// @notice Allow contract to receive native currency (for flash callbacks)
    receive() external payable {}
}
