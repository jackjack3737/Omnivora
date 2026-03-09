'use client';

import Link from 'next/link';
import { IbsDashboard } from '@/components/IbsDashboard';

export default function IbsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <nav className="mb-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-[#fafafa] transition-colors"
          >
            ← Torna alla Home
          </Link>
        </nav>
        <IbsDashboard title="Dashboard IBS 2.0 — Demo" />
      </div>
    </div>
  );
}
