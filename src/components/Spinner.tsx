export const Spinner = () => {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-blue-500 text-sm">Minting Door...</span>
    </div>
  );
}; 