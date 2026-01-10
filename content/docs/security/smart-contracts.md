---
title: Smart Contracts & Security
description: Learn about our security model and smart contract audits
section: Security
order: 1
---

# Smart Contracts & Security

CrowdMint is built with a security-first approach, utilizing robust and audited smart contracts to manage all campaign logic, fund flows, and interactions with the Vault. Our on-chain infrastructure ensures a decentralized, transparent, and reliable environment for creators and donors.


## Our Core Smart Contracts
The CrowdMint architecture is composed of three interconnected smart contracts, each with specific responsibilities:

### Campaign.sol (Individual Campaign Contract)

Each campaign launched on CrowdMint is an instance of this contract. It is responsible for:

* Donation Management: Receives USDC contributions from donors, tracks the amounts donated by each address, and the total amount raised. 
* Campaign Logic: Defines the goal, deadline, campaign type (Goal-Based or Flexible), and the optional minimum contribution amount.
* Creator Withdrawals: Allows the campaign creator to withdraw the raised funds if the conditions are met (goal achieved for Goal-Based, or any amount for Flexible). 
* Applies a 0.5% fee on the withdrawn amount, destined for the platform. 
* Implements a 6-month grace period for withdrawal. 
* Donor Refunds: For Goal-Based campaigns that fail to reach their goal, it allows donors to request a refund of their contributions. * Implements a 6-month grace period for refunds.
* Unclaimed Funds Sweep: After the 6-month grace period, if funds are not withdrawn by the creator or refunded to donors, the contract allows anyone to trigger the transfer of these funds to the CrowdMintVault. 
* Access Control & Security: Utilizes OpenZeppelin's Ownable for the campaign creator, ReentrancyGuard to prevent reentrancy attacks on critical functions, and Pausable to allow pausing functionalities in case of emergencies. 

### CampaignFactory.sol (Campaign Factory)

This contract serves as the primary entry point for creating new campaigns and managing the campaign ecosystem:

 * Campaign Creation: It is the sole contract that can deploy new instances of the Campaign.sol contract, ensuring all campaigns follow the same structure and logic. 
 * Campaign Tracking: Maintains a record of all created campaign contract addresses, allowing the platform to list and interact with them. 
 * Vault Intermediation: Acts as a secure intermediary to transfer funds from campaigns to the CrowdMintVault when the unclaimed funds sweep logic is triggered. 
 * Access Control & Security: Utilizes OpenZeppelin's Ownable for the factory owner (typically the CrowdMint team), Pausable, and ReentrancyGuard. 

 ### CrowdMintVault.sol (CrowdMint Vault)

The Vault is a central contract for the sustainability and community reward model:

* Receipt of Unclaimed Funds: Receives and stores campaign funds and refunds that were not withdrawn within the initial 6-month grace period. 
* Principal Claim: Allows original creators and donors to claim their funds deposited in the Vault. Applies a total fee of 10% on the claimed amount: 2% for the platform and 8% for the Vault itself. This right to claim the principal is valid for an additional 3-year period (VAULT_LOCK_PERIOD) from the date of deposit into the Vault. 
* Principal Incorporation: After the 3-year period, if the principal is not claimed, it is permanently incorporated into the Vault. This means the amount becomes part of the Vault's capital for yield generation.
* Yield Management: Tracks the total yield accumulated in the Vault (derived from external DeFi strategies or the incorporated capital). The owner can record these yields. The accumulated yield during the 3-year vault lock period will be distributed to token holders. 
* Access Control & Security: Utilizes OpenZeppelin's Ownable for the Vault owner, Pausable, and ReentrancyGuard. 

## Deployed Contracts on Arc Testnet  
For full transparency, you can inspect our deployed smart contracts directly on the [Arc Testnet Explorer](https://testnet.arcscan.app/):

* **USDC Token Contract:**  0x3600000000000000000000000000000000000000  [View on Arc Explorer](https://testnet.arcscan.app/token/0x3600000000000000000000000000000000000000)  

* **CrowdMint CampaignFactory Contract:**  0x79c0A67d298930bFe1d63123AC4FF9d0C24aAc2A  [View on Arc Explorer](https://testnet.arcscan.app/address/0x79c0A67d298930bFe1d63123AC4FF9d0C24aAc2A)   

* **CrowdMintVault Contract:**  0xf666085998533c85F06d952BD9879cc12b7ce397   [View on Arc Explorer](https://testnet.arcscan.app/address/0xf666085998533c85F06d952BD9879cc12b7ce397)   

* **Example Campaign Contract:**    0x9762eD8697c8a15D2Bc872d5aA796298833c0f84   [View on Arc Explorer](https://testnet.arcscan.app/address/0x9762eD8697c8a15D2Bc872d5aA796298833c0f84)


### View Our Full Smart Contracts on GitHub

For developers and those interested in reviewing the complete codebase, our smart contracts are open-source and available on GitHub:
 CrowdMint GitHub Repository: <https://github.com/mliell/crowdmint>  


## Key Principles

CrowdMint is built on audited smart contracts that ensure:

- **Transparency:** All transactions are publicly verifiable on-chain
- **Immutability:** Data cannot be altered once recorded
- **Trustlessness:** No central authority controls the funds
- **Automation:** Smart contracts enforce campaign rules


## Risk Disclosure

While we follow best security practices and use audited contracts, users should be aware of the inherent risks associated with using blockchain technology and smart contracts:

- **Smart Contract Risks:** Despite audits, unknown bugs or vulnerabilities may exist in smart contracts, potentially leading to fund loss. 
- **Stablecoin Fluctuation:** Although USDC is a stablecoin, its value may, in extreme circumstances, fluctuate relative to the US dollar. 
- **Network Risks:** Issues with the underlying blockchain network (Arc) may affect platform availability or performance. 
- **User Responsibility:** It is crucial for users to protect their private keys and wallet credentials. CrowdMint will never have access to them. Always Test with Small Amounts: For new users or when testing new functionalities, it is always advisable to start with small amounts. 

>CrowdMint is committed to maintaining a secure and transparent environment, but user diligence is always encouraged.
