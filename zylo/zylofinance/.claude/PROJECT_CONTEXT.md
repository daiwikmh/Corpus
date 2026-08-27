# Zylo Finance - DeFi Application on Flare Network

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Blockchain**: Flare Network (Coston2 Testnet - Chain ID: 114)
- **Smart Account**: Etherspot Prime SDK (Account Abstraction)
- **Wallet**: wagmi + Web3Auth Modal
- **Oracle**: FtsoV2 (Flare Time Series Oracle v2)
- **Styling**: CSS with CSS variables, inline styles for Portfolio card

## Key Features Implemented

### 1. Dashboard (/dashboard)
- **Portfolio Card** - Shows aggregated portfolio value with live price feeds
  - Displays C2FLR (native token), USDT0, and FXRP balances
  - Fetches balances from both EOA wallet AND Smart Account
  - Uses FtsoV2 oracle for real-time prices (XRP/USD, FLR/USD)
  - Auto-refreshes every 30 seconds
  - Styled with inline styles (CSS not loading issue workaround)

- **Wallet Balance KPI** - Single KPI card showing native C2FLR balance
- **Revenue Chart** - Mock chart visualization (placeholder data)
- **SendReceive Card** (Right Sidebar) - Smart Account transactions
  - Send transactions via Smart Account (ERC-4337)
  - Displays Smart Account address
  - Shows balance from Smart Account
  - UserOperations for gasless transactions

### 2. Routes Structure
```
/app/(app)/              # Route group with shared Sidebar layout
  ├── dashboard/         # Main dashboard (implemented)
  ├── analytics/         # Placeholder
  ├── wallet/            # Placeholder
  ├── send/              # Placeholder
  ├── swap/              # Placeholder
  ├── history/           # Placeholder
  └── settings/          # Placeholder
```

## Important Configuration Files

### FtsoV2 Config (app/src/config/ftsoV2.config.ts)
```
FTSOV2_ADDRESS: "0x3d893C53D9e8056135C26C8c638B76C8b60Df726"
RPC_URL: "https://coston2-api.flare.network/ext/C/rpc"

TOKENS:
  - USDT0: 0xC1A5B41512496B80903D1f32d6dEa3a73212E71F
  - FXRP: 0x0b6A3645c240605887a5532109323A3E12273dc7

FEED_IDS:
  - XRP/USD: 0x015852502f55534400000000000000000000000000
  - FLR/USD: 0x01464c522f55534400000000000000000000000000
```

## Key Components

### Portfolio Service (app/src/services/portfolioService.ts)
- Fetches token balances using ethers.js
- Queries FtsoV2 for price feeds
- Calculates USD values for C2FLR, USDT0, and FXRP
- Returns aggregated data for both EOA and Smart Account
- **IMPORTANT**: Decimals are fetched dynamically from contracts (not hardcoded)

### Portfolio Value Component (app/src/components/dashboard/PortfolioValue.tsx)
- Uses wagmi hooks (useAccount, useConnectorClient)
- Initializes Etherspot Prime SDK for Smart Account
- Fetches and displays total portfolio value
- Shows breakdown by asset (C2FLR, USDT0, FXRP)
- **IMPORTANT**: Uses inline styles because CSS wasn't loading initially

### SendReceive Card (app/src/components/widgets/SendReceiveCard.tsx)
- Smart Account transactions using Etherspot Prime SDK
- Send tab: Create and send UserOperations
- Receive tab: Display Smart Account address with copy function
- Shows balance from Smart Account (not EOA)
- **IMPORTANT**: Transactions come from Smart Account, not EOA wallet

### Sidebar (app/src/components/sidebar/sidebar.tsx)
- Next.js routing with Link components
- Uses usePathname for active state
- 7 navigation items: Dashboard, Analytics, Wallet, Send, Swap, History, Settings

## Important Design Decisions

1. **Dual Balance Tracking**: Portfolio tracks balances from BOTH EOA wallet AND Smart Account separately, then aggregates them
2. **Smart Account for Transactions**: All sends go through Smart Account (ERC-4337), not directly from EOA
3. **Dynamic Decimals**: Token decimals are fetched from contracts (typically 6 for USDT0/FXRP, 18 for C2FLR)
4. **Clean Dashboard**: Removed all mock data cards (uncategorized transactions, employees, weekly spending)
5. **Route Group Pattern**: Using (app) route group for all authenticated routes with shared Sidebar layout

## Environment Variables Needed
```
NEXT_PUBLIC_ETHERSPOT_API_KEY=<your-etherspot-api-key>
```

## CSS Structure
- Global styles: app/globals.css (2192 lines)
- CSS variables defined for theming (--sidebar-bg, --border-radius, etc.)
- Portfolio card uses inline styles as fallback
- Responsive design with media queries for mobile

## Data Flow
1. User connects wallet (Web3Auth Modal)
2. wagmi provides EOA address
3. Etherspot SDK creates Smart Account address
4. Portfolio service fetches:
   - Native balance (C2FLR) via provider.getBalance()
   - Token balances (USDT0, FXRP) via ERC20 contracts
   - Prices from FtsoV2 oracle
5. Aggregates and displays total in USD

## Known Issues/Workarounds
- Portfolio card CSS needed inline styles to display correctly
- All console logs removed for production readiness

## Next Steps (Placeholders Created)
- Analytics page implementation
- Wallet management page
- Token swap functionality
- Transaction history
- Settings/preferences

## File Structure
```
/app/
  ├── (app)/                    # Main app routes
  ├── src/
  │   ├── components/
  │   │   ├── dashboard/        # Dashboard components
  │   │   ├── sidebar/          # Navigation
  │   │   ├── header/           # Header component
  │   │   ├── widgets/          # SendReceiveCard
  │   │   └── auth/             # AuthGuard
  │   ├── services/
  │   │   └── portfolioService.ts
  │   ├── config/
  │   │   └── ftsoV2.config.ts
  │   └── providers/
  │       └── web3auth/         # Web3Auth setup
  ├── globals.css
  ├── layout.tsx                # Root layout
  └── page.tsx                  # Redirects to /dashboard
```

## Testing Addresses (Coston2 Testnet)
- Get testnet FLR from faucet: https://faucet.flare.network/
- Chain ID: 114
- RPC: https://coston2-api.flare.network/ext/C/rpc
