// lib/contracts.ts
"use client"

import { PublicClient, getContract, type Address } from "viem" // Importe PublicClient do viem
import { usePublicClient, useWalletClient } from "wagmi" // Mantido, mas usePublicClient/useWalletClient não são usados nas funções exportadas
import { erc20Abi, campaignFactoryAbi, campaignAbi } from "@/contracts/abis"
import { contracts } from "@/config/web3"
import type { CampaignDetailsOnChain } from "@/types/campaign"

/**
 * Get USDC contract instance
 */
export function getUsdcContract(publicClient: PublicClient) { // Tipo explícito PublicClient
  if (!publicClient) {
    throw new Error("Public client is not available")
  }
  if (!contracts.usdc) {
    throw new Error("USDC contract address not configured")
  }
  // Adicionado log para depuração
  console.log("getUsdcContract: publicClient recebido:", publicClient);
  const contractInstance = getContract({
    address: contracts.usdc,
    abi: erc20Abi,
    client: publicClient,
  });
  //console.log("getUsdcContract: instância do contrato retornada:", contractInstance);
  return contractInstance;
}

/**
 * Get Campaign Factory contract instance
 */
export function getFactoryContract(publicClient: PublicClient) { // Tipo explícito PublicClient
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
export function getCampaignContract(address: Address, publicClient: PublicClient) { // Tipo explícito PublicClient
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
  publicClient: PublicClient, // Tipo explícito PublicClient
): Promise<CampaignDetailsOnChain> {
  const campaign = getCampaignContract(campaignAddress, publicClient)
  // Adicionado tipo explícito para a tupla retornada por details()
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
export async function readUsdcBalance(address: Address, publicClient: PublicClient): Promise<bigint> { // Tipo explícito PublicClient
  const usdc = getUsdcContract(publicClient)
  return await usdc.read.balanceOf([address])
}

/**
 * Read USDC allowance
 */
export async function readUsdcAllowance(
  owner: Address,
  spender: Address,
  publicClient: PublicClient, // Tipo explícito PublicClient
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
      // Adicionado log para depuração mais detalhada
      console.error("Debug: usdc instance in readUsdcAllowance", { usdc, hasRead: !!usdc?.read, publicClient });
      throw new Error("Failed to get USDC contract instance")
    }
    return await usdc.read.allowance([owner, spender])
  } catch (error: any) {
    console.error("Error in readUsdcAllowance:", {
      owner,
      spender,
      usdcAddress: contracts.usdc,
      error: error.message || error, // Garante que a mensagem de erro seja logada
      publicClientStatus: publicClient ? "available" : "unavailable"
    })
    throw error
  }
}

/**
 * Get USDC decimals (should be 6 for USDC)
 */
export async function getUsdcDecimals(publicClient: PublicClient): Promise<number> { // Tipo explícito PublicClient
  const usdc = getUsdcContract(publicClient)
  return await usdc.read.decimals()
}

/**
 * Approve USDC spending
 */
export async function approveUsdc(
  spender: Address,
  amount: bigint,
  walletClient: any, // walletClient pode ser de wagmi, que é mais complexo que PublicClient
): Promise<`0x${string}`> {
  if (!contracts.usdc) {
    throw new Error("USDC contract address not configured")
  }
  // CORREÇÃO: Adicionar o 'account' para resolver AccountNotFoundError
  if (!walletClient.account) {
    throw new Error("Wallet client account is not available for approving USDC.")
  }

  const hash = await walletClient.writeContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
    account: walletClient.account, // Adicionado o account aqui
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
  walletClient: any, // walletClient pode ser de wagmi, que é mais complexo que PublicClient
): Promise<`0x${string}`> {
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }
  // CORREÇÃO: Adicionar o 'account' para resolver AccountNotFoundError
  if (!walletClient.account) {
    throw new Error("Wallet client account is not available for creating campaign.")
  }

  const hash = await walletClient.writeContract({
    address: contracts.factory,
    abi: campaignFactoryAbi,
    functionName: "createCampaign",
    args: [goal, deadline, goalBased, metadataURI, minContribution],
    account: walletClient.account, // Adicionado o account aqui
  })

  return hash
}

/**
 * Donate to a campaign
 */
export async function donateToCampaign(
  campaignAddress: Address,
  amount: bigint,
  walletClient: any, // walletClient pode ser de wagmi, que é mais complexo que PublicClient
): Promise<`0x${string}`> {
  // CORREÇÃO: Adicionar o 'account' para resolver AccountNotFoundError
  if (!walletClient.account) {
    throw new Error("Wallet client account is not available for donating.")
  }

  const hash = await walletClient.writeContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "donate",
    args: [amount],
    account: walletClient.account, // Adicionado o account aqui
  })

  return hash
}

/**
 * Withdraw funds from a campaign (creator only)
 */
export async function withdrawFromCampaign(
  campaignAddress: Address,
  walletClient: any, // walletClient pode ser de wagmi, que é mais complexo que PublicClient
): Promise<`0x${string}`> {
  // CORREÇÃO: Adicionar o 'account' para resolver AccountNotFoundError
  if (!walletClient.account) {
    throw new Error("Wallet client account is not available for withdrawing.")
  }

  const hash = await walletClient.writeContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "withdraw",
    args: [],
    account: walletClient.account, // Adicionado o account aqui
  })

  return hash
}

/**
 * Refund donation (for failed goal-based campaigns)
 * CORRIGIDO: Nome da função no contrato é "requestRefund"
 */
export async function refundDonation(
  campaignAddress: Address,
  walletClient: any, // walletClient pode ser de wagmi, que é mais complexo que PublicClient
): Promise<`0x${string}`> {
  // CORREÇÃO: Adicionar o 'account' para resolver AccountNotFoundError
  if (!walletClient.account) {
    throw new Error("Wallet client account is not available for refunding.")
  }

  const hash = await walletClient.writeContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "requestRefund", // CORRIGIDO AQUI
    args: [],
    account: walletClient.account, // Adicionado o account aqui
  })

  return hash
}

/**
 * Get all campaigns from factory
 */
export async function getAllCampaigns(publicClient: PublicClient): Promise<Address[]> { // Tipo explícito PublicClient
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }

  const factory = getFactoryContract(publicClient)
  // Seu CampaignFactory tem uma função getCampaigns() que retorna todos os endereços
  return (await factory.read.getCampaigns()) as Address[];
}

/**
 * Get campaigns by creator
 */
export async function getCampaignsByCreator(
  creator: Address,
  publicClient: PublicClient, // Tipo explícito PublicClient
): Promise<Address[]> {
  if (!contracts.factory) {
    throw new Error("Factory contract address not configured")
  }

  // Seu CampaignFactory não tem uma função direta para buscar por criador.
  // Então, buscamos todas as campanhas e filtramos no frontend.
  const factory = getFactoryContract(publicClient)
  const allCampaignAddresses = await factory.read.getCampaigns() as Address[];

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
    ];
    if (details[0].toLowerCase() === creator.toLowerCase()) {
      creatorCampaignAddresses.push(address)
    }
  }

  return creatorCampaignAddresses
}

/**
 * NOVO: Get list of donors for a campaign
 */
export async function getDonorsList(campaignAddress: Address, publicClient: PublicClient): Promise<Address[]> { // Tipo explícito PublicClient
  const campaign = getCampaignContract(campaignAddress, publicClient);
  return (await campaign.read.getDonors()) as Address[];
}

/**
 * NOVO: Get contribution amount for a specific donor
 */
export async function getDonorContribution(
  campaignAddress: Address,
  donorAddress: Address,
  publicClient: PublicClient, // Tipo explícito PublicClient
): Promise<bigint> {
  const campaign = getCampaignContract(campaignAddress, publicClient);
  return (await campaign.read.donations([donorAddress])) as bigint;
}

/**
 * NOVO: Get backers count for a campaign (reimplementado para usar getDonorsList)
 */
export async function getBackersCount(
  campaignAddress: Address,
  publicClient: PublicClient, // Tipo explícito PublicClient
): Promise<number> {
  try {
    const donors = await getDonorsList(campaignAddress, publicClient);
    return donors.length;
  } catch (error: any) {
    console.warn(
      `Failed to get backers count for campaign ${campaignAddress}:`,
      error?.message || error,
    );
    return 0;
  }
}
