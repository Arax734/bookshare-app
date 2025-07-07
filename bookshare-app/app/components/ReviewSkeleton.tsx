export default function ReviewSkeleton() {
  return (
    <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--gray-200)] transition-all duration-200 shadow animate-pulse">
      <div className="flex flex-col space-y-2">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="flex items-center space-x-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-5 w-5 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="space-y-2 mt-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
      </div>
    </div>
  );
}
