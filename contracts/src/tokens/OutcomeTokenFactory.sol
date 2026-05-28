// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/libraries/LPFeeLibrary.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {OutcomeToken} from "./OutcomeToken.sol";
import {IWorldCupArenaHook, MarketType} from "../interfaces/IWorldCupArenaHook.sol";

/// @title OutcomeTokenFactory
/// @notice Creates match outcome token pairs (Home Win / Draw / Away Win) and initializes V4 pools
contract OutcomeTokenFactory is Ownable, ReentrancyGuard {
    using LPFeeLibrary for uint24;

    // ───── Constants ─────

    /// @notice USDC address on X Layer
    address public immutable usdc;

    /// @notice Tick spacing for prediction pools
    int24 public constant TICK_SPACING = 60;

    /// @notice Initial sqrt price for 1:1 token pairs
    uint160 public constant INITIAL_SQRT_PRICE = 79228162514264337593543950336; // 1:1 price

    // ───── State ─────

    /// @notice The V4 pool manager
    IPoolManager public immutable manager;

    /// @notice The WorldCupArenaHook contract
    IWorldCupArenaHook public immutable hook;

    /// @notice Track created match tokens
    mapping(bytes32 => bool) public matchTokensCreated;

    /// @notice Tokens created per match: matchId => outcomeIndex => token address
    mapping(bytes32 => mapping(uint8 => address)) public outcomeTokens;

    /// @notice Pool keys per match: matchId => outcomeIndex => PoolKey
    mapping(bytes32 => mapping(uint8 => PoolKey)) public outcomePools;

    /// @notice All tokens created by this factory
    address[] public allTokens;

    // ───── Events ─────

    /// @notice Emitted when a match outcome token pair is created
    event MatchTokensCreated(
        bytes32 indexed matchId,
        address homeWinToken,
        address drawToken,
        address awayWinToken,
        address poolManager,
        PoolKey homePoolKey,
        PoolKey drawPoolKey,
        PoolKey awayPoolKey
    );

    // ───── Constructor ─────

    constructor(address _usdc, IPoolManager _manager, IWorldCupArenaHook _hook) Ownable(msg.sender) {
        usdc = _usdc;
        manager = _manager;
        hook = _hook;
    }

    // ───── Match Token Creation ─────

    /// @notice Create all 3 outcome tokens for a match and initialize V4 pools
    /// @param matchId Unique match identifier
    /// @param homeTeam Home team name
    /// @param awayTeam Away team name
    /// @return homeWinToken Address of Home Win token
    /// @return drawToken Address of Draw token
    /// @return awayWinToken Address of Away Win token
    function createMatchTokens(
        bytes32 matchId,
        string calldata homeTeam,
        string calldata awayTeam
    ) external onlyOwner returns (address, address, address) {
        require(!matchTokensCreated[matchId], "Match tokens already created");
        matchTokensCreated[matchId] = true;

        // Create 3 outcome tokens
        OutcomeToken homeWin = new OutcomeToken(
            string(abi.encodePacked(homeTeam, " Win")),
            string(abi.encodePacked(_safeSymbol(homeTeam), "W")),
            address(hook),
            usdc,
            matchId,
            0
        );
        outcomeTokens[matchId][0] = address(homeWin);
        allTokens.push(address(homeWin));

        OutcomeToken draw = new OutcomeToken(
            string(abi.encodePacked(homeTeam, " vs ", awayTeam, " Draw")),
            "DRAW",
            address(hook),
            usdc,
            matchId,
            1
        );
        outcomeTokens[matchId][1] = address(draw);
        allTokens.push(address(draw));

        OutcomeToken awayWin = new OutcomeToken(
            string(abi.encodePacked(awayTeam, " Win")),
            string(abi.encodePacked(_safeSymbol(awayTeam), "W")),
            address(hook),
            usdc,
            matchId,
            2
        );
        outcomeTokens[matchId][2] = address(awayWin);
        allTokens.push(address(awayWin));

        // Initialize V4 pools with dynamic fee flag
        PoolKey memory homePoolKey = PoolKey({
            currency0: Currency.wrap(usdc),
            currency1: Currency.wrap(address(homeWin)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        manager.initialize(homePoolKey, INITIAL_SQRT_PRICE);
        outcomePools[matchId][0] = homePoolKey;
        hook.registerPool(homePoolKey, MarketType.MATCH_PREDICTION, matchId, address(0));

        PoolKey memory drawPoolKey = PoolKey({
            currency0: Currency.wrap(usdc),
            currency1: Currency.wrap(address(draw)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        manager.initialize(drawPoolKey, INITIAL_SQRT_PRICE);
        outcomePools[matchId][1] = drawPoolKey;
        hook.registerPool(drawPoolKey, MarketType.MATCH_PREDICTION, matchId, address(0));

        PoolKey memory awayPoolKey = PoolKey({
            currency0: Currency.wrap(usdc),
            currency1: Currency.wrap(address(awayWin)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        manager.initialize(awayPoolKey, INITIAL_SQRT_PRICE);
        outcomePools[matchId][2] = awayPoolKey;
        hook.registerPool(awayPoolKey, MarketType.MATCH_PREDICTION, matchId, address(0));

        emit MatchTokensCreated(matchId, address(homeWin), address(draw), address(awayWin), address(manager), homePoolKey, drawPoolKey, awayPoolKey);

        return (address(homeWin), address(draw), address(awayWin));
    }

    // ───── Queries ─────

    /// @notice Get all tokens created by this factory
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /// @notice Get the token address for a match outcome
    function getOutcomeToken(bytes32 matchId, uint8 outcomeIndex) external view returns (address) {
        return outcomeTokens[matchId][outcomeIndex];
    }

    /// @notice Get total tokens created
    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    // ───── Internal ─────

    /// @notice Safely truncate team name to symbol (max 5 chars)
    function _safeSymbol(string calldata name) internal pure returns (string memory) {
        bytes memory nameBytes = bytes(name);
        if (nameBytes.length <= 5) {
            return name;
        }
        // Take first 3 uppercase chars
        bytes memory symbol = new bytes(3);
        uint256 count = 0;
        for (uint256 i = 0; i < nameBytes.length && count < 3; i++) {
            bytes1 char = nameBytes[i];
            if (char >= 0x41 && char <= 0x5A) {
                // A-Z
                symbol[count] = char;
                count++;
            }
        }
        // If no uppercase letters found, use first 3 chars
        if (count == 0) {
            for (uint256 i = 0; i < 3 && i < nameBytes.length; i++) {
                symbol[i] = nameBytes[i];
            }
        }
        return string(symbol);
    }
}
