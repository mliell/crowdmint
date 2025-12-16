// lib/contracts.ts
"use client"

import { PublicClient, getContract, type Address } from "viem"
import { usePublicClient, useWalletClient } from "wagmi"
import { erc20Abi, campaignFactoryAbi, campaignAbi } from "@/contracts/abis"
import { contracts } from "@/config/web3"
import type { CampaignDetailsOnChain } from "@/types/campaign"

/**
 * Get USDC contract instance
 */
export function getUsdcContract(publicClient: PublicClient) {
  if (!publicClient) {
    throw new Error("Public client is not available")
  }
  if (!contracts.usdc) {
    throw new Error("USDC contract address not configured")
  }

  console.log("getUsdcContract: publicClient recebido:", publicClient)

  const contractInstance = getContract({
    address: contracts.usdc,
    abi: erc20Abi,
    client: publicClient,
  })

  return contractInstance
}

/**
 * Get Campaign Factory contract instance
 */
export function getFactoryContract(publicClient: PublicClient) {
  if (!publicClient) {
    throw new Error("Public client is not available")
  }
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }

  return getContract({
    address: contracts.factory,
    abi: campaignFactoryAbi,
    client: publicClient,
  })
}

/**
 * Get Campaign contract instance
 */
export function getCampaignContract(address: Address, publicClient: PublicClient) {
  if (!publicClient) {
    throw new Error("Public client is not available")
  }

  return getContract({
    address,
    abi: campaignAbi,
    client: publicClient,
  })
}

/**
 * Read campaign details from contract
 */
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

/**
 * Read USDC balance for an address
 */
export async function readUsdcBalance(address: Address, publicClient: PublicClient): Promise<bigint> {
  const usdc = getUsdcContract(publicClient)
  return await usdc.read.balanceOf([address])
}

/**
 * Read USDC allowance
 */
export async function readUsdcAllowance(
  owner: Address,
  spender: Address,
  publicClient: PublicClient,
): Promise<bigint> {
  if (!publicClient) {
    throw new Error("Public client is required to read allowance")
  }
  if (!contracts.usdc) {
    throw new Error("USDC contract address is not configured")
  }

  try {
    const usdc = getUsdcContract(publicClient)
    if (!usdc || !usdc.read) {
      console.error("Debug: usdc instance in readUsdcAllowance", { 
        usdc, 
        hasRead: !!usdc?.read, 
        publicClient 
      })
      throw new Error("Failed to get USDC contract instance")
    }
    return await usdc.read.allowance([owner, spender])
  } catch (error: any) {
    console.error("Error in readUsdcAllowance:", {
      owner,
      spender,
      usdcAddress: contracts.usdc,
      error: error.message || error,
      publicClientStatus: publicClient ? "available" : "unavailable"
    })
    throw error
  }
}

/**
 * Get USDC decimals (should be 6 for USDC)
 */
export async function getUsdcDecimals(publicClient: PublicClient): Promise<number> {
  const usdc = getUsdcContract(publicClient)
  return await usdc.read.decimals()
}

/**
 * Approve USDC spending
 */
export async function approveUsdc(
  spender: Address,
  amount: bigint,
  walletClient: any,
  account: Address,
): Promise<`0x${string}`> {
  if (!contracts.usdc) {
    throw new Error("USDC contract address not configured")
  }

  const hash = await walletClient.writeContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
    account,
  })

  return hash
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  goal: bigint,
  deadline: bigint,
  goalBased: boolean,
  metadataURI: string,
  minContribution: bigint,
  walletClient: any,
  account: Address,
): Promise<`0x${string}`> {
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }

  const hash = await walletClient.writeContract({
    address: contracts.factory,
    abi: campaignFactoryAbi,
    functionName: "createCampaign",
    args: [goal, deadline, goalBased, metadataURI, minContribution],
    account,
  })

  return hash
}

/**
 * Donate to a campaign
 */
export async function donateToCampaign(
  campaignAddress: Address,
  amount: bigint,
  walletClient: any,
  account: Address,
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "donate",
    args: [amount],
    account,
  })

  return hash
}

/**
 * Withdraw funds from a campaign (creator only)
 */
export async function withdrawFromCampaign(
  campaignAddress: Address,
  walletClient: any,
  account: Address,
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "withdraw",
    args: [],
    account,
  })

  return hash
}

/**
 * Refund donation (for failed goal-based campaigns)
 */
export async function refundDonation(
  campaignAddress: Address,
  walletClient: any,
  account: Address,
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "requestRefund",
    args: [],
    account,
  })

  return hash
}

/**
 * Get all campaigns from factory
 */
export async function getAllCampaigns(publicClient: PublicClient): Promise<Address[]> {
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }

  const factory = getFactoryContract(publicClient)
  return (await factory.read.getCampaigns()) as Address[]
}

/**
 * Get campaigns by creator
 */
export async function getCampaignsByCreator(
  creator: Address,
  publicClient: PublicClient,
): Promise<Address[]> {
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }

  const factory = getFactoryContract(publicClient)
  const allCampaignAddresses = await factory.read.getCampaigns() as Address[]
  const creatorCampaignAddresses: Address[] = []

  for (const address of allCampaignAddresses) {
    const campaign = getCampaignContract(address, publicClient)
    const details = (await campaign.read.details()) as readonly [
      Address, // creator
      bigint,  // goal
      bigint,  // deadline
      bigint,  // amountRaised
      boolean, // goalBased
      boolean, // withdrawn
      string,  // metadataURI
      boolean, // active
      bigint   // minContribution
    ]

    if (details[0].toLowerCase() === creator.toLowerCase()) {
      creatorCampaignAddresses.push(address)
    }
  }

  return creatorCampaignAddresses
}

/**
 * Get list of donors for a campaign
 */
export async function getDonorsList(campaignAddress: Address, publicClient: PublicClient): Promise<Address[]> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  return (await campaign.read.getDonors()) as Address[]
}

/**
 * Get contribution amount for a specific donor
 */
export async function getDonorContribution(
  campaignAddress: Address,
  donorAddress: Address,
  publicClient: PublicClient,
): Promise<bigint> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  return (await campaign.read.donations([donorAddress])) as bigint
}

/**
 * Get backers count for a campaign
 */
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
