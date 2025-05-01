"use client";

import { useExchanges } from "../hooks/useExchanges";
import ExchangeCard from "../components/ExchangeCard";
import ExchangeCardSkeleton from "../components/ExchangeCardSkeleton";
import { useAuth } from "../hooks/useAuth";

export default function IncomingExchangesPage() {
  const { user } = useAuth();
  const { exchanges, loading, handleAcceptExchange, handleDeclineExchange } =
    useExchanges("incoming");

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mt-16">
          <h1 className="text-2xl md:text-3xl font-semibold mb-4">
            Musisz być zalogowany, aby przeglądać wymiany
          </h1>
          <p className="text-[var(--gray-600)]">
            Zaloguj się, aby zobaczyć swoje wymiany książek
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <h2 className="text-lg sm:text-xl font-semibold text-[var(--gray-800)] mb-2 sm:mb-3">
        Przychodzące propozycje wymiany
      </h2>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <ExchangeCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {exchanges.length === 0 ? (
            <div className="text-center py-12 text-[var(--gray-500)] rounded-lg">
              <p>Nie masz żadnych propozycji wymiany</p>
            </div>
          ) : (
            <div className="space-y-6">
              {exchanges.map((exchange) => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  type="incoming"
                  onAccept={() => handleAcceptExchange(exchange)}
                  onDecline={() => handleDeclineExchange(exchange)}
                  onCancel={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
