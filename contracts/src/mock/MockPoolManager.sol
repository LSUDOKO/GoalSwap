// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/types/PoolOperation.sol";

/// @title MockPoolManager
/// @notice Minimal V4 PoolManager mock for X Layer testnet deployment
/// @dev Implements only `initialize()` — all other IPoolManager methods revert
///      with a descriptive message. Sufficient for GoalSwap hook/factory testing
///      since swaps/liquidity are handled by the oracle service in production.
contract MockPoolManager {
    struct PoolInfo {
        PoolKey key;
        uint160 sqrtPriceX96;
        int24 tick;
        bool initialized;
    }

    mapping(bytes32 => PoolInfo) public pools;

    event Initialize(bytes32 indexed poolId, PoolKey key, uint160 sqrtPriceX96, int24 tick);

    /// @notice Initialize a pool — stores the pool key and price
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick) {
        bytes32 poolId = keccak256(abi.encode(key));
        require(!pools[poolId].initialized, "Pool already initialized");

        tick = 0; // Mock always returns tick 0
        pools[poolId] = PoolInfo({key: key, sqrtPriceX96: sqrtPriceX96, tick: tick, initialized: true});
        emit Initialize(poolId, key, sqrtPriceX96, tick);
    }

    /// @notice Required by IHooks callbacks — hook checks msg.sender == address(manager),
    ///         so this contract's address must match what hooks expect.
    ///         In tests/broadcasts, pass this contract's address as POOL_MANAGER.

    // ── Stubs — all revert with clear messages ──

    function unlock(bytes calldata) external pure returns (bytes memory) {
        revert("MockPoolManager: unlock not implemented");
    }

    function modifyLiquidity(PoolKey memory, ModifyLiquidityParams memory, bytes calldata)
        external
        pure
        returns (BalanceDelta, BalanceDelta)
    {
        revert("MockPoolManager: modifyLiquidity not implemented");
    }

    function swap(PoolKey memory, SwapParams memory, bytes calldata) external pure returns (BalanceDelta) {
        revert("MockPoolManager: swap not implemented");
    }

    function donate(PoolKey memory, uint256, uint256, bytes calldata) external pure returns (BalanceDelta) {
        revert("MockPoolManager: donate not implemented");
    }

    function sync(Currency) external pure {
        revert("MockPoolManager: sync not implemented");
    }

    function take(Currency, address, uint256) external pure {
        revert("MockPoolManager: take not implemented");
    }

    function settle() external payable returns (uint256) {
        revert("MockPoolManager: settle not implemented");
    }

    function settleFor(address) external payable returns (uint256) {
        revert("MockPoolManager: settleFor not implemented");
    }

    function clear(Currency, uint256) external pure {
        revert("MockPoolManager: clear not implemented");
    }

    function mint(address, uint256, uint256) external pure {
        revert("MockPoolManager: mint not implemented");
    }

    function burn(address, uint256, uint256) external pure {
        revert("MockPoolManager: burn not implemented");
    }

    function updateDynamicLPFee(PoolKey memory, uint24) external pure {
        revert("MockPoolManager: updateDynamicLPFee not implemented");
    }

    // ── IProtocolFees stubs ──

    function protocolFeesAccrued(address, address) external pure returns (uint256) {
        revert("MockPoolManager: protocolFeesAccrued not implemented");
    }

    function protocolFeesAccruedBy(address, address, address) external pure returns (uint256) {
        revert("MockPoolManager: protocolFeesAccruedBy not implemented");
    }

    function setProtocolFee(PoolKey memory) external pure {
        revert("MockPoolManager: setProtocolFee not implemented");
    }

    function collectProtocolFees(address, address, uint256) external pure returns (uint256) {
        revert("MockPoolManager: collectProtocolFees not implemented");
    }

    function currencyDelta(address, Currency) external pure returns (int256) {
        revert("MockPoolManager: currencyDelta not implemented");
    }

    function donateCurrency(Currency, uint256) external pure {
        revert("MockPoolManager: donateCurrency not implemented");
    }

    // ── IExtsload stub ──

    function extsload(bytes32) external pure returns (bytes32) {
        revert("MockPoolManager: extsload not implemented");
    }

    function extsload(bytes32[] calldata) external pure returns (bytes32[] memory) {
        revert("MockPoolManager: extsload not implemented");
    }

    // ── IExttload stub ──

    function exttload(bytes32) external pure returns (bytes32) {
        revert("MockPoolManager: exttload not implemented");
    }

    function exttload(bytes32[] calldata) external pure returns (bytes32[] memory) {
        revert("MockPoolManager: exttload not implemented");
    }

    // ── IERC6909Claims stub ──

    function balanceOf(address, uint256) external pure returns (uint256) {
        revert("MockPoolManager: balanceOf not implemented");
    }

    function allowance(address, address, uint256) external pure returns (uint256) {
        revert("MockPoolManager: allowance not implemented");
    }

    function isOperator(address, address) external pure returns (bool) {
        revert("MockPoolManager: isOperator not implemented");
    }

    function ownerOf(uint256, uint256) external pure returns (address) {
        revert("MockPoolManager: ownerOf not implemented");
    }

    function totalSupply(uint256) external pure returns (uint256) {
        revert("MockPoolManager: totalSupply not implemented");
    }

    function approve(address, uint256, uint256) external pure {
        revert("MockPoolManager: approve not implemented");
    }

    function transfer(address, uint256, uint256) external pure {
        revert("MockPoolManager: transfer not implemented");
    }

    function transferFrom(address, address, uint256, uint256) external pure {
        revert("MockPoolManager: transferFrom not implemented");
    }

    function setOperator(address, bool) external pure {
        revert("MockPoolManager: setOperator not implemented");
    }
}
