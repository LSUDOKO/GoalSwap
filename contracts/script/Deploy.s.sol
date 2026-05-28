// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {WorldCupArenaHook} from "../src/hooks/WorldCupArenaHook.sol";
import {OutcomeTokenFactory} from "../src/tokens/OutcomeTokenFactory.sol";
import {GoalSwapTrophies} from "../src/tokens/GoalSwapTrophies.sol";
import {BracketNFT} from "../src/tokens/BracketNFT.sol";
import {IWorldCupArenaHook} from "../src/interfaces/IWorldCupArenaHook.sol";

/// @title DeployScript
/// @notice Deploys all GoalSwap contracts to X Layer testnet
contract DeployScript is Script {
    // X Layer Testnet addresses
    address constant USDC = 0x74b7F16337b8972027F6196A17a631aC6dE26d22; // Same on mainnet

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Read required env vars — must be set before deployment
        address poolManager = vm.envAddress("POOL_MANAGER");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");

        console.log("Deploying GoalSwap Arena contracts...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("PoolManager:", poolManager);
        console.log("Oracle:", oracleAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy WorldCupArenaHook
        IPoolManager manager = IPoolManager(poolManager);
        WorldCupArenaHook hook = new WorldCupArenaHook(manager, oracleAddress);
        console.log("WorldCupArenaHook deployed at:", address(hook));

        // 2. Deploy OutcomeTokenFactory
        OutcomeTokenFactory factory = new OutcomeTokenFactory(USDC, manager, IWorldCupArenaHook(address(hook)));
        console.log("OutcomeTokenFactory deployed at:", address(factory));

        // 3. Deploy GoalSwapTrophies (depends on hook address)
        GoalSwapTrophies trophies = new GoalSwapTrophies(address(hook), "https://api.goalswap.xyz/metadata/trophies/");
        console.log("GoalSwapTrophies deployed at:", address(trophies));

        // 4. Wire trophies contract into the hook
        hook.setTrophiesAddress(address(trophies));
        console.log("Trophies contract wired into hook");

        // 5. Deploy BracketNFT
        bytes32 tournamentId = keccak256("WORLD_CUP_2026");
        BracketNFT bracketNFT = new BracketNFT(tournamentId, "https://api.goalswap.xyz/metadata/brackets/");
        console.log("BracketNFT deployed at:", address(bracketNFT));

        vm.stopBroadcast();

        // Write deployment summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("WorldCupArenaHook:", address(hook));
        console.log("OutcomeTokenFactory:", address(factory));
        console.log("GoalSwapTrophies:", address(trophies));
        console.log("BracketNFT:", address(bracketNFT));
        console.log("PoolManager:", poolManager);
        console.log("USDC:", USDC);
        console.log("Oracle:", oracleAddress);
        console.log("Trophies wired to hook:", address(trophies) == address(hook.trophies()));
        console.log("Tournament ID:");
        console.logBytes32(tournamentId);
    }
}
