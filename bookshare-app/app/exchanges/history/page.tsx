"use client";

import { useExchanges } from "../../hooks/useExchanges";
import ExchangeCard from "../../components/ExchangeCard";
import ExchangeCardSkeleton from "../../components/ExchangeCardSkeleton";
import { useAuth } from "../../hooks/useAuth";

export default function ExchangeHistoryPage() {
  const { user } = useAuth();
  const { exchanges, loading } = useExchanges("history");

  const getExchangeDisplayType = (exchange: any) => {
    if (exchange.userId === user?.uid) {
      return "history-outgoing";
    } else {
      return "history-incoming";
    }
  };

  return (
    <div className="min-h-screen">
      <h2 className="text-lg sm:text-xl font-semibold text-[var(--gray-800)] mb-2 sm:mb-3">
        Historia wymian
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
              <p>Historia wymian jest pusta</p>
            </div>
          ) : (
            <div className="space-y-6">
              {exchanges.map((exchange) => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  type={getExchangeDisplayType(exchange)}
                  onAccept={() => {}}
                  onDecline={() => {}}
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
