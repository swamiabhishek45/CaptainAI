'use client';

import { useMemo, useState } from 'react';
import { Activity, Bot, ChevronRight, FileJson, Loader2, Trophy } from 'lucide-react';
import { Metric } from '@/components/Metric';
import { sampleMatchState } from '@/lib/sample-match';
import type { MatchState, StrategyApiResponse } from '@/types/cricket';

export default function Home() {
  const [matchState, setMatchState] = useState<MatchState>(sampleMatchState);
  const [strategy, setStrategy] = useState<StrategyApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chaseEquation = useMemo(() => {
    if (!matchState.target) return `${matchState.currentScore}/${matchState.wickets}`;
    return `${Math.max(matchState.target - matchState.currentScore, 0)} off ${Math.max(120 - matchState.over * 6 - matchState.ball, 0)}`;
  }, [matchState]);

  async function runStrategy() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchState)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Strategy request failed');
      setStrategy(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Strategy request failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 md:px-8">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[390px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-md border border-white/10 bg-panel/90 p-5 shadow-glow">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-lime text-black">
                <Trophy size={20} />
              </span>
              <div>
                <h1 className="text-xl font-semibold">Captain Cool</h1>
                <p className="text-sm text-muted">The Multi-Agent IPL Match Strategist</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Equation" value={chaseEquation} tone="accent" />
              <Metric label="Score" value={`${matchState.currentScore}/${matchState.wickets}`} />
              <Metric label="Over" value={`${matchState.over}.${matchState.ball}`} />
              <Metric label="RRR" value={String(matchState.requiredRunRate ?? '-')} tone="danger" />
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-panel/90 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Activity size={16} className="text-lime" />
              Match State
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-muted">
                Venue
                <input className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-ink outline-none focus:border-lime/60" value={matchState.venue} onChange={(event) => setMatchState({ ...matchState, venue: event.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-muted">
                  Score
                  <input type="number" className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-ink outline-none focus:border-lime/60" value={matchState.currentScore} onChange={(event) => setMatchState({ ...matchState, currentScore: Number(event.target.value) })} />
                </label>
                <label className="block text-xs text-muted">
                  Wickets
                  <input type="number" className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-ink outline-none focus:border-lime/60" value={matchState.wickets} onChange={(event) => setMatchState({ ...matchState, wickets: Number(event.target.value) })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-muted">
                  Over
                  <input type="number" className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-ink outline-none focus:border-lime/60" value={matchState.over} onChange={(event) => setMatchState({ ...matchState, over: Number(event.target.value) })} />
                </label>
                <label className="block text-xs text-muted">
                  Ball
                  <input type="number" className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-ink outline-none focus:border-lime/60" value={matchState.ball} onChange={(event) => setMatchState({ ...matchState, ball: Number(event.target.value) })} />
                </label>
              </div>
              <label className="block text-xs text-muted">
                Pitch
                <select className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-ink outline-none focus:border-lime/60" value={matchState.pitchConditions} onChange={(event) => setMatchState({ ...matchState, pitchConditions: event.target.value as MatchState['pitchConditions'] })}>
                  <option value="two-paced">Two-paced</option>
                  <option value="flat">Flat</option>
                  <option value="turning">Turning</option>
                  <option value="green">Green</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMatchState({ ...matchState, dewFactor: !matchState.dewFactor })} className="rounded-md border border-white/10 px-3 py-2 text-sm text-ink hover:border-lime/50">
                  Dew {matchState.dewFactor ? 'On' : 'Off'}
                </button>
                <button type="button" onClick={() => setMatchState({ ...matchState, impactPlayerAvailable: !matchState.impactPlayerAvailable })} className="rounded-md border border-white/10 px-3 py-2 text-sm text-ink hover:border-lime/50">
                  Impact {matchState.impactPlayerAvailable ? 'Ready' : 'Used'}
                </button>
              </div>
              <button type="button" onClick={runStrategy} disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-3 text-sm font-semibold text-black transition hover:bg-lime/90 disabled:cursor-wait disabled:opacity-70">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                Run Agent Room
              </button>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-md border border-white/10 bg-panel/90 p-5 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">GDG Cloud Pune APL Hackathon Console</p>
                <h2 className="mt-1 text-2xl font-semibold">ADK multi-agent tactical loop</h2>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-muted">
                <FileJson size={14} />
                {strategy ? 'strict JSON ready' : 'strategy pending'}
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Metric label="Flash Agents" value="2 agents" tone="accent" />
              <Metric label="Final Model" value="Gemini 2.5 Pro" />
              <Metric label="ADK Agents" value="3 named" />
              <Metric label="Mode" value={process.env.NEXT_PUBLIC_DEMO_MODE ? 'Demo' : 'Live API'} />
            </div>
          </div>

          {strategy ? (
            <>
              <div className="rounded-md border border-lime/30 bg-lime/10 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-lime">
                  <ChevronRight size={16} />
                  Captain Cool Final Call
                </div>
                <p className="mt-3 text-lg font-semibold leading-7">{strategy.finalDecision}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Metric label="Thala Proposal" value={strategy.proposal} />
                  <Metric label="Gauti Dissent" value={strategy.dissent} />
                  <Metric label="Win Probability" value={`${strategy.winProbability}%`} tone="accent" />
                  <Metric label="Response Shape" value="proposal, dissent, finalDecision, winProbability" />
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-md border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <div>
                <Bot className="mx-auto text-lime" size={36} />
                <h2 className="mt-4 text-xl font-semibold">Agent room standing by</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                  Run the strategist to trigger separate Gemini Flash agent turns, cross-agent counters, trace logging, and a Gemini Pro final call.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
