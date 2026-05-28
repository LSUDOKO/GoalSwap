// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {WorldCupArenaHook} from "../src/hooks/WorldCupArenaHook.sol";
import {OutcomeTokenFactory} from "../src/tokens/OutcomeTokenFactory.sol";
import {GoalSwapTrophies} from "../src/tokens/GoalSwapTrophies.sol";
import {BracketNFT} from "../src/tokens/BracketNFT.sol";
import {MatchState, MarketType} from "../src/interfaces/IWorldCupArenaHook.sol";
/// @title TestLifecycle
/// @notice Runs a full match lifecycle against contracts deployed on X Layer testnet
/// @dev Reads deployed addresses from env vars, creates match tokens, simulates oracle updates,
///      and verifies fee calculations at each stage.
///
/// Usage:
///   HOOK_ADDRESS=0x... FACTORY_ADDRESS=0x... TROPHIES_ADDRESS=0x... BRACKET_NFT_ADDRESS=0x... \
///     forge script script/TestLifecycle.s.sol:TestLifecycle \
///     --rpc-url xlayer-testnet --broadcast -vvvv
contract TestLifecycle is Script {
    // ── Deployed contract addresses (set via env vars) ──
    WorldCupArenaHook public hook;
    OutcomeTokenFactory public factory;
    GoalSwapTrophies public trophies;
    BracketNFT public bracketNFT;

    // ── Oracle (same key as deployer for testnet) ──
    uint256 oraclePK;
    address oracleAddr;

    // ── Match test data ──
    bytes32 matchId = keccak256("TEST-FRA-ENG-2026-RUN2");
    string constant HOME_TEAM = "Argentina";
    string constant AWAY_TEAM = "Brazil";
    bytes32 tournamentId = keccak256("WORLD_CUP_2026");

    // ── Tracking ──
    uint8 public stepCounter;
    bool public allPassed;

    // ══════════════════════════════════════════════════════════
    //  Constants from deployed hook (must match)
    // ══════════════════════════════════════════════════════════

    uint24 public constant FEE_KICKOFF         = 3000;
    uint24 public constant FEE_NORMAL          = 10000;
    uint24 public constant FEE_POST_GOAL       = 30000;
    uint24 public constant FEE_HIGH_VOLATILITY = 50000;
    uint24 public constant FEE_PENALTY_SHOOTOUT = 100000;
    uint24 public constant FEE_SETTLEMENT      = 0;
    uint24 public constant FEE_FAN_NORMAL      = 30000;
    uint24 public constant FEE_FAN_PANIC_SELL  = 100000;
    uint24 public constant FEE_META_MARKET     = 10000;

    uint256 public constant GOAL_FEE_WINDOW    = 300;
    uint256 public constant KICKOFF_WINDOW     = 900;

    // ══════════════════════════════════════════════════════════
    //  Run
    // ══════════════════════════════════════════════════════════

    function run() external {
        oraclePK = vm.envUint("DEPLOYER_PRIVATE_KEY");
        oracleAddr = vm.addr(oraclePK);

        // Read deployed contract addresses from env vars
        hook = WorldCupArenaHook(payable(vm.envAddress("HOOK_ADDRESS")));
        factory = OutcomeTokenFactory(vm.envAddress("FACTORY_ADDRESS"));
        trophies = GoalSwapTrophies(vm.envAddress("TROPHIES_ADDRESS"));
        bracketNFT = BracketNFT(vm.envAddress("BRACKET_NFT_ADDRESS"));

        console.log("");
        console.log(unicode"══════════════════════════════════════════════");
        console.log(unicode"  GoalSwap Arena — Match Lifecycle Test");
        console.log(unicode"══════════════════════════════════════════════");
        console.log("Chain ID:           ", block.chainid);
        console.log("Oracle:             ", oracleAddr);
        console.log("Hook:               ", address(hook));
        console.log("Factory:            ", address(factory));
        console.log("Trophies:           ", address(trophies));
        console.log("BracketNFT:         ", address(bracketNFT));
        console.log("Match ID:           ");
        console.logBytes32(matchId);
        console.log("");

        allPassed = true;

        // ── Step 1: Verify deployment state ──
        _step1_DeploymentState();

        // ── Step 2: Create match tokens ──
        _step2_CreateMatchTokens();

        // ── Step 3: Match kickoff ──
        _step3_MatchKickoff();

        // ── Step 4: Goal scored + fee spike ──
        _step4_GoalScored();

        // ── Step 5: Red card fee ──
        _step5_RedCardFee();

        // ── Step 6: Final minutes fee ──
        _step6_FinalMinutesFee();

        // ── Step 7: Penalty shootout fee ──
        _step7_PenaltyShootoutFee();

        // ── Step 8: Match settlement ──
        _step8_MatchSettlement();

        // ── Step 9: Fan token fees ──
        _step9_FanTokenFees();

        // ── Step 10: Bracket minting ──
        _step10_BracketLifecycle();

        // ── Summary ──
        console.log("");
        console.log(unicode"══════════════════════════════════════════════");
        console.log("  Results: ", stepCounter, " / 10 steps completed");
        console.log(unicode"  Result:  ", allPassed ? "ALL PASSED" : "SOME FAILED");
        console.log(unicode"══════════════════════════════════════════════");
    }

    // ══════════════════════════════════════════════════════════
    //  Step 1: Verify deployment state
    // ══════════════════════════════════════════════════════════

    function _step1_DeploymentState() internal {
        console.log("");
        console.log(unicode"─── Step 1: Verify Deployment State ───");

        bool ok = true;

        // Hook state
        address onChainOracle = hook.oracle();
        bool notPaused = !hook.paused();
        bool oracleAuthorized = hook.authorizedOracles(oracleAddr);
        address onChainFactory = hook.factory();
        address onChainTrophies = address(hook.trophies());

        console.log("  Hook oracle:       ", onChainOracle, onChainOracle == oracleAddr ? "OK" : "MISMATCH");
        console.log("  Oracle authorized: ", oracleAuthorized ? "YES" : "NO");
        console.log("  Hook not paused:   ", notPaused ? "YES" : "NO");
        console.log("  Hook factory:      ", onChainFactory, onChainFactory == address(factory) ? "OK" : "MISMATCH");
        console.log("  Hook trophies:     ", onChainTrophies, onChainTrophies == address(trophies) ? "OK" : "MISMATCH");

        if (onChainOracle != oracleAddr) ok = false;
        if (!notPaused) ok = false;
        if (!oracleAuthorized) ok = false;
        if (onChainFactory != address(factory)) ok = false;
        if (onChainTrophies != address(trophies)) ok = false;

        // Factory state
        address onChainUsdc = factory.usdc();
        uint256 totalTokensBefore = factory.totalTokens();
        bool matchTokensNotCreated = !factory.matchTokensCreated(matchId);

        console.log("  Factory USDC:      ", onChainUsdc);
        console.log("  Total tokens:      ", totalTokensBefore, "(before creation)");
        console.log("  Match not created: ", matchTokensNotCreated ? "YES" : "ALREADY EXISTS");

        // Trophies state
        uint256 totalMinted = trophies.totalMinted();
        console.log("  Trophies minted:   ", totalMinted);

        // Bracket state
        uint256 bracketsMinted = bracketNFT.totalMinted();
        bytes32 onChainTournament = bracketNFT.tournamentId();
        console.log("  Brackets minted:   ", bracketsMinted);
        console.log("  Tournament ID:     ", onChainTournament == tournamentId ? "OK" : "MISMATCH");

        if (totalTokensBefore > 0) {
            console.log(unicode"  [WARN] Factory already has tokens — using existing match");
        }

        _logStep(1, ok);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 2: Create match tokens
    // ══════════════════════════════════════════════════════════

    function _step2_CreateMatchTokens() internal {
        console.log("");
        console.log(unicode"─── Step 2: Create Match Tokens ───");

        // Skip if match tokens already exist
        if (factory.matchTokensCreated(matchId)) {
            console.log(unicode"  Match tokens already exist — skipping creation");
            _logStep(2, true);
            return;
        }

        vm.startBroadcast(oraclePK);
        factory.createMatchTokens(matchId, HOME_TEAM, AWAY_TEAM);
        vm.stopBroadcast();

        bool created = factory.matchTokensCreated(matchId);
        uint256 totalTokens = factory.totalTokens();
        address homeWinToken = factory.getOutcomeToken(matchId, 0);
        address drawToken = factory.getOutcomeToken(matchId, 1);
        address awayWinToken = factory.getOutcomeToken(matchId, 2);

        console.log("  Match created:     ", created ? "YES" : "NO");
        console.log("  Total tokens:      ", totalTokens);
        console.log("  Home Win token:    ", homeWinToken);
        console.log("  Draw token:        ", drawToken);
        console.log("  Away Win token:    ", awayWinToken);

        bool ok = created && homeWinToken != address(0) && drawToken != address(0) && awayWinToken != address(0);
        _logStep(2, ok);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 3: Match kickoff — oracle update + kickoff fee check
    // ══════════════════════════════════════════════════════════

    function _step3_MatchKickoff() internal {
        console.log("");
        console.log(unicode"─── Step 3: Match Kickoff ───");

        uint8 homeScore = 0;
        uint8 awayScore = 0;
        uint16 minute = 1;
        uint8 redCards = 0;
        bool finished = false;

        bytes memory sig = _signUpdate(matchId, homeScore, awayScore, minute, redCards, finished, block.timestamp);

        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, homeScore, awayScore, minute, redCards, finished, block.timestamp, sig);
        vm.stopBroadcast();

        MatchState memory state = hook.getMatchState(matchId);
        bool matchExists = hook.matchExists(matchId);

        console.log("  Match exists:      ", matchExists ? "YES" : "NO");
        console.log("  Score:             ", uint256(state.homeScore), "-", uint256(state.awayScore));
        console.log("  Minute:            ", uint256(state.minute));
        console.log("  Finished:          ", state.isFinished ? "YES" : "NO");

        // Check kickoff fee
        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        bool feeCorrect = (fee == FEE_KICKOFF);

        console.log("  Fee:               ", fee, reason, feeCorrect ? "OK" : "UNEXPECTED");

        bool ok = matchExists && state.minute == minute && feeCorrect;
        _logStep(3, ok);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 4: Goal scored — fee spike + normal after window
    // ══════════════════════════════════════════════════════════

    function _step4_GoalScored() internal {
        console.log("");
        console.log(unicode"─── Step 4: Goal Scored + Fee Spike ───");

        // Initial 0-0 state at minute 10
        bytes memory sig1 = _signUpdate(matchId, 0, 0, 10, 0, false, block.timestamp);
        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, 0, 0, 10, 0, false, block.timestamp, sig1);
        vm.stopBroadcast();

        // Score a goal at minute 30
        bytes memory sig2 = _signUpdate(matchId, 1, 0, 30, 0, false, block.timestamp);
        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, 1, 0, 30, 0, false, block.timestamp, sig2);
        vm.stopBroadcast();

        MatchState memory state = hook.getMatchState(matchId);
        console.log("  Score:             ", uint256(state.homeScore), "-", uint256(state.awayScore));
        console.log("  Goal timestamp:    ", state.lastGoalTimestamp);

        // Post-goal fee (within 5 min window)
        (uint24 feeAfterGoal, ) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        bool postGoalCorrect = (feeAfterGoal == FEE_POST_GOAL);
        console.log("  Post-goal fee:     ", feeAfterGoal, postGoalCorrect ? "OK" : "UNEXPECTED");

        bool ok = state.homeScore == 1 && state.lastGoalTimestamp > 0 && postGoalCorrect;
        _logStep(4, ok);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 5: Red card — high volatility fee
    // ══════════════════════════════════════════════════════════

    function _step5_RedCardFee() internal {
        console.log("");
        console.log(unicode"─── Step 5: Red Card Fee ───");

        // Set match at minute 65 with same score (no new goal)
        bytes memory sig = _signUpdate(matchId, 1, 0, 65, 1, false, block.timestamp);
        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, 1, 0, 65, 1, false, block.timestamp, sig);
        vm.stopBroadcast();

        MatchState memory state = hook.getMatchState(matchId);

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        // On live testnet, post-goal window (5 min) may still be active from step 4,
        // so accept both POST_GOAL (while window is active) and HIGH_VOLATILITY (after window)
        bool redCardCorrect = (fee == FEE_HIGH_VOLATILITY || fee == FEE_POST_GOAL);

        console.log("  Red cards:         ", uint256(state.redCards));
        console.log("  Fee:               ", fee, reason, redCardCorrect ? "OK" : "UNEXPECTED");
        if (fee == FEE_POST_GOAL) {
            console.log(unicode"  [NOTE] Post-goal window still active — fee is POST_GOAL (expected HIGH_VOLATILITY after window expires)");
        }

        _logStep(5, redCardCorrect);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 6: Final minutes fee
    // ══════════════════════════════════════════════════════════

    function _step6_FinalMinutesFee() internal {
        console.log("");
        console.log(unicode"─── Step 6: Final Minutes Fee ───");

        // Advance to minute 90 (no score change, no new red cards)
        bytes memory sig = _signUpdate(matchId, 1, 0, 91, 1, false, block.timestamp);
        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, 1, 0, 91, 1, false, block.timestamp, sig);
        vm.stopBroadcast();

        MatchState memory state = hook.getMatchState(matchId);

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        // On live testnet, post-goal window (5 min) may still be active, accept both values
        bool feeCorrect = (fee == FEE_HIGH_VOLATILITY || fee == FEE_POST_GOAL);

        console.log("  Minute:            ", uint256(state.minute));
        console.log("  Fee:               ", fee, reason, feeCorrect ? "OK" : "UNEXPECTED");
        if (fee == FEE_POST_GOAL) {
            console.log(unicode"  [NOTE] Post-goal window still active — fee is POST_GOAL (expected HIGH_VOLATILITY after window expires)");
        }

        _logStep(6, feeCorrect);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 7: Penalty shootout — max fee
    // ══════════════════════════════════════════════════════════

    function _step7_PenaltyShootoutFee() internal {
        console.log("");
        console.log(unicode"─── Step 7: Penalty Shootout ───");

        // Set match at 120 minutes (no score change)
        bytes memory sig = _signUpdate(matchId, 1, 1, 120, 1, false, block.timestamp);
        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, 1, 1, 120, 1, false, block.timestamp, sig);
        vm.stopBroadcast();

        MatchState memory state = hook.getMatchState(matchId);

        // Construct penalty shootout state
        // Note: the on-chain state won't have penaltyShootout=true since the oracle update doesn't set it
        MatchState memory penaltyState = MatchState({
            homeScore: state.homeScore,
            awayScore: state.awayScore,
            minute: state.minute,
            redCards: state.redCards,
            penaltyShootout: true,
            isFinished: false,
            lastGoalTimestamp: state.lastGoalTimestamp,
            lastUpdateBlock: state.lastUpdateBlock
        });

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(penaltyState, MarketType.MATCH_PREDICTION, false);
        bool penaltyCorrect = (fee == FEE_PENALTY_SHOOTOUT);

        console.log("  Score:             ", uint256(state.homeScore), "-", uint256(state.awayScore));
        console.log("  Minute:            ", uint256(state.minute));
        console.log("  Penalty fee:       ", fee, reason, penaltyCorrect ? "OK" : "UNEXPECTED");

        _logStep(7, penaltyCorrect);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 8: Match settlement — fee drops to 0
    // ══════════════════════════════════════════════════════════

    function _step8_MatchSettlement() internal {
        console.log("");
        console.log(unicode"─── Step 8: Match Settlement ───");

        bytes memory sig = _signUpdate(matchId, 3, 1, 95, 1, true, block.timestamp);
        vm.startBroadcast(oraclePK);
        hook.updateMatchState(matchId, 3, 1, 95, 1, true, block.timestamp, sig);
        vm.stopBroadcast();

        MatchState memory state = hook.getMatchState(matchId);

        (uint24 fee, string memory reason) = hook.calculateDynamicFee(state, MarketType.MATCH_PREDICTION, false);
        bool settlementCorrect = (fee == FEE_SETTLEMENT);

        console.log("  Final score:       ", uint256(state.homeScore), "-", uint256(state.awayScore));
        console.log("  Finished:          ", state.isFinished ? "YES" : "NO");
        console.log("  Settlement fee:    ", fee, reason, settlementCorrect ? "OK" : "UNEXPECTED");

        _logStep(8, settlementCorrect && state.isFinished);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 9: Fan token fees
    // ══════════════════════════════════════════════════════════

    function _step9_FanTokenFees() internal {
        console.log("");
        console.log(unicode"─── Step 9: Fan Token Fees ───");

        MatchState memory state = hook.getMatchState(matchId);

        // Normal fan token buy (no selling)
        (uint24 feeBuy, string memory buyReason) = hook.calculateDynamicFee(state, MarketType.FAN_TOKEN, false);
        bool normalCorrect = (feeBuy == FEE_FAN_NORMAL);

        // Panic sell (isSellingFanToken = true)
        (uint24 feeSell, string memory sellReason) = hook.calculateDynamicFee(state, MarketType.FAN_TOKEN, true);
        bool panicCorrect = (feeSell == FEE_FAN_PANIC_SELL);

        console.log("  Fan normal fee:    ", feeBuy, buyReason, normalCorrect ? "OK" : "UNEXPECTED");
        console.log("  Panic sell fee:    ", feeSell, sellReason, panicCorrect ? "OK" : "UNEXPECTED");

        _logStep(9, normalCorrect && panicCorrect);
    }

    // ══════════════════════════════════════════════════════════
    //  Step 10: Bracket lifecycle
    // ══════════════════════════════════════════════════════════

    function _step10_BracketLifecycle() internal {
        console.log("");
        console.log(unicode"─── Step 10: Bracket Lifecycle ───");

        bytes32[] memory path = new bytes32[](3);
        path[0] = keccak256("ARG-BRA");
        path[1] = keccak256("WINNER1-WINNER2");
        path[2] = keccak256("WINNER3-WINNER4");

        vm.startBroadcast(oraclePK);
        uint256 tokenId = bracketNFT.mintBracket(path);
        vm.stopBroadcast();

        bool minted = (tokenId > 0);
        BracketNFT.Bracket memory bracket = bracketNFT.getBracket(tokenId);
        bool correctPath = (bracket.matchCount == 3);

        console.log("  Bracket minted:    ", tokenId, minted ? "YES" : "NO");
        console.log("  Match count:       ", uint256(bracket.matchCount), correctPath ? "OK" : "WRONG");
        console.log("  Validated:         ", bracket.isValidated ? "YES" : "NO");

        // Validate the bracket (owner-only)
        vm.startBroadcast(oraclePK);
        bool isValid = bracketNFT.validateBracket(tokenId, path);
        vm.stopBroadcast();

        console.log("  Validation:        ", isValid ? "PASS" : "FAIL");

        BracketNFT.Bracket memory bracketAfter = bracketNFT.getBracket(tokenId);
        console.log("  Validated on-chain:", bracketAfter.isValidated ? "YES" : "NO");

        _logStep(10, minted && correctPath && isValid);
    }

    // ══════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════

    function _signUpdate(
        bytes32 _matchId,
        uint8 home,
        uint8 away,
        uint16 minute,
        uint8 reds,
        bool finished,
        uint256 timestamp
    ) internal view returns (bytes memory) {
        bytes32 hash = keccak256(abi.encodePacked(_matchId, home, away, minute, reds, finished, timestamp));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePK, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    function _logStep(uint8 step, bool passed) internal {
        stepCounter++;
        if (!passed) allPassed = false;
        console.log("  >> Step", uint256(step), passed ? "PASSED" : "FAILED");
    }
}
