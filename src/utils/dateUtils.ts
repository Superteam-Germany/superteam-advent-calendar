export const isValidMintingDate = (doorNumber: number) => {
  const today = new Date();
  const currentMonth = process.env.NEXT_PUBLIC_CALENDAR_START_MONTH 
    ? parseInt(process.env.NEXT_PUBLIC_CALENDAR_START_MONTH) 
    : 11; // Default to December
  
  return (
    doorNumber === today.getDate() && 
    today.getMonth() === currentMonth
  );
};

export const getCurrentDoorNumber = () => {
  const today = new Date();
  return today.getDate();
};

export const getMonthName = () => {
  const month = process.env.NEXT_PUBLIC_CALENDAR_START_MONTH 
    ? parseInt(process.env.NEXT_PUBLIC_CALENDAR_START_MONTH) 
    : 11;
  
  return month === 10 ? 'November' : 'December';
}; 