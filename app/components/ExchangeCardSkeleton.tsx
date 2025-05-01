export default function ExchangeCardSkeleton() {
  return (
    <div className="bg-[var(--card-background)] shadow rounded-xl p-4 md:p-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between mb-4">
        <div className="flex items-center mb-4 sm:mb-0">
          {/* Avatar skeleton */}
          <div className="mr-3 w-10 h-10 rounded-full bg-gray-300"></div>
          <div>
            {/* Title skeleton */}
            <div className="h-5 w-40 bg-gray-300 rounded mb-2"></div>
            {/* Subtitle skeleton */}
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Button skeleton */}
        <div className="flex space-x-2">
          <div className="h-10 w-24 bg-gray-300 rounded-lg"></div>
          <div className="h-10 w-24 bg-gray-300 rounded-lg"></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
        {/* Left book section */}
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-300 rounded mb-4"></div>
          <div className="flex flex-wrap gap-3">
            {/* Book items skeletons */}
            {[1, 2].map((i) => (
              <div
                key={i}
                className="relative flex items-center bg-[var(--background)] p-2 rounded border border-[var(--gray-200)] w-full max-w-[200px]"
              >
                {/* Book cover skeleton */}
                <div className="w-10 h-14 mr-2 flex-shrink-0 bg-gray-300 rounded"></div>
                <div className="flex-1 min-w-0">
                  {/* Book title skeleton */}
                  <div className="h-3 w-full bg-gray-300 rounded mb-2"></div>
                  {/* Book author skeleton */}
                  <div className="h-2 w-3/4 bg-gray-200 rounded mb-1"></div>
                  {/* Book link skeleton */}
                  <div className="h-2 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden md:block">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
        </div>

        {/* Right book section */}
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-300 rounded mb-4"></div>
          <div className="flex flex-wrap gap-3">
            {/* Book items skeletons */}
            {[1, 2].map((i) => (
              <div
                key={i}
                className="relative flex items-center bg-[var(--background)] p-2 rounded border border-[var(--gray-200)] w-full max-w-[200px]"
              >
                {/* Book cover skeleton */}
                <div className="w-10 h-14 mr-2 flex-shrink-0 bg-gray-300 rounded"></div>
                <div className="flex-1 min-w-0">
                  {/* Book title skeleton */}
                  <div className="h-3 w-full bg-gray-300 rounded mb-2"></div>
                  {/* Book author skeleton */}
                  <div className="h-2 w-3/4 bg-gray-200 rounded mb-1"></div>
                  {/* Book link skeleton */}
                  <div className="h-2 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
