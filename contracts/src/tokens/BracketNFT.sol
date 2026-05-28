// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BracketNFT
/// @notice Transferable NFT representing a World Cup bracket prediction
/// @dev Users predict the match winners from Round of 16 to Final
contract BracketNFT is ERC721, Ownable, ReentrancyGuard {
    // ───── Structs ─────

    struct Bracket {
        bytes32[] predictedPath; // Ordered array of matchIds: R16 → QF → SF → F
        bytes32 predictionHash;  // Hash of the full path for verification
        uint256 stakeAmount;     // USDC staked on this bracket
        bool isValidated;        // Whether this bracket has been validated post-tournament
        bool isCorrect;          // Whether the bracket was correct
        uint256 creationTime;    // When the bracket was created
        uint256 matchCount;      // Number of matches in the path
    }

    // ───── State ─────

    /// @notice Next token ID
    uint256 private _nextTokenId;

    /// @notice Bracket data keyed by token ID
    mapping(uint256 => Bracket) public brackets;

    /// @notice User's bracket token IDs
    mapping(address => uint256[]) public userBrackets;

    /// @notice Tournament ID for this bracket
    bytes32 public tournamentId;

    /// @notice Base URI
    string private _baseTokenURI;

    /// @notice Maximum number of matches in a bracket path
    uint256 public constant MAX_PATH_LENGTH = 16; // R16 (8) + QF (4) + SF (2) + F (1) = 15

    // ───── Events ─────

    event BracketMinted(
        address indexed user,
        uint256 indexed tokenId,
        bytes32[] predictedPath,
        uint256 stakeAmount,
        uint256 matchCount
    );
    event BracketValidated(uint256 indexed tokenId, bool isCorrect);
    event TournamentSet(bytes32 indexed tournamentId);

    // ───── Constructor ─────

    constructor(bytes32 _tournamentId, string memory baseURI)
        ERC721("GoalSwap Bracket NFT", "GSBN")
        Ownable(msg.sender)
    {
        tournamentId = _tournamentId;
        _baseTokenURI = baseURI;
    }

    // ───── Minting ─────

    /// @notice Mint a new bracket NFT
    /// @param predictedPath Ordered array of match IDs for the bracket
    /// @return tokenId The minted bracket token ID
    function mintBracket(bytes32[] calldata predictedPath) external nonReentrant returns (uint256) {
        require(predictedPath.length > 0, "Path cannot be empty");
        require(predictedPath.length <= MAX_PATH_LENGTH, "Path too long");

        uint256 tokenId = ++_nextTokenId;

        // Store bracket data
        Bracket storage bracket = brackets[tokenId];
        for (uint256 i = 0; i < predictedPath.length; i++) {
            bracket.predictedPath.push(predictedPath[i]);
        }
        bracket.predictionHash = keccak256(abi.encodePacked(predictedPath));
        bracket.creationTime = block.timestamp;
        bracket.matchCount = predictedPath.length;

        // Mint NFT to user
        _safeMint(msg.sender, tokenId);
        userBrackets[msg.sender].push(tokenId);

        emit BracketMinted(msg.sender, tokenId, predictedPath, 0, predictedPath.length);
        return tokenId;
    }

    /// @notice Mint bracket with USDC stake (prize pool contribution)
    function mintBracketWithStake(bytes32[] calldata predictedPath, uint256 stakeAmount) external nonReentrant {
        require(stakeAmount > 0, "Stake must be > 0");

        uint256 tokenId = ++_nextTokenId;

        Bracket storage bracket = brackets[tokenId];
        for (uint256 i = 0; i < predictedPath.length; i++) {
            bracket.predictedPath.push(predictedPath[i]);
        }
        bracket.predictionHash = keccak256(abi.encodePacked(predictedPath));
        bracket.stakeAmount = stakeAmount;
        bracket.creationTime = block.timestamp;
        bracket.matchCount = predictedPath.length;

        _safeMint(msg.sender, tokenId);
        userBrackets[msg.sender].push(tokenId);

        emit BracketMinted(msg.sender, tokenId, predictedPath, stakeAmount, predictedPath.length);
    }

    // ───── Validation ─────

    /// @notice Validate bracket against actual results (owner/canonical oracle)
    /// @param tokenId The bracket token to validate
    /// @param actualPath The actual match winners
    /// @return isCorrect Whether prediction was correct
    function validateBracket(uint256 tokenId, bytes32[] calldata actualPath) external onlyOwner returns (bool) {
        Bracket storage bracket = brackets[tokenId];
        require(!bracket.isValidated, "Already validated");
        require(actualPath.length == bracket.matchCount, "Path length mismatch");

        bracket.isValidated = true;
        bracket.isCorrect = true;

        // Compare each prediction
        for (uint256 i = 0; i < bracket.matchCount; i++) {
            if (bracket.predictedPath[i] != actualPath[i]) {
                bracket.isCorrect = false;
                break;
            }
        }

        emit BracketValidated(tokenId, bracket.isCorrect);
        return bracket.isCorrect;
    }

    // ───── Queries ─────

    /// @notice Get bracket data for a token
    function getBracket(uint256 tokenId) external view returns (Bracket memory) {
        return brackets[tokenId];
    }

    /// @notice Get all brackets for a user
    function getUserBrackets(address user) external view returns (uint256[] memory) {
        return userBrackets[user];
    }

    /// @notice Get total brackets minted
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Get user's total brackets
    function getUserBracketCount(address user) external view returns (uint256) {
        return userBrackets[user].length;
    }

    /// @notice Check if user has any correct brackets
    function hasCorrectBracket(address user) external view returns (bool) {
        uint256[] storage tokens = userBrackets[user];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (brackets[tokens[i]].isValidated && brackets[tokens[i]].isCorrect) {
                return true;
            }
        }
        return false;
    }

    /// @notice Update tournament ID (admin)
    function setTournamentId(bytes32 _tournamentId) external onlyOwner {
        tournamentId = _tournamentId;
        emit TournamentSet(_tournamentId);
    }

    /// @notice Set base URI
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /// @notice Token URI
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
