export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-[var(--background)] flex justify-center items-center z-0">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[var(--primaryColor)]"></div>
    </div>
  );
}
