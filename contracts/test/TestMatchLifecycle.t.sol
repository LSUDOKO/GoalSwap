// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/libraries/LPFeeLibrary.sol";

import {WorldCupArenaHook} from "../src/hooks/WorldCupArenaHook.sol";
import {OutcomeTokenFactory} from "../src/tokens/OutcomeTokenFactory.sol";
import {GoalSwapTrophies} from "../src/tokens/GoalSwapTrophies.sol";
import {BracketNFT} from "../src/tokens/BracketNFT.sol";
import {IWorldCupArenaHook, MatchState, MarketType} from "../src/interfaces/IWorldCupArenaHook.sol";
import {MockPoolManager} from "../src/mock/MockPoolManager.sol";
import {MockUSDC} from "../src/mock/MockUSDC.sol";

/// @title TestMatchLifecycle
/// @notice Full match lifecycle integration test
/// @dev Simulates: deploy → create match tokens → oracle update → fee changes → settle → trophy mint
contract TestMatchLifecycle is Test {
    // ── Contracts ──
    WorldCupArenaHook hook;
    OutcomeTokenFactory factory;
    GoalSwapTrophies trophies;
    BracketNFT bracketNFT;
    MockPoolManager mockPm;
    MockUSDC mockUsdc;

    // ── Actors ──
    uint256 oraclePK = 0xABCD_1234_5678_DEAD_BEEF;
    address oracle;
    address owner = address(0x5678);
    address trader = address(0x9ABC);

    // ── Match ──
    bytes32 matchId = keccak256("ARG-BRA-2026");
    string constant HOME_TEAM = "Argentina";
    string constant AWAY_TEAM = "Brazil";

    // ── Tracking ──
    address homeWinToken;
    address drawToken;
    address awayWinToken;

    // ══════════════════════════════════════════════════════════
    //  Setup — deploy everything
    // ══════════════════════════════════════════════════════════

    function setUp() public {
        oracle = vm.addr(oraclePK);
        vm.warp(1_000_000); // Set reasonable timestamp

        // ── 1. Deploy mocks ──
        mockPm = new MockPoolManager();
        mockUsdc = new MockUSDC();

        // ── 2. Deploy hook ──
        vm.prank(owner);
        hook = new WorldCupArenaHook(IPoolManager(address(mockPm)), oracle);

        // ── 3. Deploy factory ──
        vm.prank(owner);
        factory = new OutcomeTokenFactory(address(mockUsdc), IPoolManager(address(mockPm)), IWorldCupArenaHook(address(hook)));

        // ── 4. Deploy trophies ──
        vm.prank(owner);
        trophies = new GoalSwapTrophies(address(hook), "https://api.goalswap.xyz/metadata/trophies/");
        vm.prank(owner);
        hook.setTrophiesAddress(address(trophies));

        // ── 5. Wire factory into hook (authorized to register pools) ──
        vm.prank(owner);
        hook.setFactoryAddress(address(factory));

        // ── 6. Deploy bracket NFT ──
        vm.prank(owner);
        bracketNFT = new BracketNFT(keccak256("WORLD_CUP_2026"), "https://api.goalswap.xyz/metadata/brackets/");

        // ── 7. Create match tokens (factory calls hook.registerPool) ──
        vm.prank(owner);
        (homeWinToken, drawToken, awayWinToken) = factory.createMatchTokens(matchId, HOME_TEAM, AWAY_TEAM);
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 1: Verify deployment state
    // ══════════════════════════════════════════════════════════

    function test_Step1_DeploymentState() public view {
        // Hook deployed
        assertEq(address(hook.oracle()), oracle, "Oracle set on hook");
        assertTrue(hook.authorizedOracles(oracle), "Oracle authorized");
        assertFalse(hook.paused(), "Hook not paused");

        // Factory deployed
        assertEq(factory.owner(), owner, "Factory owner");
        assertEq(factory.usdc(), address(mockUsdc), "USDC set on factory");
        assertEq(factory.totalTokens(), 3, "3 tokens created");
        assertTrue(factory.matchTokensCreated(matchId), "Match tokens created");

        // Tokens exist
        assertTrue(homeWinToken != address(0), "Home win token exists");
        assertTrue(drawToken != address(0), "Draw token exists");
        assertTrue(awayWinToken != address(0), "Away win token exists");

        // Pools registered on hook
        assertEq(hook.factory(), address(factory), "Factory wired into hook");

        // Trophies deployed
        assertEq(address(trophies), address(hook.trophies()), "Trophies wired");
        assertEq(trophies.totalMinted(), 0, "No trophies minted yet");

        // Bracket deployed
        assertEq(bracketNFT.totalMinted(), 0, "No brackets minted yet");
        assertEq(bracketNFT.tournamentId(), keccak256("WORLD_CUP_2026"), "Tournament ID set");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 2: Oracle updates match — kickoff
    // ══════════════════════════════════════════════════════════

    function test_Step2_MatchKickoff() public {
        bytes memory sig = _signUpdate(matchId, 0, 0, 1, 0, false);

        vm.prank(oracle);
        hook.updateMatchState(matchId, 0, 0, 1, 0, false, block.timestamp, sig);

        MatchState memory state = hook.getMatchState(matchId);
        assertEq(state.homeScore, 0, "Home score 0-0");
        assertEq(state.awayScore, 0, "Away score 0-0");
        assertEq(state.minute, 1, "Minute 1");
        assertTrue(hook.matchExists(matchId), "Match exists");
        assertFalse(state.isFinished, "Not finished");

        // Verify kickoff fee (first 15 min)
        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, hook.FEE_KICKOFF(), "Kickoff fee 0.3%");
        assertEq(reason, "Kickoff", "Kickoff reason");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 3: Goal scored + post-goal fee spike
    // ══════════════════════════════════════════════════════════

    function test_Step3_GoalScoredFeeSpike() public {
        // Set initial 0-0 state
        bytes memory sig1 = _signUpdate(matchId, 0, 0, 10, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 0, 0, 10, 0, false, block.timestamp, sig1);

        // Advance time, score a goal
        vm.warp(block.timestamp + 300);
        bytes memory sig2 = _signUpdate(matchId, 1, 0, 30, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig2);

        MatchState memory state = hook.getMatchState(matchId);
        assertEq(state.homeScore, 1, "Goal scored! Home 1-0");
        assertGt(state.lastGoalTimestamp, 0, "Goal timestamp recorded");
        assertEq(state.minute, 30, "Minute 30");

        // Fee should be POST_GOAL (within 5 min window)
        (uint24 fee, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, hook.FEE_POST_GOAL(), "Post-goal fee 3.0%");

        // After the 5 min window, fee returns to NORMAL
        vm.warp(state.lastGoalTimestamp + hook.GOAL_FEE_WINDOW() + 1);
        (uint24 feeLater, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(feeLater, hook.FEE_NORMAL(), "Normal fee after window");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 4: Red card → high volatility fee
    // ══════════════════════════════════════════════════════════

    function test_Step4_RedCardFee() public {
        // First, set initial state with scores (avoids triggering goalScored later)
        bytes memory sigInit = _signUpdate(matchId, 1, 0, 50, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 50, 0, false, block.timestamp, sigInit);

        // Warp past the post-goal fee window (5 min)
        vm.warp(block.timestamp + hook.GOAL_FEE_WINDOW() + 1);

        // Now issue a red card (no score change, so no goalScored trigger)
        bytes memory sigRed = _signUpdate(matchId, 1, 0, 65, 1, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 65, 1, false, block.timestamp, sigRed);

        MatchState memory state = hook.getMatchState(matchId);
        assertEq(state.redCards, 1, "Red card issued");

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, hook.FEE_HIGH_VOLATILITY(), "High volatility fee 5.0%");
        assertEq(reason, "Red card", "Red card reason");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 5: Final minutes fee
    // ══════════════════════════════════════════════════════════

    function test_Step5_FinalMinutesFee() public {
        // First, set initial state with scores (avoids triggering goalScored later)
        bytes memory sigInit = _signUpdate(matchId, 1, 0, 30, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sigInit);

        // Warp past the post-goal fee window
        vm.warp(block.timestamp + hook.GOAL_FEE_WINDOW() + 1);

        // Advance to final minutes (no score change, so no goalScored)
        bytes memory sigFinal = _signUpdate(matchId, 1, 0, 90, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 90, 0, false, block.timestamp, sigFinal);

        MatchState memory state = hook.getMatchState(matchId);
        assertEq(state.minute, 90, "Minute 90");

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, hook.FEE_HIGH_VOLATILITY(), "Final minutes fee 5.0%");
        assertEq(reason, "Final minutes", "Final minutes reason");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 6: Penalty shootout — max fee
    // ══════════════════════════════════════════════════════════

    function test_Step6_PenaltyShootoutFee() public {
        // Set 120-minute state with penalty shootout flag
        /// @dev The hook sets penaltyShootout via MatchState struct — in this version,
        ///      the oracle update doesn't include penaltyShootout as a parameter.
        ///      We test the fee calculation directly with the penalty struct field.

        // First, create the match state
        bytes memory sig = _signUpdate(matchId, 2, 2, 120, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 2, 2, 120, 0, false, block.timestamp, sig);

        // Read the state and verify normal fee for 2-2 at 120'
        MatchState memory state = hook.getMatchState(matchId);

        // Construct a penalty-shootout state for fee calculation
        MatchState memory penaltyState = MatchState({
            homeScore: 2,
            awayScore: 2,
            minute: 120,
            redCards: 0,
            penaltyShootout: true,
            isFinished: false,
            lastGoalTimestamp: state.lastGoalTimestamp,
            lastUpdateBlock: state.lastUpdateBlock
        });

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(penaltyState, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, hook.FEE_PENALTY_SHOOTOUT(), "Penalty shootout fee 10%");
        assertEq(reason, "Penalty shootout", "Penalty shootout reason");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 7: Match settlement — fee drops to 0
    // ══════════════════════════════════════════════════════════

    function test_Step7_MatchSettlement() public {
        bytes memory sig = _signUpdate(matchId, 3, 1, 95, 0, true);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 3, 1, 95, 0, true, block.timestamp, sig);

        MatchState memory state = hook.getMatchState(matchId);
        assertTrue(state.isFinished, "Match finished");
        assertEq(state.homeScore, 3, "Final: Home 3");
        assertEq(state.awayScore, 1, "Final: Away 1");

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        assertEq(fee, hook.FEE_SETTLEMENT(), "Settlement fee 0%");
        assertEq(reason, "Settlement", "Settlement reason");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 8: Fan token fee scenarios
    // ══════════════════════════════════════════════════════════

    function test_Step8_FanTokenFees() public {
        // Set match state where home team is winning
        bytes memory sig = _signUpdate(matchId, 2, 0, 80, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 2, 0, 80, 0, false, block.timestamp, sig);

        MatchState memory state = hook.getMatchState(matchId);

        // Normal fan token buy
        (uint24 feeBuy, ) = hook.calculateDynamicFee(state, MarketType.FAN_TOKEN, false);
        assertEq(feeBuy, hook.FEE_FAN_NORMAL(), "Fan token buy 3.0%");

        // Panic sell (team winning + user selling)
        (uint24 feeSell, string memory sellReason) = hook.calculateDynamicFee(state, MarketType.FAN_TOKEN, true);
        assertEq(feeSell, hook.FEE_FAN_PANIC_SELL(), "Fan panic sell 10%");
        assertEq(sellReason, "Fan panic-sell", "Panic sell reason");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 9: Trophy minting via hook
    // ══════════════════════════════════════════════════════════

    function test_Step9_TrophyMinting() public {
        // Score a goal
        bytes memory sig1 = _signUpdate(matchId, 0, 0, 10, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 0, 0, 10, 0, false, block.timestamp, sig1);

        vm.warp(block.timestamp + 300);
        bytes memory sig2 = _signUpdate(matchId, 1, 0, 30, 0, false);
        vm.prank(oracle);
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig2);

        // Direct trophy mint from hook (simulates afterSwap callback)
        vm.prank(address(hook));
        uint256 tokenId = trophies.mintTrophy(trader, 1, matchId);
        assertEq(tokenId, 1, "First trophy ID = 1");
        assertTrue(trophies.hasTier(trader, 1), "Trader has Tier 1");
        assertEq(trophies.ownerOf(tokenId), trader, "Trader owns trophy");

        // Verify soulbound (can't transfer)
        vm.prank(trader);
        vm.expectRevert("Soulbound: non-transferable");
        trophies.transferFrom(trader, address(0xDEAD), tokenId);
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 10: Bracket minting + validation
    // ══════════════════════════════════════════════════════════

    function test_Step10_BracketLifecycle() public {
        bytes32[] memory path = new bytes32[](3);
        path[0] = keccak256("ARG-BRA");   // R16
        path[1] = keccak256("WINNER1-WINNER2"); // QF
        path[2] = keccak256("WINNER3-WINNER4"); // SF

        // Mint bracket
        vm.prank(trader);
        uint256 tokenId = bracketNFT.mintBracket(path);
        assertEq(tokenId, 1, "First bracket ID = 1");

        // Verify bracket data
        BracketNFT.Bracket memory bracket = bracketNFT.getBracket(tokenId);
        assertEq(bracket.matchCount, 3, "3 matches in path");
        assertFalse(bracket.isValidated, "Not validated yet");
        assertEq(bracketNFT.ownerOf(tokenId), trader, "Trader owns bracket");

        // Mint another user's bracket
        address trader2 = address(0xCAFE);
        vm.prank(trader2);
        bracketNFT.mintBracket(path);
        assertEq(bracketNFT.totalMinted(), 2, "2 brackets minted");

        // Validate bracket
        vm.prank(owner);
        bool correct = bracketNFT.validateBracket(tokenId, path);
        assertTrue(correct, "Bracket should be correct");
        assertTrue(bracketNFT.hasCorrectBracket(trader), "Trader has correct bracket");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 11: Oracle signature security
    // ══════════════════════════════════════════════════════════

    function test_Step11_SignatureSecurity() public {
        // Stale data
        bytes memory staleSig = _signUpdateAtTimestamp(matchId, 1, 0, 30, 0, false, block.timestamp - 1000);
        vm.prank(oracle);
        vm.expectRevert("Stale data");
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp - 1000, staleSig);

        // Future data
        bytes memory futureSig = _signUpdateAtTimestamp(matchId, 1, 0, 30, 0, false, block.timestamp + 120);
        vm.prank(oracle);
        vm.expectRevert("Future data");
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp + 120, futureSig);

        // Unauthorized oracle
        bytes memory sig = _signUpdate(matchId, 1, 0, 30, 0, false);
        vm.prank(address(0xDEAD));
        vm.expectRevert("Unauthorized oracle");
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig);

        // Invalid signature
        bytes memory badSig = hex"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
        vm.prank(oracle);
        vm.expectRevert("Invalid signature");
        hook.updateMatchState(matchId, 0, 0, 0, 0, false, block.timestamp, badSig);
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 12: Oracle authorization
    // ══════════════════════════════════════════════════════════

    function test_Step12_OracleAuthorization() public {
        address oracle2 = address(0xCAFE);

        // Authorize
        vm.prank(owner);
        hook.authorizeOracle(oracle2);
        assertTrue(hook.authorizedOracles(oracle2), "Oracle2 authorized");

        // Deauthorize
        vm.prank(owner);
        hook.deauthorizeOracle(oracle2);
        assertFalse(hook.authorizedOracles(oracle2), "Oracle2 deauthorized");

        // Set new primary oracle
        address oracle3 = address(0x1234);
        vm.prank(owner);
        hook.setOracle(oracle3);
        assertEq(hook.oracle(), oracle3, "New primary oracle");
        assertTrue(hook.authorizedOracles(oracle3), "New oracle auto-authorized");
    }

    // ══════════════════════════════════════════════════════════
    //  Lifecycle Step 13: Pause/unpause
    // ══════════════════════════════════════════════════════════

    function test_Step13_EmergencyPause() public {
        assertFalse(hook.paused(), "Not paused");

        vm.prank(owner);
        hook.pause();
        assertTrue(hook.paused(), "Paused");

        vm.prank(owner);
        hook.unpause();
        assertFalse(hook.paused(), "Unpaused");

        // Non-owner cannot pause
        vm.prank(trader);
        vm.expectRevert();
        hook.pause();
    }

    // ══════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════

    function _signUpdate(bytes32 _matchId, uint8 home, uint8 away, uint16 minute, uint8 reds, bool finished)
        internal
        view
        returns (bytes memory)
    {
        return _signUpdateAtTimestamp(_matchId, home, away, minute, reds, finished, block.timestamp);
    }

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
}
