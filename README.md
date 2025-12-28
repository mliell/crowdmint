<div align="center">
  <img src="https://www.crowdmint.live/CrowdMint-Logo-Text.png" alt="CrowdMint Logo" width="200"/>
  <p><em>Crowd Together, Mint Forever.</em></p>
  <p><em>Decentralized crowdfunding platform built on Arc Network.</em></p>
</div>


[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-orange)](https://soliditylang.org/)
[![Wagmi](https://img.shields.io/badge/Wagmi-2.0-purple)](https://wagmi.sh/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## ✨ Features

- 🌐 **Fully Decentralized** - All campaigns and transactions are on-chain, ensuring transparency and immutability.
- 💰 **USDC Donations** - Back projects using stable cryptocurrency.
- 🎯 **Flexible & Goal-Based Campaigns** - Choose between all-or-nothing or keep-what-you-raise models.
- 🔐 **Smart Contract Automation** - Refunds for failed campaigns, secure withdrawals, and transparent fee structure.
- 📊 **Yield Generation** - Donors and creators earn sustainable yields through integrated DeFi vaults (coming soon).
- 🎨 **IPFS Metadata** - Campaign details stored permanently on decentralized storage.
- 📱 **Responsive Design** - Beautiful, modern UI that works seamlessly on all devices.
- 📈 **Real-Time Analytics** - Track campaign progress, backers, and funds raised in real-time.


## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router and Server Components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with custom design system
- **shadcn/ui** - Accessible, customizable component library
- **Wagmi 2.0** - React Hooks for Ethereum
- **Viem** - TypeScript-first Ethereum library
- **TanStack Query** - Powerful data synchronization
- **Sonner** - Beautiful toast notifications

### Smart Contracts
- **Solidity 0.8.20** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin Contracts** - Battle-tested contract libraries
- **UUPS Proxy Pattern** - Upgradeable contracts for future improvements

### Backend & Storage
- **Next.js API Routes** - Serverless endpoints
- **IPFS (Pinata)** - Decentralized metadata storage
- **Vercel Analytics** - Performance monitoring


## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- MetaMask or compatible Web3 wallet
- Arc Testnet configured in wallet
- Hardhat (for smart contract development)

## 🚀 Getting Started

### 1. Clone the Repository

bash git clone https://github.com/yourusername/crowdmint.git cd crowdmint

### 2. Install Dependencies

<div class="widget code-container remove-before-copy"><div class="code-header non-draggable"><span class="iaf s13 w700 code-language-placeholder"></span><div class="code-copy-button"><img class="code-copy-icon" src="data:image/svg+xml;utf8,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%3E%0A%20%20%3Cpath%20d%3D%22M10.8%208.63V11.57C10.8%2014.02%209.82%2015%207.37%2015H4.43C1.98%2015%201%2014.02%201%2011.57V8.63C1%206.18%201.98%205.2%204.43%205.2H7.37C9.82%205.2%2010.8%206.18%2010.8%208.63Z%22%20stroke%3D%22%23717C92%22%20stroke-width%3D%221.05%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M15%204.42999V7.36999C15%209.81999%2014.02%2010.8%2011.57%2010.8H10.8V8.62999C10.8%206.17999%209.81995%205.19999%207.36995%205.19999H5.19995V4.42999C5.19995%201.97999%206.17995%200.999992%208.62995%200.999992H11.57C14.02%200.999992%2015%201.97999%2015%204.42999Z%22%20stroke%3D%22%23717C92%22%20stroke-width%3D%221.05%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%3C%2Fsvg%3E%0A" /></div></div><pre id="code-5e3s45idk" style="color:white;font-family:Consolas, Monaco, &quot;Andale Mono&quot;, &quot;Ubuntu Mono&quot;, monospace;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;font-size:1em;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none;padding:8px;margin:8px;overflow:auto;background:#011627;width:calc(100% - 8px);border-radius:8px;box-shadow:0px 8px 18px 0px rgba(120, 120, 143, 0.10), 2px 2px 10px 0px rgba(255, 255, 255, 0.30) inset"><code class="language-bash" style="white-space:pre;color:#d6deeb;font-family:Consolas, Monaco, &quot;Andale Mono&quot;, &quot;Ubuntu Mono&quot;, monospace;text-align:left;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;font-size:1em;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none"><span class="token" style="color:rgb(130, 170, 255)">npm</span><span> </span><span class="token" style="color:rgb(130, 170, 255)">install</span><span>
</span><span></span><span class="token" style="color:rgb(99, 119, 119);font-style:italic"># or</span><span>
</span><span></span><span class="token" style="color:rgb(130, 170, 255)">pnpm</span><span> </span><span class="token" style="color:rgb(130, 170, 255)">install</span><span>
</span></code></pre></div>

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

<div class="widget code-container remove-before-copy"><div class="code-header non-draggable"><span class="iaf s13 w700 code-language-placeholder">.env.local</span><div class="code-copy-button"><img class="code-copy-icon" src="data:image/svg+xml;utf8,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%3E%0A%20%20%3Cpath%20d%3D%22M10.8%208.63V11.57C10.8%2014.02%209.82%2015%207.37%2015H4.43C1.98%2015%201%2014.02%201%2011.57V8.63C1%206.18%201.98%205.2%204.43%205.2H7.37C9.82%205.2%2010.8%206.18%2010.8%208.63Z%22%20stroke%3D%22%23717C92%22%20stroke-width%3D%221.05%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M15%204.42999V7.36999C15%209.81999%2014.02%2010.8%2011.57%2010.8H10.8V8.62999C10.8%206.17999%209.81995%205.19999%207.36995%205.19999H5.19995V4.42999C5.19995%201.97999%206.17995%200.999992%208.62995%200.999992H11.57C14.02%200.999992%2015%201.97999%2015%204.42999Z%22%20stroke%3D%22%23717C92%22%20stroke-width%3D%221.05%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%3C%2Fsvg%3E%0A" /></div></div><pre id="code-oeadqxtt9" style="color:white;font-family:Consolas, Monaco, &quot;Andale Mono&quot;, &quot;Ubuntu Mono&quot;, monospace;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;font-size:1em;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none;padding:8px;margin:8px;overflow:auto;background:#011627;width:calc(100% - 8px);border-radius:8px;box-shadow:0px 8px 18px 0px rgba(120, 120, 143, 0.10), 2px 2px 10px 0px rgba(255, 255, 255, 0.30) inset"><code class="language-env" style="white-space:pre;color:#d6deeb;font-family:Consolas, Monaco, &quot;Andale Mono&quot;, &quot;Ubuntu Mono&quot;, monospace;text-align:left;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;font-size:1em;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none"><span># Blockchain Configuration
</span>NEXT_PUBLIC_CHAIN_ID=5042002
<!-- -->NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
<!-- -->NEXT_PUBLIC_CHAIN_NAME=Arc Network Testnet
<!-- -->
<!-- --># Contract Addresses
<!-- -->NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=0x79c0A67d298930bFe1d63123AC4FF9d0C24aAc2A
<!-- -->NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
<!-- -->
<!-- --># Factory Address
<!-- -->NEXT_PUBLIC_FACTORY_ADDRESS=0x275fCcA55B551Fd99ad5735f8BF4fc9569E4D38f
<!-- -->
<!-- --># Vault Address
<!-- -->NEXT_PUBLIC_CROWDMINT_VAULT_ADDRESS=0xA96f100a57D815dea6b5b0D080a350089FA7e324
<!-- -->
<!-- --># Optional: Block Explorer
<!-- -->NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://testnet.arcscan.app
<!-- -->
<!-- --># Gas settings (base fee)
<!-- -->NEXT_PUBLIC_MIN_GAS_PRICE=160000000000
<!-- -->
<!-- --># Private Key
<!-- -->NEXT_PUBLIC_PRIVATE_KEY=
<!-- -->
<!-- --># Platform Fee
<!-- -->NEXT_PUBLIC_PLATFORM_FEE_COLLECTOR=
</code></pre></div>

**⚠️ Important:** Never commit your `.env.local` file. It's already in `.gitignore`.

### 4. Run Development Server

<div class="widget code-container remove-before-copy"><div class="code-header non-draggable"><span class="iaf s13 w700 code-language-placeholder"></span><div class="code-copy-button"><img class="code-copy-icon" src="data:image/svg+xml;utf8,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%3E%0A%20%20%3Cpath%20d%3D%22M10.8%208.63V11.57C10.8%2014.02%209.82%2015%207.37%2015H4.43C1.98%2015%201%2014.02%201%2011.57V8.63C1%206.18%201.98%205.2%204.43%205.2H7.37C9.82%205.2%2010.8%206.18%2010.8%208.63Z%22%20stroke%3D%22%23717C92%22%20stroke-width%3D%221.05%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M15%204.42999V7.36999C15%209.81999%2014.02%2010.8%2011.57%2010.8H10.8V8.62999C10.8%206.17999%209.81995%205.19999%207.36995%205.19999H5.19995V4.42999C5.19995%201.97999%206.17995%200.999992%208.62995%200.999992H11.57C14.02%200.999992%2015%201.97999%2015%204.42999Z%22%20stroke%3D%22%23717C92%22%20stroke-width%3D%221.05%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%3C%2Fsvg%3E%0A" /></div></div><pre id="code-d5f2ks1ot" style="color:white;font-family:Consolas, Monaco, &quot;Andale Mono&quot;, &quot;Ubuntu Mono&quot;, monospace;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;font-size:1em;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none;padding:8px;margin:8px;overflow:auto;background:#011627;width:calc(100% - 8px);border-radius:8px;box-shadow:0px 8px 18px 0px rgba(120, 120, 143, 0.10), 2px 2px 10px 0px rgba(255, 255, 255, 0.30) inset"><code class="language-bash" style="white-space:pre;color:#d6deeb;font-family:Consolas, Monaco, &quot;Andale Mono&quot;, &quot;Ubuntu Mono&quot;, monospace;text-align:left;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;font-size:1em;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none"><span class="token" style="color:rgb(130, 170, 255)">npm</span><span> run dev
</span><span></span><span class="token" style="color:rgb(99, 119, 119);font-style:italic"># or</span><span>
</span><span></span><span class="token" style="color:rgb(130, 170, 255)">pnpm</span><span> dev
</span></code></pre></div>

Open [http://localhost:3000](http://localhost:3000) in your browser.



## 🔧 Smart Contracts

### Deployed Contracts (Arc Testnet)

- **CampaignFactory:** `0x79c0A67d298930bFe1d63123AC4FF9d0C24aAc2A`
  - [View on ArcScan](https://testnet.arcscan.app/address/0x79c0A67d298930bFe1d63123AC4FF9d0C24aAc2A)
- **USDC (Native):** `0x3600000000000000000000000000000000000000`

### Key Features

#### Campaign Contract (UUPS Upgradeable)
- `donate(uint256 amount)` - Contribute USDC to campaign
- `withdraw()` - Creator withdraws funds (with 0.5% fee)
- `requestRefund()` - Get refund from failed goal-based campaigns
- `details()` - View campaign details on-chain

#### Factory Contract
- `createCampaign(...)` - Deploy new campaign contract
- `getCampaigns()` - Get all deployed campaigns
- Owner-controlled for security

### Fee Structure

Creator withdrawal (within the first 6 months):
- **Withdrawal Fee:** 0.5% (100% goes to the platform)

No withdrawal after 6 months: If the creator does not withdraw within 6 months, the funds are automatically moved to the Vault. The creator can recover them for up to 3 years, under the following fee:
- **Claim Fee:** 10% on yield claims (20% goes to the platform, 80% goes to the vaults)

## 🔒 Security

- ✅ **UUPS Proxy Pattern** - Secure upgradeability
- ✅ **ReentrancyGuard** - Prevents reentrancy attacks
- ✅ **SafeERC20** - Safe token transfers
- ✅ **Access Control** - Role-based permissions
- ✅ **Input Validation** - Comprehensive validation on all inputs
- ✅ **Network Verification** - Automatic chain switching and validation

## 📊 Campaign Types

### Goal-Based (All-or-Nothing)
- Funds locked until goal is met by deadline
- If the campaign does not reach its goal, backers can claim refunds.
- Higher trust for backers
- Best for fixed-budget projects

### Flexible (Keep-What-You-Raise)
- Creator keeps all funds raised
- No refunds (unless campaign fails completely)
- More flexibility for creators
- Best for ongoing projects


## 🎯 Roadmap

- [x] Core crowdfunding functionality
- [x] USDC donations on Arc Network
- [x] IPFS metadata storage
- [x] Responsive UI with dark mode
- [ ] **Q1 2026:** DeFi vault integration for yields
- [ ] **Q2 2026:** NFT rewards for backers
- [ ] Campaign analytics dashboard
- [ ] Social features (comments, updates)
- [ ] Campaign verification system

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🙏 Acknowledgments

- [Arc Network](https://arc.network/) - For the blockchain infrastructure
- [OpenZeppelin](https://www.openzeppelin.com/) - For secure contract libraries
- [Wagmi](https://wagmi.sh/) - For excellent Web3 React hooks
- [shadcn/ui](https://ui.shadcn.com/) - For beautiful UI components


## 📞 Support

If you encounter any issues or have questions:

1. Check existing [GitHub Issues](https://github.com/mliell/crowdmint/issues)
2. Read the documentation in `/docs`
3. Open a new issue with detailed information

## 🌟 Live Platform

Visit the live platform: [https://crowdmint.live](https://crowdmint.live)

---

**Made with 🌱 for a decentralized future**

*Crowd Together, Mint Forever*
