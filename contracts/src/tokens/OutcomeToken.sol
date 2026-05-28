// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title OutcomeToken
/// @notice ERC-20 representing a match outcome prediction (e.g., Team A Win / Draw / Team B Win)
/// @dev Minted by the factory, settled 1:1 for USDC if winning token
contract OutcomeToken is ERC20 {
    using SafeERC20 for IERC20;

    /// @notice Address of the WorldCupArenaHook
    address public immutable hook;

    /// @notice USDC token address for settlement
    address public immutable usdc;

    /// @notice Whether this token has been settled
    bool public isSettled;

    /// @notice Whether this token is the winning outcome
    bool public isWinner;

    /// @notice Match ID this token belongs to
    bytes32 public immutable matchId;

    /// @notice Outcome index (0 = Home Win, 1 = Draw, 2 = Away Win)
    uint8 public immutable outcomeIndex;

    /// @notice Total supply of losing tokens that were burned
    uint256 public burnedSupply;

    // ───── Events ─────

    /// @notice Emitted when the token is settled
    event Settled(bool indexed isWinner);

    /// @notice Emitted when tokens are redeemed for USDC
    event Redeemed(address indexed user, uint256 amount);

    /// @notice Emitted when losing tokens are burned
    event LosingTokensBurned(address indexed user, uint256 amount);

    // ───── Modifiers ─────

    modifier onlyHook() {
        require(msg.sender == hook, "Only hook");
        _;
    }

    // ───── Constructor ─────

    constructor(
        string memory name,
        string memory symbol,
        address _hook,
        address _usdc,
        bytes32 _matchId,
        uint8 _outcomeIndex
    ) ERC20(name, symbol) {
        hook = _hook;
        usdc = _usdc;
        matchId = _matchId;
        outcomeIndex = _outcomeIndex;
    }

    // ───── Minting ─────

    /// @notice Mint new outcome tokens (hook-only after swap)
    /// @param to Recipient address
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external onlyHook {
        _mint(to, amount);
    }

    /// @notice Burn tokens (hook-only, e.g. when user sells)
    /// @param from Address to burn from
    /// @param amount Amount to burn
    function burn(address from, uint256 amount) external onlyHook {
        _burn(from, amount);
    }

    // ───── Settlement ─────

    /// @notice Settle the token outcome (called by hook after match ends)
    /// @param _isWinner Whether this is the winning outcome
    function settle(bool _isWinner) external onlyHook {
        require(!isSettled, "Already settled");
        isSettled = true;
        isWinner = _isWinner;
        emit Settled(_isWinner);
    }

    /// @notice Redeem winning tokens 1:1 for USDC
    /// @dev Burns the winning token and transfers equivalent USDC
    function redeem() external {
        require(isSettled, "Not settled");
        require(isWinner, "Not the winning token");
        uint256 balance = balanceOf(msg.sender);
        require(balance > 0, "No balance");

        _burn(msg.sender, balance);
        IERC20(usdc).safeTransfer(msg.sender, balance);

        emit Redeemed(msg.sender, balance);
    }

    /// @notice Burn losing tokens (can be called by anyone, removes supply)
    /// @param amount Amount of losing tokens to burn
    function burnLosing(uint256 amount) external {
        require(isSettled, "Not settled");
        require(!isWinner, "Cannot burn winning tokens");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _burn(msg.sender, amount);
        burnedSupply += amount;

        emit LosingTokensBurned(msg.sender, amount);
    }

    // ───── View ─────

    /// @notice Get the redeemable value of a token amount (0 if not winner)
    function redeemableValue(uint256 amount) external view returns (uint256) {
        if (!isSettled || !isWinner) return 0;
        return amount; // 1:1 with USDC
    }
}
