/**
 * Generate metadata JSON for a campaign
 * In production, this should upload to IPFS and return the IPFS hash
 */
export interface CampaignMetadata {
  title: string
  shortDescription: string
  longDescription?: string
  imageUrl?: string
  category?: string
}

/**
 * Create metadata URI from campaign data
 * For now, returns a data URI. In production, upload to IPFS.
 */
export function createMetadataURI(metadata: CampaignMetadata): string {
  const json = JSON.stringify(metadata)
  // Return as data URI for now
  // In production, upload to IPFS and return ipfs:// hash
  return `data:application/json;base64,${Buffer.from(json).toString("base64")}`
}

/**
 * Upload metadata to IPFS (placeholder for future implementation)
 * In production, use a service like Pinata, Infura IPFS, or Web3.Storage
 */
export async function uploadMetadataToIPFS(metadata: CampaignMetadata): Promise<string> {
  // TODO: Implement IPFS upload
  // For now, return data URI
  return createMetadataURI(metadata)
}

