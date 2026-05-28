.PHONY: build test test-lifecycle deploy-testnet deploy-mainnet deploy-mocks addresses clean

# ═══════════════════════════════════════
#  GoalSwap Arena — Contract Commands
# ═══════════════════════════════════════

# ── Build ──
build:
	forge build

# ── Test ──
test: build
	forge test -vvv

test-lifecycle: build
	forge test --match-test test_Step -vvv

test-gas: build
	forge test --gas-report

# ── Deploy to X Layer Testnet (chain 1952) ──
# Deploys MockPoolManager + MockUSDC if POOL_MANAGER/USDC_ADDRESS env vars are not set
deploy-testnet:
	@echo "Deploying to X Layer Testnet..."
	@test -n "$(DEPLOYER_PRIVATE_KEY)" || (echo "ERROR: DEPLOYER_PRIVATE_KEY not set"; exit 1)
	@test -n "$(ORACLE_ADDRESS)" || (echo "ERROR: ORACLE_ADDRESS not set"; exit 1)
	forge script script/DeployAll.s.sol:DeployAll \
		--rpc-url xlayer-testnet \
		--broadcast \
		--verify \
		-vvvv

# ── Deploy to X Layer Mainnet (chain 196) ──
# Requires POOL_MANAGER and USDC_ADDRESS env vars
deploy-mainnet:
	@echo "Deploying to X Layer Mainnet..."
	@test -n "$(DEPLOYER_PRIVATE_KEY)" || (echo "ERROR: DEPLOYER_PRIVATE_KEY not set"; exit 1)
	@test -n "$(ORACLE_ADDRESS)" || (echo "ERROR: ORACLE_ADDRESS not set"; exit 1)
	@test -n "$(POOL_MANAGER)" || (echo "ERROR: POOL_MANAGER not set (use: 0x360e68faccca8ca495c1b759fd9eee466db9fb32)"; exit 1)
	@test -n "$(USDC_ADDRESS)" || (echo "ERROR: USDC_ADDRESS not set (use: 0x74b7F16337b8972027F6196A17a631aC6dE26d22)"; exit 1)
	forge script script/DeployAll.s.sol:DeployAll \
		--rpc-url xlayer-mainnet \
		--broadcast \
		--verify \
		-vvvv

# ── Deploy only mocks (for local development ──
deploy-mocks:
	forge script script/DeployAll.s.sol:DeployAll \
		--rpc-url http://localhost:8545 \
		--broadcast \
		-vvvv

# ── Show deployed addresses ──
addresses:
	@cat deployment-addresses.txt 2>/dev/null || echo "No deployment-addresses.txt found. Run deploy first."

# ── Clean ──
clean:
	forge clean
	rm -f deployment-addresses.txt
