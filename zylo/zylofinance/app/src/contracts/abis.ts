export const ERC20_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const ZYLO_VAULT_ABI = [
  {
    inputs: [],
    name: 'depositFLR',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'withdrawFLR',
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'asset',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * FDC `Payment` attestation response, matching IPayment.Proof. The DA layer hands
 * back `response_hex` (the Response struct) plus a merkle proof; both are recombined
 * into this shape before being passed to `executeMinting`.
 */
export const PAYMENT_RESPONSE_COMPONENTS = [
  { name: 'attestationType', type: 'bytes32' },
  { name: 'sourceId', type: 'bytes32' },
  { name: 'votingRound', type: 'uint64' },
  { name: 'lowestUsedTimestamp', type: 'uint64' },
  {
    name: 'requestBody',
    type: 'tuple',
    components: [
      { name: 'transactionId', type: 'bytes32' },
      { name: 'inUtxo', type: 'uint256' },
      { name: 'utxo', type: 'uint256' },
    ],
  },
  {
    name: 'responseBody',
    type: 'tuple',
    components: [
      { name: 'blockNumber', type: 'uint64' },
      { name: 'blockTimestamp', type: 'uint64' },
      { name: 'sourceAddressHash', type: 'bytes32' },
      { name: 'sourceAddressesRoot', type: 'bytes32' },
      { name: 'receivingAddressHash', type: 'bytes32' },
      { name: 'intendedReceivingAddressHash', type: 'bytes32' },
      { name: 'spentAmount', type: 'int256' },
      { name: 'intendedSpentAmount', type: 'int256' },
      { name: 'receivedAmount', type: 'int256' },
      { name: 'intendedReceivedAmount', type: 'int256' },
      { name: 'standardPaymentReference', type: 'bytes32' },
      { name: 'oneToOne', type: 'bool' },
      { name: 'status', type: 'uint8' },
    ],
  },
] as const;

export const ASSET_MANAGER_ABI = [
  {
    inputs: [{ name: 'lots', type: 'uint256' }],
    name: 'collateralReservationFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'lots', type: 'uint256' },
      { name: 'maxMintingFeeBIPS', type: 'uint256' },
      { name: 'executor', type: 'address' },
    ],
    name: 'reserveCollateral',
    outputs: [{ name: 'collateralReservationId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        name: '_payment',
        type: 'tuple',
        components: [
          { name: 'merkleProof', type: 'bytes32[]' },
          { name: 'data', type: 'tuple', components: PAYMENT_RESPONSE_COMPONENTS },
        ],
      },
      { name: '_collateralReservationId', type: 'uint256' },
    ],
    name: 'executeMinting',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_lots', type: 'uint256' },
      { name: '_redeemerUnderlyingAddressString', type: 'string' },
      { name: '_executor', type: 'address' },
    ],
    name: 'redeem',
    outputs: [{ name: '_redeemedAmountUBA', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fAsset',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lotSize',
    outputs: [{ name: '_lotSizeUBA', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'start', type: 'uint256' },
      { name: 'end', type: 'uint256' },
    ],
    name: 'getAvailableAgentsDetailedList',
    outputs: [
      {
        name: '_agents',
        type: 'tuple[]',
        components: [
          { name: 'agentVault', type: 'address' },
          { name: 'ownerManagementAddress', type: 'address' },
          { name: 'feeBIPS', type: 'uint256' },
          { name: 'mintingVaultCollateralRatioBIPS', type: 'uint256' },
          { name: 'mintingPoolCollateralRatioBIPS', type: 'uint256' },
          { name: 'freeCollateralLots', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
      { name: '_totalLength', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentVault', type: 'address' }],
    name: 'getAgentInfo',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'status', type: 'uint8' },
          { name: 'ownerManagementAddress', type: 'address' },
          { name: 'ownerWorkAddress', type: 'address' },
          { name: 'collateralPool', type: 'address' },
          { name: 'collateralPoolToken', type: 'address' },
          { name: 'underlyingAddressString', type: 'string' },
          { name: 'publiclyAvailable', type: 'bool' },
          { name: 'feeBIPS', type: 'uint256' },
          { name: 'poolFeeShareBIPS', type: 'uint256' },
          { name: 'vaultCollateralToken', type: 'address' },
          { name: 'mintingVaultCollateralRatioBIPS', type: 'uint256' },
          { name: 'mintingPoolCollateralRatioBIPS', type: 'uint256' },
          { name: 'freeCollateralLots', type: 'uint256' },
          { name: 'totalVaultCollateralWei', type: 'uint256' },
          { name: 'freeVaultCollateralWei', type: 'uint256' },
          { name: 'vaultCollateralRatioBIPS', type: 'uint256' },
          { name: 'poolWNatToken', type: 'address' },
          { name: 'totalPoolCollateralNATWei', type: 'uint256' },
          { name: 'freePoolCollateralNATWei', type: 'uint256' },
          { name: 'poolCollateralRatioBIPS', type: 'uint256' },
          { name: 'totalAgentPoolTokensWei', type: 'uint256' },
          { name: 'announcedVaultCollateralWithdrawalWei', type: 'uint256' },
          { name: 'announcedPoolTokensWithdrawalWei', type: 'uint256' },
          { name: 'freeAgentPoolTokensWei', type: 'uint256' },
          { name: 'mintedUBA', type: 'uint256' },
          { name: 'reservedUBA', type: 'uint256' },
          { name: 'redeemingUBA', type: 'uint256' },
          { name: 'poolRedeemingUBA', type: 'uint256' },
          { name: 'dustUBA', type: 'uint256' },
          { name: 'liquidationStartTimestamp', type: 'uint256' },
          { name: 'maxLiquidationAmountUBA', type: 'uint256' },
          { name: 'liquidationPaymentFactorVaultBIPS', type: 'uint256' },
          { name: 'liquidationPaymentFactorPoolBIPS', type: 'uint256' },
          { name: 'underlyingBalanceUBA', type: 'int256' },
          { name: 'requiredUnderlyingBalanceUBA', type: 'uint256' },
          { name: 'freeUnderlyingBalanceUBA', type: 'int256' },
          { name: 'announcedUnderlyingWithdrawalId', type: 'uint256' },
          { name: 'buyFAssetByAgentFactorBIPS', type: 'uint256' },
          { name: 'poolExitCollateralRatioBIPS', type: 'uint256' },
          { name: 'redemptionPoolFeeShareBIPS', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'agentVault', type: 'address' },
      { indexed: true, name: 'minter', type: 'address' },
      { indexed: true, name: 'collateralReservationId', type: 'uint256' },
      { indexed: false, name: 'valueUBA', type: 'uint256' },
      { indexed: false, name: 'feeUBA', type: 'uint256' },
      { indexed: false, name: 'firstUnderlyingBlock', type: 'uint256' },
      { indexed: false, name: 'lastUnderlyingBlock', type: 'uint256' },
      { indexed: false, name: 'lastUnderlyingTimestamp', type: 'uint256' },
      { indexed: false, name: 'paymentAddress', type: 'string' },
      { indexed: false, name: 'paymentReference', type: 'bytes32' },
      { indexed: false, name: 'executor', type: 'address' },
      { indexed: false, name: 'executorFeeNatWei', type: 'uint256' },
    ],
    name: 'CollateralReserved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'agentVault', type: 'address' },
      { indexed: true, name: 'redeemer', type: 'address' },
      { indexed: true, name: 'requestId', type: 'uint256' },
      { indexed: false, name: 'paymentAddress', type: 'string' },
      { indexed: false, name: 'valueUBA', type: 'uint256' },
      { indexed: false, name: 'feeUBA', type: 'uint256' },
      { indexed: false, name: 'firstUnderlyingBlock', type: 'uint256' },
      { indexed: false, name: 'lastUnderlyingBlock', type: 'uint256' },
      { indexed: false, name: 'lastUnderlyingTimestamp', type: 'uint256' },
      { indexed: false, name: 'paymentReference', type: 'bytes32' },
      { indexed: false, name: 'executor', type: 'address' },
      { indexed: false, name: 'executorFeeNatWei', type: 'uint256' },
    ],
    name: 'RedemptionRequested',
    type: 'event',
  },
] as const;

export const REGISTRY_ABI = [
  {
    inputs: [{ name: '_name', type: 'string' }],
    name: 'getContractAddressByName',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const FDC_HUB_ABI = [
  {
    inputs: [{ name: '_data', type: 'bytes' }],
    name: 'requestAttestation',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const FDC_FEE_ABI = [
  {
    inputs: [{ name: '_data', type: 'bytes' }],
    name: 'getRequestFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const FLARE_SYSTEMS_MANAGER_ABI = [
  {
    inputs: [],
    name: 'getCurrentVotingEpochId',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const RELAY_ABI = [
  {
    inputs: [
      { name: '_protocolId', type: 'uint256' },
      { name: '_votingRoundId', type: 'uint256' },
    ],
    name: 'isFinalized',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const DARK_POOL_ABI = [
  {
    inputs: [],
    name: 'depositNative',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'enclaveIsLive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rootEpoch',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastRootAt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'custody',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
