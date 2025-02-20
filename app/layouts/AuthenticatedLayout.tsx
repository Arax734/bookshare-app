import Navbar from "../components/Navbar";
import LoadingWrapper from "../components/LoadingWrapper";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadingComponent = (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <LoadingWrapper loadingComponent={loadingComponent}>
        <div className="pt-[100px]">{children}</div>
      </LoadingWrapper>
    </>
  );
}
