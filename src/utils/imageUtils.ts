export const getDoorImageUrl = (doorNumber: number): string => {
  const baseUrl = process.env.NEXT_PUBLIC_IPFS_BASE_URL || "https://gateway.pinata.cloud/ipfs/QmQLLt3YCmvbyPRjA3ftETMqYh2Hf1EMApF9zQ7vSptvWN";
  const paddedNumber = doorNumber.toString().padStart(2, '0');
  return `${baseUrl}/door${paddedNumber}.png`;
}; 