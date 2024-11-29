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
  // https://gateway.pinata.cloud/ipfs/QmT4f6dG5xHoC7BKLcNwZgK6LSoaxd9CTxpEJsH9QwZMAP
  return `${BASE_URL}/QmWmHpZg7EChr7dEKy2vHEpuQsBaqYZhEaYUminuykQu9k`
}

export const getCollectionMetadataUrl = () => {
  return `${BASE_URL}/QmQa28oDyAjhu3qZpNGafn9Nff5HGLtHppGio4KdfGTcU4`;
}

// https://gateway.pinata.cloud/ipfs/QmQa28oDyAjhu3qZpNGafn9Nff5HGLtHppGio4KdfGTcU4
