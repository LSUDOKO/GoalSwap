// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GoalSwapTrophies
/// @notice Soulbound trophies (SBTs) earned for trading achievements — non-transferable
/// @dev Inherits ERC-721 with transfer blocked. Only WorldCupArenaHook can mint.
contract GoalSwapTrophies is ERC721, Ownable, ReentrancyGuard {
    // ───── Trophy Tier Data ─────

    struct TrophyInfo {
        string name;
        string description;
        uint256 threshold;
        bool exists;
    }

    /// @notice Number of trophy tiers
    uint256 public constant TIER_COUNT = 5;

    /// @notice Fixed tier definitions
    /// Tier 1: Lightning Reflex — Traded within 60s of a goal
    /// Tier 2: Bronze Nostradamus — 1 correct upset prediction
    /// Tier 3: Silver Prophet — 5 correct in-play trades
    /// Tier 4: Golden Ball Trader — Predicted tournament winner
    /// Tier 5: Arena Legend — Top 100 on all-time leaderboard

    // ───── State ─────

    /// @notice Next token ID
    uint256 private _nextTokenId;

    /// @notice Hook contract authorized to mint
    address public immutable hook;

    /// @notice Token ID counter per user per tier
    mapping(address => mapping(uint256 => uint256)) public userTierCount;

    /// @notice Tier metadata
    mapping(uint256 => TrophyInfo) public tierInfo;

    /// @notice Base URI for token metadata
    string private _baseTokenURI;

    // ───── Events ─────

    event TrophyMinted(address indexed user, uint256 indexed tier, uint256 indexed tokenId, bytes32 matchId);
    event TierUpdated(uint256 indexed tier, string name, string description, uint256 threshold);

    // ───── Modifiers ─────

    modifier onlyHook() {
        require(msg.sender == hook, "Only hook can mint");
        _;
    }

    // ───── Constructor ─────

    constructor(address _hook, string memory baseURI) ERC721("GoalSwap Trophies", "GST") Ownable(msg.sender) {
        hook = _hook;
        _baseTokenURI = baseURI;

        // Initialize tier definitions
        tierInfo[1] = TrophyInfo("Lightning Reflex", "Traded within 60 seconds of a goal being scored", 0, true);
        tierInfo[2] = TrophyInfo("Bronze Nostradamus", "Correctly predicted a match upset", 1, true);
        tierInfo[3] = TrophyInfo("Silver Prophet", "Made 5 correct in-play trades", 5, true);
        tierInfo[4] = TrophyInfo("Golden Ball Trader", "Predicted the tournament winner correctly", 0, true);
        tierInfo[5] = TrophyInfo("Arena Legend", "Ranked in the top 100 on the all-time leaderboard", 0, true);
    }

    // ───── Minting ─────

    /// @notice Mint a trophy to a user (hook-only)
    /// @param to Recipient address
    /// @param tier Trophy tier (1-5)
    /// @param matchId Associated match ID
    /// @return tokenId The minted token ID
    function mintTrophy(address to, uint256 tier, bytes32 matchId) external onlyHook nonReentrant returns (uint256) {
        require(tier >= 1 && tier <= TIER_COUNT, "Invalid tier");
        require(tierInfo[tier].exists, "Tier not found");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        userTierCount[to][tier]++;

        emit TrophyMinted(to, tier, tokenId, matchId);
        return tokenId;
    }

    /// @notice Batch mint trophies for multiple achievements
    function batchMintTrophies(
        address[] calldata recipients,
        uint256[] calldata tiers,
        bytes32[] calldata matchIds
    ) external onlyHook nonReentrant {
        require(recipients.length == tiers.length && tiers.length == matchIds.length, "Array length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = ++_nextTokenId;
            _safeMint(recipients[i], tokenId);
            userTierCount[recipients[i]][tiers[i]]++;
            emit TrophyMinted(recipients[i], tiers[i], tokenId, matchIds[i]);
        }
    }

    // ───── Soulbound Override ─────

    /// @notice Block all transfers — trophies are soulbound
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0))
        if (from != address(0)) {
            revert("Soulbound: non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    // ───── Admin ─────

    /// @notice Update tier metadata
    function updateTier(uint256 tier, string calldata name, string calldata description, uint256 threshold)
        external
        onlyOwner
    {
        tierInfo[tier] = TrophyInfo(name, description, threshold, true);
        emit TierUpdated(tier, name, description, threshold);
    }

    /// @notice Set base URI for metadata
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // ───── Queries ─────

    /// @notice Get total trophies minted
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Get the number of distinct tiers a user has
    function userTierCountDistinct(address user) external view returns (uint256) {
        uint256 count;
        for (uint256 i = 1; i <= TIER_COUNT; i++) {
            if (userTierCount[user][i] > 0) count++;
        }
        return count;
    }

    /// @notice Check if a user has a specific tier
    function hasTier(address user, uint256 tier) external view returns (bool) {
        return userTierCount[user][tier] > 0;
    }

    /// @notice Token URI for metadata
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId)));
    }

    // ───── Internal ─────

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
