# Chainlink Price Feeds on X Layer

> X Layer supports Chainlink Data Feeds for real-world asset pricing.
> GoalSwap uses these for: USDC/USD pricing, fan token valuation.

## How It Works

- **Deviation threshold**: Price change >0.5% triggers automatic feed update
- **Heartbeat threshold**: Feed updates every 3600s (1 hour) even if price is stable

## Feed Registry

Query any price feed using the Feed Registry contract:

| Network | Registry Address |
|---------|-----------------|
| Mainnet | `0xfe3240995c771f10D2583e8fa95F92ee40E15150` |
| Testnet | `0x038969dD2036270c22D9F5ABE840cd5CDC079848` |

## Feed Adapter Addresses

### Mainnet

| Feed | Address | Deviation | Heartbeat |
|------|---------|-----------|-----------|
| WBTC/USD | `0x3C7dCE5F83E99452CD399a1bCa5542BEd979E6CA` | 0.5% | 3600s |
| WETH/USD | `0x98ff91433c992153A8D6507cEA5b791Df69d7c99` | 0.5% | 3600s |
| OKB/USD | `0x90AB4bc4991c71889A67F25eec044fD90E255e77` | 0.5% | 3600s |
| USDT/USD | `0xB249978EfdB8E01D5266F926409870c1Ec7336EA` | 0.5% | 3600s |
| USDC/USD | `0xc975719d0ec39bb8880444acea9cc8d29a35e4d4` | 0.5% | 3600s |
| DAI/USD | `0x960cF115eeEAFBF5B184070DE9eD89593c712B71` | 0.5% | 3600s |

### Testnet

| Feed | Address | Deviation | Heartbeat |
|------|---------|-----------|-----------|
| WBTC/USD | `0x03e29fb6dbb5e0600ad062e5f80cf50e651571b3` | 0.5% | 3600s |
| WETH/USD | `0x258b77b31dF0eF3C2F1495152b81e305bD83Aab8` | 0.5% | 3600s |
| OKB/USD | `0x92ac502FC54356868C4EAc1B2eF0f941C2895dd0` | 0.5% | 3600s |
| USDT/USD | `0xA774557280A45E4433a1208f6E5c0dA718a84b7C` | 0.5% | 3600s |
| USDC/USD | `0xa8f52bbb506E0bD05253e007A46f6A1d8a4000cf` | 0.5% | 3600s |
| DAI/USD | `0x185919669101D4748423B3Ce7C07A0207e6d99e8` | 0.5% | 3600s |

## Solidity Usage

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt,
        uint256 updatedAt, uint80 answeredInRound
    );
}

contract GoalSwapPriceFeed {
    AggregatorV3Interface internal usdcFeed;

    // Testnet USDC/USD feed
    constructor() {
        usdcFeed = AggregatorV3Interface(0xa8f52bbb506E0bD05253e007A46f6A1d8a4000cf);
    }

    function getUSDCPrice() public view returns (int256) {
        (, int256 price, , , ) = usdcFeed.latestRoundData();
        return price; // 8 decimals (e.g., 100000000 = $1.00)
    }
}
```

## Using Feed Registry

```solidity
interface IFeedRegistry {
    function latestRoundData(address base, address quote)
        external view returns (uint80, int256, uint256, uint256, uint80);
}

contract PriceConsumer {
    IFeedRegistry internal registry;

    // Mainnet Feed Registry
    constructor() {
        registry = IFeedRegistry(0xfe3240995c771f10D2583e8fa95F92ee40E15150);
    }

    // Fiat address: USD = 0x0000000000000000000000000000000000000840
    function getWethUsdPrice() public view returns (int256) {
        (, int256 price, , , ) = registry.latestRoundData(
            0x5A77f1443D16ee5761d310e38b62f77f726bC71c,  // WETH
            address(840)  // USD ISO 4217
        );
        return price;
    }
}
```
