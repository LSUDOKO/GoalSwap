// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Simple mock USDC token for X Layer testnet deployment
/// @dev Deployer can mint any amount. 6 decimals to match real USDC.
contract MockUSDC is ERC20 {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1_000_000_000 * 10 ** _DECIMALS); // 1B mUSDC
    }

    /// @notice Mint tokens to any address (anyone can call — testnet only)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice 6 decimals like real USDC
    function decimals() public view virtual override returns (uint8) {
        return _DECIMALS;
    }
}
