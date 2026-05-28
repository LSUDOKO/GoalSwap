// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {IWorldCupArenaHook} from "../src/interfaces/IWorldCupArenaHook.sol";
import {OutcomeTokenFactory} from "../src/tokens/OutcomeTokenFactory.sol";
import {WorldCupArenaHook} from "../src/hooks/WorldCupArenaHook.sol";

/// @title OutcomeTokenFactoryTest
/// @notice Tests for OutcomeTokenFactory
contract OutcomeTokenFactoryTest is Test {
    OutcomeTokenFactory factory;
    WorldCupArenaHook hook;

    address oracle = address(0x1234);
    address owner = address(0x5678);
    address usdc = address(0x74b7F16337b8972027F6196A17a631aC6dE26d22); // Mock USDC address

    bytes32 matchId = keccak256("ARG-BRA-2026");

    function setUp() public {
        // Deploy hook with zero manager (tests will use only query functions)
        vm.prank(owner);
        hook = new WorldCupArenaHook(IPoolManager(address(0)), oracle);

        // Deploy factory
        vm.prank(owner);
        factory = new OutcomeTokenFactory(usdc, IPoolManager(address(0)), IWorldCupArenaHook(address(hook)));

        // Wire factory into hook
        vm.prank(owner);
        hook.setFactoryAddress(address(factory));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Deployment
    // ══════════════════════════════════════════════════════════════════

    function test_FactoryDeployment() public {
        assertEq(factory.usdc(), usdc, "USDC should match");
        assertEq(factory.owner(), owner, "Owner should match");
    }

    // ══════════════════════════════════════════════════════════════════
    //  Token Creation (basic)
    // ══════════════════════════════════════════════════════════════════

    function test_CreateOnlyOwner() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(); // Only owner can create
        factory.createMatchTokens(matchId, "Argentina", "Brazil");
    }

    // ══════════════════════════════════════════════════════════════════
    //  Token Queries
    // ══════════════════════════════════════════════════════════════════

    function test_TotalTokensZero() public view {
        assertEq(factory.totalTokens(), 0, "Should have 0 tokens initially");
    }
}
