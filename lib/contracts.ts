import { defineChain } from "viem";

export const xLayer = defineChain({
  id: 196,
  name: "X Layer Mainnet",
  nativeCurrency: { decimals: 18, name: "OKB", symbol: "OKB" },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "X Layer Explorer", url: "https://www.oklink.com/xlayer" },
  },
  contracts: {
    multicall3: { address: "0xca11bde05977b3631167028862be2a173976ca11", blockCreated: 47416 },
  },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { decimals: 18, name: "OKB", symbol: "OKB" },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "X Layer Testnet Explorer", url: "https://www.oklink.com/xlayer-test" },
  },
  contracts: {
    multicall3: { address: "0xca11bde05977b3631167028862be2a173976ca11", blockCreated: 0 },
  },
});

export const defaultChain = xLayerTestnet;

export const contracts = {
  hook: (process.env.NEXT_PUBLIC_HOOK_ADDRESS || "0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF") as `0x${string}`,
  outcomeFactory: (process.env.NEXT_PUBLIC_OUTCOME_FACTORY_ADDRESS || "0x2CD9fd3078932A9fbC8cA9384FA6a75536587022") as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x2ECDAcB97eE840da3391E63038D7E086129A13d5") as `0x${string}`,
  fanTokenLauncher: process.env.NEXT_PUBLIC_FAN_TOKEN_LAUNCHER as `0x${string}` | undefined,
  trophies: (process.env.NEXT_PUBLIC_TROPHIES_ADDRESS || "0x6788921d3d3956C10554f1aEc8d9d4B279c9A735") as `0x${string}`,
  bracketNft: (process.env.NEXT_PUBLIC_BRACKET_NFT_ADDRESS || "0xE3fD44B189F481E0FBE887b0F0dE938d4107D9F3") as `0x${string}`,
  poolManager: (process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || "0x0Bf02B5765dBbC15b5C1b56412Fc73e70F782564") as `0x${string}`,
};

export const hookAbi = [
  {
    type: "function",
    name: "matchStates",
    inputs: [{ name: "matchId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "homeScore", type: "uint8", internalType: "uint8" },
      { name: "awayScore", type: "uint8", internalType: "uint8" },
      { name: "minute", type: "uint16", internalType: "uint16" },
      { name: "redCards", type: "uint8", internalType: "uint8" },
      { name: "penaltyShootout", type: "bool", internalType: "bool" },
      { name: "isFinished", type: "bool", internalType: "bool" },
      { name: "lastGoalTimestamp", type: "uint256", internalType: "uint256" },
      { name: "lastUpdateBlock", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMatchState",
    inputs: [{ name: "matchId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "", type: "tuple", internalType: "struct MatchState", components: [
        { name: "homeScore", type: "uint8" },
        { name: "awayScore", type: "uint8" },
        { name: "minute", type: "uint16" },
        { name: "redCards", type: "uint8" },
        { name: "penaltyShootout", type: "bool" },
        { name: "isFinished", type: "bool" },
        { name: "lastGoalTimestamp", type: "uint256" },
        { name: "lastUpdateBlock", type: "uint256" },
      ]},
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentFee",
    inputs: [{ name: "key", type: "tuple", internalType: "struct PoolKey", components: [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickSpacing", type: "int24" },
      { name: "hooks", type: "address" },
    ]}],
    outputs: [
      { name: "fee", type: "uint24" },
      { name: "reason", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "oracle",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "matchExists",
    inputs: [{ name: "matchId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const;

export const outcomeTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isSettled",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isWinner",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeem",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export const trophiesAbi = [
  {
    type: "function",
    name: "hasTier",
    inputs: [
      { name: "user", type: "address" },
      { name: "tier", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userTierCount",
    inputs: [
      { name: "user", type: "address" },
      { name: "tier", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalMinted",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const bracketNftAbi = [
  {
    type: "function",
    name: "getUserBrackets",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBracket",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "predictedPath", type: "bytes32[]" },
      { name: "predictionHash", type: "bytes32" },
      { name: "stakeAmount", type: "uint256" },
      { name: "isValidated", type: "bool" },
      { name: "isCorrect", type: "bool" },
      { name: "creationTime", type: "uint256" },
      { name: "matchCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalMinted",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintBracket",
    inputs: [{ name: "predictedPath", type: "bytes32[]" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

export const fanTokenAbi = [
  {
    type: "function",
    name: "getCurrentPrice",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBondingCurveProgress",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalMinted",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buy",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const poolManagerAbi = [
  {
    type: "function",
    name: "simulateSwap",
    inputs: [
      { name: "tokenIn", type: "address", internalType: "address" },
      { name: "tokenOut", type: "address", internalType: "address" },
      { name: "amountIn", type: "uint256", internalType: "uint256" },
      { name: "amountOut", type: "uint256", internalType: "uint256" },
      { name: "fee", type: "uint24", internalType: "uint24" },
    ],
    outputs: [{ name: "swapId", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getUserSwapCount",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserSwapIds",
    inputs: [
      { name: "user", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapRecords",
    inputs: [{ name: "swapId", type: "bytes32" }],
    outputs: [
      { name: "user", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOut", type: "uint256" },
      { name: "fee", type: "uint24" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

export const USDC_DECIMALS = 6;

/** Fee tiers matching WorldCupArenaHook constants */
export const FEE_TIERS = {
  SETTLEMENT: 0,
  KICKOFF: 3000,        // 0.3%
  NORMAL: 10000,         // 1.0%
  POST_GOAL: 30000,      // 3.0%
  HIGH_VOLATILITY: 50000, // 5.0%
  PENALTY_SHOOTOUT: 100000, // 10.0%
} as const;

/** Format fee as human-readable percentage */
export function formatFeePct(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}


