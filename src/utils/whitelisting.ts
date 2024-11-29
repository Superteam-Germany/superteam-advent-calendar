import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Initialize Google Sheets client
const getGoogleSheetsClient = () => {
  const credentials = {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
};

// Modify isWalletWhitelisted to use this first
export const isWalletWhitelisted = async (walletAddress: string): Promise<boolean> => {
  try {
    const sheets = getGoogleSheetsClient();
    const sheetName = process.env.GOOGLE_SHEET_NAME;
    if (!sheetName) {
      throw new Error('GOOGLE_SHEET_NAME is not set');
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${sheetName}!A:A`,
    });

    const values = response.data.values;
    if (!values) return false;

    // Convert wallet address to lowercase for case-insensitive comparison
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Check if wallet exists in the whitelist
    return values.some((row: string[]) => row[0]?.toLowerCase() === normalizedWalletAddress);
  } catch (error) {
    console.error('Error checking whitelist:', error);
    throw error; // Changed to throw the original error for better debugging
  }
} 