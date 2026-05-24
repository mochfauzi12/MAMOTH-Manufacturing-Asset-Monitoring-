import React, { useEffect, useState } from 'react';
import { db } from '../../../adapters/db/dexie';
import { Clock } from 'lucide-react';

export function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    db.incidents.orderBy('id').reverse().limit(10).toArray().then(setHistory);
  }, []);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 max-w-xl mx-auto">
      <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-400" />
        Riwayat Tablet Operator
      </h3>
      {history.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">Belum ada riwayat laporan offline.</p>
      ) : (
        <div className="space-y-3">
          {history.map(lh => (
            <div key={lh.id} className="p-4 bg-slate-950/50 border border-slate-900 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-200">{lh.machineName}</p>
                <p className="text-xs text-slate-400">{lh.description}</p>
              </div>
              <span className="text-xs text-indigo-400 font-mono font-bold">{lh.syncStatus}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
