'use client';

import { useState } from 'react';

export default function InteractiveCounter() {
  const [count, setCount] = useState(0);

  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-4 border border-slate-700">
      <h2 className="text-xl font-semibold text-neon-green">
        Interactive Component
      </h2>
      <p className="text-slate-400">
        This component uses &lsquo;use client&rsquo; because it has state and interactivity.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-slate-200">Count: {count}</span>
        <div className="space-x-2">
          <button
            onClick={() => setCount(count - 1)}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded border border-neon-green transition-colors"
          >
            -
          </button>
          <button
            onClick={() => setCount(count + 1)}
            className="bg-neon-green hover:bg-green-400 text-black font-bold py-2 px-4 rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
