export const getDoorImageUrl = (doorNumber: number): string => {
  const baseUrl = `https://gateway.pinata.cloud/ipfs/${process.env.PINATA_FOLDER}`;
  const paddedNumber = doorNumber.toString().padStart(2, '0');
  return `${baseUrl}/door${paddedNumber}.png`;
}; 