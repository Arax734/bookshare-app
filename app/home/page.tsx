"use client";

import { useState } from "react";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 bg-[var(--background)] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Witaj w BookShare
          </h1>
          <p className="text-[var(--gray-500)]">
            Odkryj książki dopasowane do Twoich zainteresowań
          </p>
        </div>

        {/* Genre-based Recommendations */}
        <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            Polecane w Twoich ulubionych gatunkach
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Recommendation cards will go here */}
          </div>
        </section>

        {/* Author-based Recommendations */}
        <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            Więcej od Twoich ulubionych autorów
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Recommendation cards will go here */}
          </div>
        </section>

        {/* Language-based Recommendations */}
        <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            Książki w preferowanych językach
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Recommendation cards will go here */}
          </div>
        </section>

        {/* Publication Year Recommendations */}
        <section className="bg-[var(--card-background)] rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            Z okresu, który Cię interesuje
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Recommendation cards will go here */}
          </div>
        </section>
      </div>
    </main>
  );
}
