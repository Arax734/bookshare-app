"use client";

import { useExchanges } from "../../hooks/useExchanges";
import ExchangeCard from "../../components/ExchangeCard";
import ExchangeCardSkeleton from "../../components/ExchangeCardSkeleton";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useEffect } from "react";

export default function OutgoingExchangesPage() {
  const { user } = useAuth();
  const { exchanges, loading, handleCancelExchange } = useExchanges("outgoing");
  const {
    refreshHistoryExchangesCount,
    refreshOutgoingExchangesCount,
    decrementOutgoingCount,
  } = useNotifications();

  useEffect(() => {
    if (user) {
      refreshHistoryExchangesCount();
      refreshOutgoingExchangesCount();
    }
  }, [user, refreshHistoryExchangesCount, refreshOutgoingExchangesCount]);

  const handleExchangeCancel = (exchange: any) => {
    handleCancelExchange(exchange);
    decrementOutgoingCount();
  };

  return (
    <div className="min-h-screen">
      <h2 className="text-lg sm:text-xl font-semibold text-[var(--gray-800)] mb-2 sm:mb-3">
        Wysłane propozycje wymiany
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
              <p>Nie masz żadnych wysłanych propozycji wymiany</p>
            </div>
          ) : (
            <div className="space-y-6">
              {exchanges.map((exchange) => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  type="outgoing"
                  onAccept={() => {}}
                  onDecline={() => {}}
                  onCancel={() => handleExchangeCancel(exchange)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
