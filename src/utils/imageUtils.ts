const BASE_URL = 'https://gateway.pinata.cloud/ipfs';

// TODO: Fix this for minting doors
export const getDoorImageUrl = (doorNumber: number): string => {
  const paddedNumber = doorNumber.toString().padStart(2, '0');
  return `${BASE_URL}/door${paddedNumber}.png`;
}; 

export const getRegistrationImageUrl = (): string => {
  return `${BASE_URL}/QmP77sEwv6zztA8mFbTuMATgnKZgbKnbqrRJJajMC1wLpc`;
}; 

export const getRegistrationMetaUrl = () => {
  // https://gateway.pinata.cloud/ipfs/QmTW95rxu8TVdqTneHWi5cKS5cSinLUZgsXoQySsfjpHqd
  return `${BASE_URL}/QmTW95rxu8TVdqTneHWi5cKS5cSinLUZgsXoQySsfjpHqd`
}

export const getCollectionMetadataUrl = () => {
  return `${BASE_URL}/QmQa28oDyAjhu3qZpNGafn9Nff5HGLtHppGio4KdfGTcU4`;
}

// https://gateway.pinata.cloud/ipfs/QmQa28oDyAjhu3qZpNGafn9Nff5HGLtHppGio4KdfGTcU4
