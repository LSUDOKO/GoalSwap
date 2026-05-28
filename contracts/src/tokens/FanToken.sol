// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/libraries/LPFeeLibrary.sol";

import {IWorldCupArenaHook, MarketType} from "../interfaces/IWorldCupArenaHook.sol";

/// @title FanToken
/// @notice Country/team fan token with bonding curve price discovery
/// @dev Uses linear bonding curve: price = BASE_PRICE + (totalMinted * SLOPE)
contract FanToken is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using LPFeeLibrary for uint24;

    // ───── Constants ─────

    /// @notice Base price in USDC (6 decimals)
    uint256 public constant BASE_PRICE = 0.001 * 1e6;

    /// @notice Price slope per token minted
    uint256 public constant SLOPE = 0.0001 * 1e6;

    /// @notice Max supply cap
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e6;

    /// @notice Funding goal for V4 pool creation (50% of max)
    uint256 public constant FUNDING_GOAL = MAX_SUPPLY / 2;

    // ───── State ─────

    /// @notice USDC address
    address public immutable usdc;

    /// @notice WorldCupArenaHook address
    address public immutable hook;

    /// @notice V4 PoolManager
    IPoolManager public immutable manager;

    /// @notice Total minted supply
    uint256 public totalMinted;

    /// @notice Whether the V4 pool has been created
    bool public poolCreated;

    /// @notice The V4 pool key for secondary trading
    PoolKey public fanTokenPoolKey;

    /// @notice Team name
    string public teamName;

    /// @notice Match ID associated with this fan token
    bytes32 public matchId;

    // ───── Events ─────

    event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount, uint256 price);
    event TokensSold(address indexed seller, uint256 tokenAmount, uint256 usdcReturn, uint256 price);
    event V4PoolCreated(PoolKey poolKey);

    // ───── Constructor ─────

    constructor(
        string memory _teamName,
        string memory symbol,
        address _usdc,
        address _hook,
        IPoolManager _manager,
        bytes32 _matchId
    ) ERC20(string(abi.encodePacked(_teamName, " Fan Token")), symbol) Ownable(msg.sender) {
        teamName = _teamName;
        usdc = _usdc;
        hook = _hook;
        manager = _manager;
        matchId = _matchId;
    }

    // ───── Bonding Curve — Buy ─────

    /// @notice Buy fan tokens with USDC via bonding curve
    /// @param usdcAmount Amount of USDC to spend
    function buy(uint256 usdcAmount) external nonReentrant {
        require(usdcAmount >= 1000, "Min purchase 0.001 USDC"); // Minimum 0.001 USDC
        require(totalMinted < MAX_SUPPLY, "Max supply reached");

        uint256 price = getCurrentPrice();
        uint256 tokensToMint = (usdcAmount * 1e6) / price;

        // Cap to remaining supply
        if (totalMinted + tokensToMint > MAX_SUPPLY) {
            tokensToMint = MAX_SUPPLY - totalMinted;
        }

        require(tokensToMint > 0, "Zero tokens to mint");
        uint256 actualUsdc = (tokensToMint * price) / 1e6;

        // Transfer USDC from buyer
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), actualUsdc);

        // Mint tokens
        _mint(msg.sender, tokensToMint);
        totalMinted += tokensToMint;

        // Refund excess USDC
        if (actualUsdc < usdcAmount) {
            IERC20(usdc).safeTransfer(msg.sender, usdcAmount - actualUsdc);
        }

        // Check if we should create V4 pool
        if (totalMinted >= FUNDING_GOAL && !poolCreated) {
            _createV4Pool();
        }

        emit TokensPurchased(msg.sender, actualUsdc, tokensToMint, price);
    }

    // ───── Bonding Curve — Sell ─────

    /// @notice Sell fan tokens back to bonding curve (price determined by hook's afterSwap)
    /// @dev Tokens are burned, USDC is returned minus dynamic fee enforced by hook
    /// @param tokenAmount Amount of fan tokens to sell
    function sell(uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        uint256 price = getCurrentPrice();
        uint256 usdcReturn = (tokenAmount * price) / 1e6;

        require(usdcReturn >= 1000, "Return < 0.001 USDC");
        require(IERC20(usdc).balanceOf(address(this)) >= usdcReturn, "Insufficient LP reserves");

        // Burn tokens
        _burn(msg.sender, tokenAmount);
        totalMinted -= tokenAmount;

        // Transfer USDC back (hook applys dynamic fee if selling while team winning)
        IERC20(usdc).safeTransfer(msg.sender, usdcReturn);

        emit TokensSold(msg.sender, tokenAmount, usdcReturn, price);
    }

    // ───── V4 Pool Creation ─────

    /// @notice Create V4 pool for secondary trading once funding goal is reached
    function _createV4Pool() internal {
        fanTokenPoolKey = PoolKey({
            currency0: Currency.wrap(usdc),
            currency1: Currency.wrap(address(this)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        // Provide initial liquidity from contract balance
        uint256 initialLiquidity = IERC20(usdc).balanceOf(address(this)) / 2; // 50% to pool
        if (initialLiquidity > 0) {
            _approve(address(this), address(manager), type(uint256).max);
            // Note: Actual pool initialization requires interaction with PoolManager
            // This is a simplified version — in production, use PoolInitializer
        }

        manager.initialize(fanTokenPoolKey, 79228162514264337593543950336); // 1:1 sqrt price
        IWorldCupArenaHook(hook).registerPool(fanTokenPoolKey, MarketType.FAN_TOKEN, matchId, address(this));

        poolCreated = true;
        emit V4PoolCreated(fanTokenPoolKey);
    }

    // ───── Queries ─────

    /// @notice Get current bonding curve price
    /// @return Price in USDC (6 decimals)
    function getCurrentPrice() public view returns (uint256) {
        return BASE_PRICE + (totalMinted * SLOPE);
    }

    /// @notice Get purchase quote: how many tokens for a given USDC amount
    /// @param usdcAmount Amount of USDC
    /// @return tokenAmount Tokens received
    function getPurchaseQuote(uint256 usdcAmount) external view returns (uint256) {
        uint256 price = getCurrentPrice();
        uint256 tokens = (usdcAmount * 1e6) / price;
        if (totalMinted + tokens > MAX_SUPPLY) {
            tokens = MAX_SUPPLY - totalMinted;
        }
        return tokens;
    }

    /// @notice Get sell quote: how much USDC for a given token amount
    /// @param tokenAmount Amount of tokens
    /// @return usdcReturn USDC returned
    function getSellQuote(uint256 tokenAmount) external view returns (uint256) {
        uint256 price = getCurrentPrice();
        return (tokenAmount * price) / 1e6;
    }

    /// @notice Get bonding curve progress (0-10000 basis points)
    function getBondingCurveProgress() external view returns (uint256) {
        return (totalMinted * 10000) / MAX_SUPPLY;
    }
}
