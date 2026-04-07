// lib/contracts.ts
"use client"

import {
  type PublicClient,
  type WalletClient,
  type Address,
  getContract,
} from "viem"
import { writeContract } from "viem/actions"
import { erc20Abi, campaignFactoryAbi, campaignAbi, crowdMintVaultAbi } from "@/contracts/abis"
import { contracts, arcTestnet } from "@/config/web3"
import type { CampaignDetailsOnChain } from "@/types/campaign"

// ---------------------------------------------------------------------------
//  Contract instances
// ---------------------------------------------------------------------------

export function getUsdcContract(publicClient: PublicClient) {
  if (!publicClient) throw new Error("Public client is not available")
  if (!contracts.usdc) throw new Error("USDC contract address not configured")
  return getContract({
    address: contracts.usdc,
    abi: erc20Abi,
    client: publicClient,
  })
}

export function getFactoryContract(publicClient: PublicClient) {
  if (!publicClient) throw new Error("Public client is not available")
  if (!contracts.factory) throw new Error("Factory contract address not configured")
  return getContract({
    address: contracts.factory,
    abi: campaignFactoryAbi,
    client: publicClient,
  })
}

export function getCampaignContract(address: Address, publicClient: PublicClient) {
  if (!publicClient) throw new Error("Public client is not available")
  return getContract({
    address,
    abi: campaignAbi,
    client: publicClient,
  })
}

export function getVaultContract(publicClient: PublicClient) {
  if (!publicClient) throw new Error("Public client is not available")
  if (!contracts.vault) throw new Error("Vault contract address not configured")
  return getContract({
    address: contracts.vault,
    abi: crowdMintVaultAbi,
    client: publicClient,
  })
}

// ---------------------------------------------------------------------------
//  Read operations
// ---------------------------------------------------------------------------

export async function readCampaignDetails(
  campaignAddress: Address,
  publicClient: PublicClient,
): Promise<CampaignDetailsOnChain> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  const details = (await campaign.read.details()) as readonly [
    Address, // creator
    bigint, // goal
    bigint, // deadline
    bigint, // amountRaised
    boolean, // goalBased
    boolean, // withdrawn
    string, // metadataURI
    boolean, // active
    bigint, // minContribution
  ]

  return {
    creator: details[0],
    goal: details[1],
    deadline: details[2],
    amountRaised: details[3],
    goalBased: details[4],
    withdrawn: details[5],
    metadataURI: details[6],
    active: details[7],
    minContribution: details[8],
  }
}

export async function readCampaignProgress(
  campaignAddress: Address,
  publicClient: PublicClient,
): Promise<{ raised: bigint; goal: bigint; percentage: bigint }> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  const [raised, goal, percentage] = (await campaign.read.getProgress()) as readonly [bigint, bigint, bigint]
  return { raised, goal, percentage }
}

export async function readUsdcBalance(address: Address, publicClient: PublicClient): Promise<bigint> {
  const usdc = getUsdcContract(publicClient)
  return await usdc.read.balanceOf([address])
}

export async function readUsdcAllowance(
  owner: Address,
  spender: Address,
  publicClient: PublicClient,
): Promise<bigint> {
  if (!publicClient) throw new Error("Public client is required to read allowance")
  if (!contracts.usdc) throw new Error("USDC contract address is not configured")

  const usdc = getUsdcContract(publicClient)
  return await usdc.read.allowance([owner, spender])
}

export async function getUsdcDecimals(publicClient: PublicClient): Promise<number> {
  const usdc = getUsdcContract(publicClient)
  return await usdc.read.decimals()
}

export async function getAllCampaigns(publicClient: PublicClient): Promise<Address[]> {
  if (!contracts.factory) throw new Error("Factory contract address not configured")
  const factory = getFactoryContract(publicClient)
  return (await factory.read.getCampaigns()) as Address[]
}

export async function getCampaignsLength(publicClient: PublicClient): Promise<number> {
  if (!contracts.factory) throw new Error("Factory contract address not configured")
  const factory = getFactoryContract(publicClient)
  const length = (await factory.read.getCampaignsLength()) as bigint
  return Number(length)
}

export async function getCampaignByIndex(index: number, publicClient: PublicClient): Promise<Address> {
  if (!contracts.factory) throw new Error("Factory contract address not configured")
  const factory = getFactoryContract(publicClient)
  return (await factory.read.getCampaign([BigInt(index)])) as Address
}

export async function readCampaignEndedTimestamp(
  campaignAddress: Address,
  publicClient: PublicClient,
): Promise<bigint> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  return (await campaign.read.campaignEndedTimestamp()) as bigint
}

export async function getDonorsList(campaignAddress: Address, publicClient: PublicClient): Promise<Address[]> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  return (await campaign.read.getDonors()) as Address[]
}

export async function getDonorContribution(
  campaignAddress: Address,
  donorAddress: Address,
  publicClient: PublicClient,
): Promise<bigint> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  return (await campaign.read.donations([donorAddress])) as bigint
}

export async function getBackersCount(
  campaignAddress: Address,
  publicClient: PublicClient,
): Promise<number> {
  try {
    const donors = await getDonorsList(campaignAddress, publicClient)
    return donors.length
  } catch (error: any) {
    console.warn(
      `Failed to get backers count for campaign ${campaignAddress}:`,
      error?.message || error,
    )
    return 0
  }
}

// ---------------------------------------------------------------------------
//  Batched read operations (multicall)
// ---------------------------------------------------------------------------

/**
 * Fetch details for multiple campaigns in parallel.
 * Uses Promise.allSettled since Arc Testnet does not have multicall3 deployed.
 */
export async function readAllCampaignDetailsBatched(
  campaignAddresses: Address[],
  publicClient: PublicClient,
): Promise<(CampaignDetailsOnChain | null)[]> {
  if (campaignAddresses.length === 0) return []

  const results = await Promise.allSettled(
    campaignAddresses.map((addr) => readCampaignDetails(addr, publicClient)),
  )

  return results.map((result) =>
    result.status === "fulfilled" ? result.value : null,
  )
}

/**
 * Fetch backers count for multiple campaigns in parallel.
 */
export async function readAllBackersCountBatched(
  campaignAddresses: Address[],
  publicClient: PublicClient,
): Promise<number[]> {
  if (campaignAddresses.length === 0) return []

  const results = await Promise.allSettled(
    campaignAddresses.map((addr) => getBackersCount(addr, publicClient)),
  )

  return results.map((result) =>
    result.status === "fulfilled" ? result.value : 0,
  )
}

/**
 * Fetch a user's donation amount across multiple campaigns in parallel.
 */
export async function readUserDonationsBatched(
  user: Address,
  campaignAddresses: Address[],
  publicClient: PublicClient,
): Promise<bigint[]> {
  if (campaignAddresses.length === 0) return []

  const results = await Promise.allSettled(
    campaignAddresses.map((addr) => getDonorContribution(addr, user, publicClient)),
  )

  return results.map((result) =>
    result.status === "fulfilled" ? result.value : 0n,
  )
}

// ---------------------------------------------------------------------------
//  Write operations (with simulateContract before each write)
// ---------------------------------------------------------------------------

async function simulateAndWrite(
  publicClient: PublicClient,
  walletClient: WalletClient,
  params: {
    address: Address
    abi: readonly any[]
    functionName: string
    args?: readonly any[]
    account: Address
  },
): Promise<`0x${string}`> {
  // Simulate first to catch reverts before spending gas
  await publicClient.simulateContract({
    ...params,
    chain: arcTestnet,
  })

  // If simulation succeeds, execute the real transaction
  const hash = await writeContract(walletClient, {
    ...params,
    chain: arcTestnet,
  })
  return hash
}

export async function approveUsdc(
  spender: Address,
  amount: bigint,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  if (!contracts.usdc) throw new Error("USDC contract address not configured")
  return simulateAndWrite(publicClient, walletClient, {
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
    account,
  })
}

export async function createCampaign(
  goal: bigint,
  deadline: bigint,
  goalBased: boolean,
  metadataURI: string,
  minContribution: bigint,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  if (!contracts.factory) throw new Error("Factory contract address not configured")
  return simulateAndWrite(publicClient, walletClient, {
    address: contracts.factory,
    abi: campaignFactoryAbi,
    functionName: "createCampaign",
    args: [goal, deadline, goalBased, metadataURI, minContribution],
    account,
  })
}

export async function donateToCampaign(
  campaignAddress: Address,
  amount: bigint,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  return simulateAndWrite(publicClient, walletClient, {
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "donate",
    args: [amount],
    account,
  })
}

export async function withdrawFromCampaign(
  campaignAddress: Address,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  return simulateAndWrite(publicClient, walletClient, {
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "withdraw",
    args: [],
    account,
  })
}

export async function refundDonation(
  campaignAddress: Address,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  return simulateAndWrite(publicClient, walletClient, {
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "requestRefund",
    args: [],
    account,
  })
}

export async function endCampaign(
  campaignAddress: Address,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  return simulateAndWrite(publicClient, walletClient, {
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "endCampaign",
    args: [],
    account,
  })
}

export async function sweepUnclaimedFunds(
  campaignAddress: Address,
  originalClaimer: Address,
  depositType: number,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  return simulateAndWrite(publicClient, walletClient, {
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "sweepUnclaimedFunds",
    args: [originalClaimer, depositType],
    account,
  })
}

// ---------------------------------------------------------------------------
//  Vault read operations
// ---------------------------------------------------------------------------

export async function getVaultBalance(publicClient: PublicClient): Promise<bigint> {
  const vault = getVaultContract(publicClient)
  return (await vault.read.getVaultBalance()) as bigint
}

export async function getVaultDepositDetails(
  depositId: number,
  publicClient: PublicClient,
): Promise<{
  principalAmount: bigint
  depositTimestamp: bigint
  originalClaimer: Address
  depositType: number
  claimedByOriginalClaimer: boolean
  principalIncorporated: boolean
}> {
  const vault = getVaultContract(publicClient)
  const [principalAmount, depositTimestamp, originalClaimer, depositType, claimed, incorporated] =
    (await vault.read.getDepositDetails([BigInt(depositId)])) as readonly [
      bigint, bigint, Address, number, boolean, boolean,
    ]
  return {
    principalAmount,
    depositTimestamp,
    originalClaimer,
    depositType,
    claimedByOriginalClaimer: claimed,
    principalIncorporated: incorporated,
  }
}

export async function getVaultTotals(publicClient: PublicClient): Promise<{
  principalAvailable: bigint
  principalIncorporated: bigint
  vaultFees: bigint
  platformFees: bigint
  yieldAccumulated: bigint
  balance: bigint
}> {
  const vault = getVaultContract(publicClient)
  const [principalAvailable, principalIncorporated, vaultFees, platformFees, yieldAccumulated, balance] =
    await Promise.all([
      vault.read.getTotalPrincipalAvailableForClaim() as Promise<bigint>,
      vault.read.getTotalPrincipalIncorporated() as Promise<bigint>,
      vault.read.getTotalVaultFeesCollected() as Promise<bigint>,
      vault.read.getTotalPlatformFeesFromVaultClaims() as Promise<bigint>,
      vault.read.getTotalYieldAccumulated() as Promise<bigint>,
      vault.read.getVaultBalance() as Promise<bigint>,
    ])
  return { principalAvailable, principalIncorporated, vaultFees, platformFees, yieldAccumulated, balance }
}

// ---------------------------------------------------------------------------
//  Vault write operations
// ---------------------------------------------------------------------------

export async function claimVaultPrincipal(
  depositId: number,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  if (!contracts.vault) throw new Error("Vault contract address not configured")
  return simulateAndWrite(publicClient, walletClient, {
    address: contracts.vault,
    abi: crowdMintVaultAbi,
    functionName: "claimPrincipalByOriginalClaimer",
    args: [BigInt(depositId)],
    account,
  })
}

export async function incorporateVaultPrincipal(
  depositId: number,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
): Promise<`0x${string}`> {
  if (!contracts.vault) throw new Error("Vault contract address not configured")
  return simulateAndWrite(publicClient, walletClient, {
    address: contracts.vault,
    abi: crowdMintVaultAbi,
    functionName: "incorporatePrincipal",
    args: [BigInt(depositId)],
    account,
  })
}
