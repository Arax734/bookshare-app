export default function ContactsLoadingSpinner() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] p-4 shadow animate-pulse"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mb-3" />
            <div className="w-32 h-5 bg-gray-200 rounded mb-2" />
            <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
            <div className="w-20 h-6 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
