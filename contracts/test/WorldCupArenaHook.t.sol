// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {WorldCupArenaHook} from "../src/hooks/WorldCupArenaHook.sol";
import {GoalSwapTrophies} from "../src/tokens/GoalSwapTrophies.sol";
import {MatchState, MarketType} from "../src/interfaces/IWorldCupArenaHook.sol";

/// @title WorldCupArenaHookTest
/// @notice Tests for the WorldCupArenaHook contract with real ECDSA signature verification
contract WorldCupArenaHookTest is Test {
    WorldCupArenaHook hook;
    GoalSwapTrophies trophies;

    // Use a known private key so we can sign oracle messages in tests
    uint256 oraclePK = 0xABCD_1234_5678_DEAD_BEEF;
    address oracle;
    address owner = address(0x5678);
    address user = address(0x9ABC);

    bytes32 matchId = keccak256("ARG-BRA-2026");

    function setUp() public {
        oracle = vm.addr(oraclePK);

        // Set a reasonable block timestamp to avoid underflow in timeout checks
        vm.warp(1_000_000);

        // Deploy hook with zero manager (tests use only the state/fee functions that don't need a real pool manager)
        vm.prank(owner);
        hook = new WorldCupArenaHook(IPoolManager(address(0)), oracle);

        // Deploy trophies contract and wire it into the hook
        vm.prank(owner);
        trophies = new GoalSwapTrophies(address(hook), "https://api.goalswap.xyz/metadata/trophies/");
        vm.prank(owner);
        hook.setTrophiesAddress(address(trophies));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════════════

    /// @notice Create a valid ECDSA signature for oracle-signed match state updates
    function _signUpdate(bytes32 _matchId, uint8 home, uint8 away, uint16 minute, uint8 reds, bool finished)
        internal
        view
        returns (bytes memory)
    {
        return _signUpdateAtTimestamp(_matchId, home, away, minute, reds, finished, block.timestamp);
    }

    /// @notice Sign with a specific timestamp (for stale/future data tests)
    function _signUpdateAtTimestamp(
        bytes32 _matchId,
        uint8 home,
        uint8 away,
        uint16 minute,
        uint8 reds,
        bool finished,
        uint256 ts
    )
        internal
        view
        returns (bytes memory)
    {
        bytes32 hash = keccak256(abi.encodePacked(_matchId, home, away, minute, reds, finished, ts));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePK, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // ══════════════════════════════════════════════════════════════════
    //  Oracle Management
    // ══════════════════════════════════════════════════════════════════

    function test_OracleManagement() public {
        assertEq(hook.oracle(), oracle, "Oracle should be set");
        assertTrue(hook.authorizedOracles(oracle), "Oracle should be authorized");

        // Owner can change oracle
        address newOracle = address(0xDEAD);
        vm.prank(owner);
        hook.setOracle(newOracle);
        assertEq(hook.oracle(), newOracle, "Oracle should be updated");
        assertTrue(hook.authorizedOracles(newOracle), "New oracle should be authorized");
    }

    function test_OracleNotOwner() public {
        // Non-owner cannot change oracle
        vm.prank(user);
        vm.expectRevert();
        hook.setOracle(address(0xDEAD));
    }

    function test_AuthorizeOracle() public {
        address oracle2 = address(0xCAFE);
        vm.prank(owner);
        hook.authorizeOracle(oracle2);
        assertTrue(hook.authorizedOracles(oracle2), "Oracle2 should be authorized");

        vm.prank(owner);
        hook.deauthorizeOracle(oracle2);
        assertFalse(hook.authorizedOracles(oracle2), "Oracle2 should be deauthorized");
    }

    // ══════════════════════════════════════════════════════════════════
    //  Emergency Controls
    // ══════════════════════════════════════════════════════════════════

    function test_PauseUnpause() public {
        vm.prank(owner);
        hook.pause();
        assertTrue(hook.paused(), "Should be paused");

        vm.prank(owner);
        hook.unpause();
        assertFalse(hook.paused(), "Should be unpaused");
    }

    function test_OnlyOwnerCanPause() public {
        vm.prank(user);
        vm.expectRevert();
        hook.pause();
    }

    // ══════════════════════════════════════════════════════════════════
    //  Match State Management
    // ══════════════════════════════════════════════════════════════════

    function test_UpdateMatchState() public {
        bytes memory sig = _signUpdate(matchId, 1, 0, 67, 0, false);

        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 67, 0, false, block.timestamp, sig);

        MatchState memory state = hook.getMatchState(matchId);
        assertEq(state.homeScore, 1, "Home score should be 1");
        assertEq(state.awayScore, 0, "Away score should be 0");
        assertEq(state.minute, 67, "Minute should be 67");
        assertFalse(state.isFinished, "Match should not be finished");
        assertTrue(matchExists(matchId), "Match should exist");
    }

    function test_GoalScored() public {
        bytes memory sig1 = _signUpdate(matchId, 0, 0, 10, 0, false);

        // Set initial state
        vm.prank(oracle);
        hook.updateMatchState(matchId, 0, 0, 10, 0, false, block.timestamp, sig1);

        // Advance time and score a goal
        vm.warp(block.timestamp + 300);
        bytes memory sig2 = _signUpdate(matchId, 1, 0, 30, 0, false);

        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig2);

        MatchState memory state = hook.getMatchState(matchId);
        assertEq(state.homeScore, 1, "Home score should be 1");
        assertGt(state.lastGoalTimestamp, 0, "Goal timestamp should be set");
    }

    function test_MatchFinished() public {
        bytes memory sig = _signUpdate(matchId, 2, 1, 90, 0, true);

        vm.prank(oracle);
        hook.updateMatchState(matchId, 2, 1, 90, 0, true, block.timestamp, sig);

        MatchState memory state = hook.getMatchState(matchId);
        assertTrue(state.isFinished, "Match should be finished");
    }

    function test_UnauthorizedOracle() public {
        bytes memory sig = _signUpdate(matchId, 1, 0, 67, 0, false);
        vm.prank(user);
        vm.expectRevert("Unauthorized oracle");
        hook.updateMatchState(matchId, 1, 0, 67, 0, false, block.timestamp, sig);
    }

    function test_InvalidSignature() public {
        bytes memory badSig = hex"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"; // 65 bytes of zeros
        vm.prank(oracle);
        vm.expectRevert("Invalid signature");
        // Sign with wrong data to ensure the zero signature fails
        hook.updateMatchState(matchId, 0, 0, 0, 0, false, block.timestamp, badSig);
    }

    function test_StaleData() public {
        bytes memory sig = _signUpdateAtTimestamp(matchId, 1, 0, 67, 0, false, block.timestamp - 1000);
        vm.prank(oracle);
        vm.expectRevert("Stale data");
        hook.updateMatchState(matchId, 1, 0, 67, 0, false, block.timestamp - 1000, sig);
    }

    function test_FutureData() public {
        bytes memory sig = _signUpdateAtTimestamp(matchId, 1, 0, 67, 0, false, block.timestamp + 120);
        vm.prank(oracle);
        vm.expectRevert("Future data");
        hook.updateMatchState(matchId, 1, 0, 67, 0, false, block.timestamp + 120, sig);
    }

    // ══════════════════════════════════════════════════════════════════
    //  Fee Calculation
    // ══════════════════════════════════════════════════════════════════

    function test_FeeKickoff() public view {
        MatchState memory state = MatchState({
            homeScore: 0,
            awayScore: 0,
            minute: 10,
            redCards: 0,
            penaltyShootout: false,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, 3000, "Kickoff fee should be 0.3%");
    }

    function test_FeeNormal() public view {
        MatchState memory state = MatchState({
            homeScore: 0,
            awayScore: 0,
            minute: 30,
            redCards: 0,
            penaltyShootout: false,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, 10000, "Normal fee should be 1.0%");
    }

    function test_FeeSettlement() public view {
        MatchState memory state = MatchState({
            homeScore: 2,
            awayScore: 1,
            minute: 90,
            redCards: 0,
            penaltyShootout: false,
            isFinished: true,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, 0, "Settlement fee should be 0%");
    }

    function test_FeeFanPanicSell() public view {
        MatchState memory state = MatchState({
            homeScore: 2,
            awayScore: 0,
            minute: 80,
            redCards: 0,
            penaltyShootout: false,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.FAN_TOKEN, true);
        assertEq(fee, 100000, "Panic sell fee should be 10%");
    }

    function test_FeePenaltyShootout() public view {
        MatchState memory state = MatchState({
            homeScore: 1,
            awayScore: 1,
            minute: 120,
            redCards: 0,
            penaltyShootout: true,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, 100000, "Penalty shootout fee should be 10%");
    }

    function test_FeeRedCard() public view {
        MatchState memory state = MatchState({
            homeScore: 1,
            awayScore: 0,
            minute: 60,
            redCards: 1,
            penaltyShootout: false,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, 50000, "Red card fee should be 5%");
    }

    function test_FeeFinalMinutes() public view {
        MatchState memory state = MatchState({
            homeScore: 1,
            awayScore: 0,
            minute: 95,
            redCards: 0,
            penaltyShootout: false,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, 50000, "Final minutes fee should be 5%");
    }

    function test_FeeMetaMarket() public view {
        MatchState memory state = MatchState({
            homeScore: 0,
            awayScore: 0,
            minute: 30,
            redCards: 0,
            penaltyShootout: false,
            isFinished: false,
            lastGoalTimestamp: 0,
            lastUpdateBlock: 1
        });

        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.META_MARKET, false);
        assertEq(fee, 10000, "Meta-market fee should be 1.0%");
    }

    // ══════════════════════════════════════════════════════════════════
    //  Match State Boundary Checks
    // ══════════════════════════════════════════════════════════════════

    function test_ScoreCannotDecrease() public {
        bytes memory sig1 = _signUpdate(matchId, 2, 1, 85, 0, false);
        bytes memory sig2 = _signUpdate(matchId, 1, 1, 85, 0, false);

        vm.prank(oracle);
        hook.updateMatchState(matchId, 2, 1, 85, 0, false, block.timestamp, sig1);

        vm.prank(oracle);
        vm.expectRevert("Invalid home score");
        hook.updateMatchState(matchId, 1, 1, 85, 0, false, block.timestamp, sig2);
    }

    function test_MinuteCannotDecrease() public {
        bytes memory sig1 = _signUpdate(matchId, 1, 0, 45, 0, false);
        bytes memory sig2 = _signUpdate(matchId, 1, 0, 30, 0, false);

        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 45, 0, false, block.timestamp, sig1);

        vm.prank(oracle);
        vm.expectRevert("Invalid minute");
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig2);
    }

    // ══════════════════════════════════════════════════════════════════
    //  Trophy Minting Integration
    // ══════════════════════════════════════════════════════════════════

    function test_TrophyLightningReflex() public {
        // Setup: deploy trophies if not already done in setUp
        // Goal scored
        bytes memory sig1 = _signUpdate(matchId, 1, 0, 30, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig1);

        // Trophy should not be minted yet (no trade yet)
        assertFalse(trophies.hasTier(user, 1), "No trophy before trade");

        // Simulate a swap by calling afterSwap... we can't easily call afterSwap without PoolManager
        // Instead, verify that the trophies contract is wired and the hook can call it
        assertEq(address(trophies), address(hook.trophies()), "Trophies contract should be set");
    }

    function test_TrophiesContractWired() public view {
        assertEq(address(trophies), address(hook.trophies()), "Trophies contract should be wired");
        assertTrue(trophies.hook() == address(hook), "Hook should be authorized on trophies");
    }

    function test_TrophyMintingFromHook() public {
        // Directly test that the hook (via this test, acting as hook) can mint trophies
        vm.prank(address(hook));
        uint256 tokenId = trophies.mintTrophy(user, 1, matchId);
        assertEq(tokenId, 1, "First trophy should have token ID 1");
        assertTrue(trophies.hasTier(user, 1), "User should have tier 1 trophy");
        assertEq(trophies.ownerOf(tokenId), user, "User should own the trophy");
    }

    // ══════════════════════════════════════════════════════════════════
    //  Helper
    // ══════════════════════════════════════════════════════════════════

    function matchExists(bytes32 id) internal view returns (bool) {
        return hook.matchExists(id);
    }
}
