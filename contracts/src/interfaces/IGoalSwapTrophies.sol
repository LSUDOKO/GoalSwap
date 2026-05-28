// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGoalSwapTrophies
/// @notice Interface for soulbound trophy minting (hook-only)
interface IGoalSwapTrophies {
    /// @notice Mint a trophy to a user (hook-only access)
    function mintTrophy(address to, uint256 tier, bytes32 matchId) external returns (uint256);

    /// @notice Check if a user has a specific tier
    function hasTier(address user, uint256 tier) external view returns (bool);

    /// @notice Get user's trophy count per tier
    function userTierCount(address user, uint256 tier) external view returns (uint256);
}
