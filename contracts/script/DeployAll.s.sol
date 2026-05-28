// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {WorldCupArenaHook} from "../src/hooks/WorldCupArenaHook.sol";
import {OutcomeTokenFactory} from "../src/tokens/OutcomeTokenFactory.sol";
import {GoalSwapTrophies} from "../src/tokens/GoalSwapTrophies.sol";
import {BracketNFT} from "../src/tokens/BracketNFT.sol";
import {FanToken} from "../src/tokens/FanToken.sol";
import {IWorldCupArenaHook} from "../src/interfaces/IWorldCupArenaHook.sol";
import {MockPoolManager} from "../src/mock/MockPoolManager.sol";
import {MockUSDC} from "../src/mock/MockUSDC.sol";

/// @title DeployAll
/// @notice Deploys all GoalSwap Arena contracts to X Layer testnet
/// @dev Set POOL_MANAGER and USDC_ADDRESS env vars for production; otherwise mocks are deployed
///
/// Usage:
///   # With real PoolManager (e.g., X Layer mainnet):
///   POOL_MANAGER=0x... USDC_ADDRESS=0x... ORACLE_ADDRESS=0x... \
///     forge script script/DeployAll.s.sol:DeployAll --rpc-url xlayer-testnet --broadcast
///
///   # With mocks (testnet without V4):
///   ORACLE_ADDRESS=0x... \
///     forge script script/DeployAll.s.sol:DeployAll --rpc-url xlayer-testnet --broadcast
contract DeployAll is Script {
    // Default X Layer mainnet USDC (used when USDC_ADDRESS env var is not set)
    address constant XLAYER_MAINNET_USDC = 0x74b7F16337b8972027F6196A17a631aC6dE26d22;

    // ── Deployment Configuration ──
    string constant TROPHIES_BASE_URI = "https://api.goalswap.xyz/metadata/trophies/";
    string constant BRACKET_BASE_URI = "https://api.goalswap.xyz/metadata/brackets/";

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("");
        console.log(unicode"══════════════════════════════════════════════");
        console.log(unicode"  GoalSwap Arena — Full Deployment");
        console.log(unicode"══════════════════════════════════════════════");
        console.log("Deployer:   ", deployer);
        console.log("Chain ID:   ", block.chainid);
        console.log("Block:      ", block.number);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ── Step 0: Determine USDC address ──
        address usdc;
        bool usdcFromEnv;
        if (vm.envExists("USDC_ADDRESS")) {
            usdc = vm.envAddress("USDC_ADDRESS");
            usdcFromEnv = true;
        } else if (block.chainid == 196) {
            usdc = XLAYER_MAINNET_USDC;
            usdcFromEnv = false;
        } else {
            // Deploy MockUSDC
            MockUSDC mockUsdc = new MockUSDC();
            usdc = address(mockUsdc);
            usdcFromEnv = false;
            console.log("[MOCK]    MockUSDC:        ", usdc);
        }
        console.log("USDC:         ", usdc, usdcFromEnv ? "(env)" : "(deployed/default)");

        // ── Step 1: Determine PoolManager ──
        address poolManager;
        bool pmIsMock = false;
        if (vm.envExists("POOL_MANAGER")) {
            poolManager = vm.envAddress("POOL_MANAGER");
            console.log("PoolManager:  ", poolManager, "(from env)");
        } else {
            MockPoolManager mockPm = new MockPoolManager();
            poolManager = address(mockPm);
            pmIsMock = true;
            console.log("[MOCK]    PoolManager:     ", poolManager);
        }

        // ── Step 2: Read Oracle address ──
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        console.log("Oracle:       ", oracleAddress);
        console.log("");

        IPoolManager manager = IPoolManager(poolManager);

        // ── Step 3: Deploy WorldCupArenaHook ──
        WorldCupArenaHook hook = new WorldCupArenaHook(manager, oracleAddress);
        console.log("[1/5]     WorldCupArenaHook:", address(hook));

        // ── Step 4: Deploy OutcomeTokenFactory ──
        OutcomeTokenFactory factory = new OutcomeTokenFactory(usdc, manager, IWorldCupArenaHook(address(hook)));
        console.log("[2/5]     OutcomeTokenFactory:", address(factory));

        // ── Step 5: Deploy GoalSwapTrophies ──
        GoalSwapTrophies trophies = new GoalSwapTrophies(address(hook), TROPHIES_BASE_URI);
        console.log("[3/5]     GoalSwapTrophies:  ", address(trophies));

        // Wire trophies into hook
        hook.setTrophiesAddress(address(trophies));
        console.log(unicode"          Trophies wired → hook.trophies() =", address(hook.trophies()));

        // Wire factory into hook (authorized to register pools)
        hook.setFactoryAddress(address(factory));
        console.log(unicode"          Factory wired → hook.factory() =", address(hook.factory()));

        // ── Step 6: Deploy BracketNFT ──
        bytes32 tournamentId = keccak256("WORLD_CUP_2026");
        BracketNFT bracketNFT = new BracketNFT(tournamentId, BRACKET_BASE_URI);
        console.log("[4/5]     BracketNFT:        ", address(bracketNFT));

        vm.stopBroadcast();

        // ── Deployment Summary ──
        console.log("");
        console.log(unicode"══════════════════════════════════════════════");
        console.log("  Deployment Summary");
        console.log(unicode"══════════════════════════════════════════════");
        console.log("Network:       X Layer", block.chainid == 196 ? "Mainnet" : block.chainid == 1952 ? "Testnet" : "Other");
        console.log("Chain ID:      ", block.chainid);
        console.log("Deployer:      ", deployer);
        console.log("");
        console.log("--- Contracts ---");
        console.log("WorldCupArenaHook: ", address(hook));
        console.log("OutcomeTokenFactory:", address(factory));
        console.log("GoalSwapTrophies:  ", address(trophies));
        console.log("BracketNFT:        ", address(bracketNFT));
        console.log("PoolManager:       ", poolManager, pmIsMock ? "(MOCK)" : "");
        console.log("USDC:              ", usdc);
        console.log("Oracle:            ", oracleAddress);
        console.log("");
        console.log("--- Verification ---");
        console.log("Trophies wired:    ", address(hook.trophies()) == address(trophies) ? "OK" : "FAIL");
        console.log("Tournament ID:     ");
        console.logBytes32(tournamentId);

        console.log("");
        console.log(unicode"══════════════════════════════════════════════");
        console.log("  To save addresses: deployment-addresses.txt");
        console.log(unicode"══════════════════════════════════════════════");
    }
}
