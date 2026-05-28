/**
 * GoalSwap Oracle — BlockchainWriter
 *
 * Uses viem to call `updateMatchState()` on the WorldCupArenaHook contract.
 * Handles:
 *  - Nonce management for high-frequency updates (multiple goals in quick succession)
 *  - Gas strategy: estimateGas + 20% buffer
 *  - Transaction queue with 2-second spacing to avoid nonce collisions
 *  - Retry logic with exponential backoff
 *  - Full logging of every tx
 */

import { createWalletClient, http, publicActions, type Hash, type Account, keccak256, encodePacked, toBytes, concat, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";
import type { MatchState } from "./types.js";

/** Minimal ABI for the hook contract functions we need */
const HOOK_ABI = [
  {
    type: "function",
    name: "updateMatchState",
    inputs: [
      { name: "matchId", type: "bytes32", internalType: "bytes32" },
      { name: "homeScore", type: "uint8", internalType: "uint8" },
      { name: "awayScore", type: "uint8", internalType: "uint8" },
      { name: "minute", type: "uint16", internalType: "uint16" },
      { name: "redCards", type: "uint8", internalType: "uint8" },
      { name: "isFinished", type: "bool", internalType: "bool" },
      { name: "timestamp", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable" as const,
  },
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
    stateMutability: "view" as const,
  },
] as const;

/** X Layer testnet chain definition */
const X_LAYER_TESTNET = {
  id: config.chain.chainId,
  name: "X Layer Testnet",
  rpcUrls: {
    default: { http: [config.chain.rpcUrl] },
    public: { http: [config.chain.rpcUrl] },
  },
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
} as const;

export interface TxLogEntry {
  matchId: string;
  oldState: MatchState;
  newState: MatchState;
  txHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface QueueJob {
  matchId: string;
  oldState: MatchState;
  newState: MatchState;
  resolve: (log: TxLogEntry) => void;
  reject: (err: Error) => void;
}

export class BlockchainWriter {
  private walletClient: ReturnType<typeof createWalletClient> & ReturnType<typeof publicActions> | null = null;
  private account: Account | null = null;
  private txQueue: QueueJob[] = [];
  private processing = false;
  private nonce: bigint | undefined;
  private logs: TxLogEntry[] = [];
  private isDryRun: boolean;

  constructor() {
    const privateKey = config.oracle.privateKey;
    this.isDryRun = !privateKey || !config.contracts.hook;

    if (this.isDryRun) {
      console.warn("[BlockchainWriter] No ORACLE_PRIVATE_KEY or HOOK_CONTRACT — running in dry-run mode");
      return;
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: X_LAYER_TESTNET,
      transport: http(config.chain.rpcUrl),
    }).extend(publicActions);
  }

  /**
   * Queue a match state update to the hook contract.
   * Returns a promise that resolves with the tx log on success.
   */
  async queueUpdate(
    matchId: string,
    oldState: MatchState,
    newState: MatchState,
  ): Promise<TxLogEntry> {
    return new Promise((resolve, reject) => {
      this.txQueue.push({
        matchId,
        oldState,
        newState,
        resolve,
        reject,
      });
      this._processQueue();
    });
  }

  /**
   * Read current on-chain match state from the hook contract.
   */
  async readMatchState(matchId: string): Promise<MatchState | null> {
    if (!this.walletClient) return null;

    try {
      const result = await this.walletClient.readContract({
        address: config.contracts.hook as `0x${string}`,
        abi: HOOK_ABI,
        functionName: "matchStates",
        args: [matchId as `0x${string}`],
      });

      return {
        homeScore: result[0],
        awayScore: result[1],
        minute: result[2],
        redCards: result[3],
        penaltyShootout: result[4],
        isFinished: result[5],
        lastGoalTimestamp: Number(result[6]),
        lastUpdateBlock: Number(result[7]),
      };
    } catch (err) {
      console.warn(`[BlockchainWriter] Failed to read on-chain state for ${matchId}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Get all transaction logs.
   */
  getLogs(): TxLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get recent transaction log count (for health checks).
   */
  getTxCount(): number {
    return this.logs.length;
  }

  /**
   * Get the current nonce.
   */
  async getNonce(): Promise<bigint> {
    if (!this.walletClient || !this.account) return BigInt(0);
    if (this.nonce === undefined) {
      const count = await this.walletClient.getTransactionCount({ address: this.account.address });
      this.nonce = BigInt(count);
    }
    return this.nonce!;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — Queue Processing
  // ═══════════════════════════════════════════════════════════════

  private async _processQueue(): Promise<void> {
    if (this.processing || this.txQueue.length === 0) return;
    this.processing = true;

    while (this.txQueue.length > 0) {
      const job = this.txQueue.shift()!;
      try {
        const log = await this._sendTx(job);
        job.resolve(log);
      } catch (err) {
        job.reject(err as Error);
      }

      if (this.txQueue.length > 0) {
        await this._sleep(config.blockchain.txSpacingMs);
      }
    }

    this.processing = false;
  }

  /**
   * Send a single transaction with gas estimation and retries.
   * Generates an EIP-191 oracle signature matching the hook's verifyOracleSignature.
   */
  private async _sendTx(job: QueueJob): Promise<TxLogEntry> {
    if (this.isDryRun) {
      console.log(`[BlockchainWriter][DRY-RUN] Update match ${job.matchId.slice(0, 10)}... ` +
        `Score: ${job.oldState.homeScore}-${job.oldState.awayScore} → ${job.newState.homeScore}-${job.newState.awayScore} ` +
        `Minute: ${job.oldState.minute} → ${job.newState.minute} ` +
        `Finished: ${job.oldState.isFinished} → ${job.newState.isFinished}`);

      return {
        matchId: job.matchId,
        oldState: job.oldState,
        newState: job.newState,
        txHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash,
        blockNumber: BigInt(0),
        timestamp: Date.now(),
        success: true,
      };
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.blockchain.maxRetries; attempt++) {
      try {
        const nonce = await this.getNonce();

        // ── Generate EIP-191 oracle signature ──
        // The hook computes: keccak256(abi.encodePacked(matchId, homeScore, awayScore, minute, redCards, isFinished, timestamp))
        // Then: toEthSignedMessageHash(hash) = keccak256("\x19Ethereum Signed Message:\n32" + hash)
        // We must match exactly.
        const timestamp = BigInt(Math.floor(Date.now() / 1000));
        const messageHash = keccak256(
          encodePacked(
            ['bytes32', 'uint8', 'uint8', 'uint16', 'uint8', 'bool', 'uint256'] as const,
            [job.matchId as `0x${string}`, job.newState.homeScore, job.newState.awayScore, job.newState.minute, job.newState.redCards, job.newState.isFinished, timestamp],
          )
        );
        // Compute EIP-191 ethSignedHash: keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
        // This matches the hook's toEthSignedMessageHash(messageHash)
        const ethSignedHash = keccak256(
          concat([
            stringToHex("\x19Ethereum Signed Message:\n32"),
            messageHash,
          ])
        );
        const oracleAccount = this.account! as { sign: (params: { hash: Hash }) => Promise<Hash> };
        const signature = await oracleAccount.sign({ hash: ethSignedHash });

        const args = [
          job.matchId as `0x${string}`,
          job.newState.homeScore,
          job.newState.awayScore,
          job.newState.minute,
          job.newState.redCards,
          job.newState.isFinished,
          timestamp,
          signature,
        ] as const;

        const gasEstimate = await this.walletClient!.estimateContractGas({
          address: config.contracts.hook as `0x${string}`,
          abi: HOOK_ABI,
          functionName: "updateMatchState",
          args,
          account: this.account!,
        });

        const gasLimit = (gasEstimate * BigInt(100 + config.blockchain.gasBufferPercent)) / BigInt(100);

        const txHash = await this.walletClient!.writeContract({
          address: config.contracts.hook as `0x${string}`,
          abi: HOOK_ABI,
          functionName: "updateMatchState",
          args,
          account: this.account!,
          chain: X_LAYER_TESTNET,
          gas: gasLimit,
          nonce: Number(nonce),
        });

        const receipt = await this.walletClient!.waitForTransactionReceipt({ hash: txHash });

        const log: TxLogEntry = {
          matchId: job.matchId,
          oldState: job.oldState,
          newState: job.newState,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          timestamp: Date.now(),
          success: receipt.status === "success",
        };

        this.nonce = (this.nonce ?? nonce) + 1n;
        this.logs.push(log);
        console.log(`[BlockchainWriter] ✅ Match ${job.matchId.slice(0, 10)}... updated: tx=${txHash.slice(0, 10)}... block=${receipt.blockNumber}`);
        return log;

      } catch (err) {
        lastError = err as Error;
        console.warn(`[BlockchainWriter] Attempt ${attempt}/${config.blockchain.maxRetries} failed:`, (err as Error).message);

        if (attempt < config.blockchain.maxRetries) {
          await this._sleep(config.blockchain.retryDelayMs * attempt);
          this.nonce = undefined;
        }
      }
    }

    const errorLog: TxLogEntry = {
      matchId: job.matchId,
      oldState: job.oldState,
      newState: job.newState,
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash,
      blockNumber: BigInt(0),
      timestamp: Date.now(),
      success: false,
      error: lastError?.message,
    };

    this.logs.push(errorLog);
    console.error(`[BlockchainWriter] ❌ Failed after ${config.blockchain.maxRetries} attempts:`, lastError?.message);
    throw lastError ?? new Error("Unknown error");
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
