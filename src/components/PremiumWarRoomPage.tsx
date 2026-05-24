'use client';

import { ChangeEvent, DragEvent, useCallback, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Command,
  Gauge,
  GitCompareArrows,
  ImagePlus,
  Loader2,
  Radio,
  ShieldAlert,
  Sparkles,
  Trophy,
  UploadCloud,
  Zap
} from 'lucide-react';
import LiveStreamDeck from '@/components/LiveStreamDeck';
import { sampleMatchState } from '@/lib/sample-match';
import type { MatchState, StrategyApiResponse } from '@/types/cricket';

type AdvancedStrategyResponse = StrategyApiResponse & {
  visionInspection?: string;
  cachedContextId?: string | null;
};

type WhatIfResponse = {
  originalProbability: number;
  counterfactualProbability: number;
  delta: number;
  structuralRiskExplanation: string;
};

type AgentStep = {
  name: 'Pitch_Vision_Analyst' | 'Thala_Strategist' | 'Gauti_Advocate' | 'Captain_Cool_Consensus';
  label: string;
  status: 'waiting' | 'running' | 'done';
  text: string;
};

const fieldClass = 'mt-1 w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-ink outline-none transition focus:border-lime/70';
const smallLabelClass = 'block text-[11px] font-medium uppercase tracking-wide text-muted';

function parseBowlers(text: string): Record<string, number> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, number>>((carry, line) => {
      const [name, value] = line.split(':');
      if (name?.trim()) carry[name.trim()] = Math.max(0, Math.min(4, Number(value ?? 0)));
      return carry;
    }, {});
}

function formatBowlers(bowlers: Record<string, number>) {
  return Object.entries(bowlers)
    .map(([name, overs]) => `${name}: ${overs}`)
    .join('\n');
}

function setNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripDataUrl(dataUrl: string) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

export default function PremiumWarRoomPage() {
  const [matchState, setMatchState] = useState<MatchState>(sampleMatchState);
  const [liveUrl, setLiveUrl] = useState('');
  const [bowlersText, setBowlersText] = useState(formatBowlers(sampleMatchState.bowlersRemainingOvers));
  const [base64Image, setBase64Image] = useState<string | undefined>();
  const [imageName, setImageName] = useState('');
  const [strategy, setStrategy] = useState<AdvancedStrategyResponse | null>(null);
  const [whatIfText, setWhatIfText] = useState('');
  const [whatIf, setWhatIf] = useState<WhatIfResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const ballsLeft = Math.max(120 - matchState.over * 6 - matchState.ball, 0);
  const equation = useMemo(() => {
    if (!matchState.target) return `${matchState.currentScore}/${matchState.wickets}`;
    return `${Math.max(matchState.target - matchState.currentScore, 0)} off ${ballsLeft}`;
  }, [ballsLeft, matchState.currentScore, matchState.target, matchState.wickets]);

  const hasImage = Boolean(base64Image);
  const steps: AgentStep[] = [
    {
      name: 'Pitch_Vision_Analyst',
      label: 'Multimodal pitch and scorecard extraction',
      status: strategy?.visionInspection ? 'done' : isLoading && hasImage && activeStep >= 0 ? 'running' : hasImage ? 'waiting' : 'done',
      text: strategy?.visionInspection ?? (hasImage ? 'Screenshot queued for score, field, texture, cracks, and dampness extraction.' : 'No image attached; manual state feed is driving the room.')
    },
    {
      name: 'Thala_Strategist',
      label: 'Cached-context tactical concept',
      status: strategy ? 'done' : isLoading && activeStep >= 1 ? 'running' : 'waiting',
      text: strategy?.proposal ?? 'Reading the equation, cached IPL context, pitch, matchups, and win-probability pulse.'
    },
    {
      name: 'Gauti_Advocate',
      label: 'Contrarian pressure test',
      status: strategy ? 'done' : isLoading && activeStep >= 2 ? 'running' : 'waiting',
      text: strategy?.dissent ?? 'Waiting to receive Thala_Strategist exact words before attacking the weak points.'
    },
    {
      name: 'Captain_Cool_Consensus',
      label: 'Final order synthesis',
      status: strategy ? 'done' : isLoading && activeStep >= 3 ? 'running' : 'waiting',
      text: strategy?.finalDecision ?? 'Standing by to settle the argument into one clean match command.'
    }
  ];

  async function runStrategy() {
    setIsLoading(true);
    setError(null);
    setStrategy(null);
    setWhatIf(null);
    setActiveStep(hasImage ? 0 : 1);

    const timers = [
      window.setTimeout(() => setActiveStep(1), 500),
      window.setTimeout(() => setActiveStep(2), 1100),
      window.setTimeout(() => setActiveStep(3), 1700)
    ];

    try {
      const response = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...matchState, base64Image })
      });
      const payload: AdvancedStrategyResponse & { error?: string } = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Strategy request failed');
      setStrategy(payload);
      setActiveStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Strategy request failed');
    } finally {
      timers.forEach(window.clearTimeout);
      setIsLoading(false);
    }
  }

  function updateMatchState(patch: Partial<MatchState>) {
    setMatchState((current) => ({ ...current, ...patch }));
  }

  const ingestLiveVideoSnapshot = useCallback((snapshot: MatchState) => {
    setMatchState(snapshot);
    setBowlersText(formatBowlers(snapshot.bowlersRemainingOvers));
    setLiveUrl('Live Broadcast Deck OCR');
  }, []);

  async function ingestImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBase64Image(stripDataUrl(String(reader.result)));
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void ingestImage(event.dataTransfer.files[0]);
  }

  function handleImageInput(event: ChangeEvent<HTMLInputElement>) {
    void ingestImage(event.target.files?.[0]);
  }

  async function simulateWhatIf() {
    if (!whatIfText.trim()) return;
    setIsSimulating(true);
    setError(null);

    try {
      const response = await fetch('/api/simulate-whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...matchState, counterfactualDecision: whatIfText })
      });
      const payload: WhatIfResponse & { error?: string } = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Simulation failed');
      setWhatIf(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  }

  const deltaTone = (whatIf?.delta ?? 0) >= 0 ? 'border-lime/40 bg-lime/15 text-lime' : 'border-danger/40 bg-danger/15 text-danger';
  const deltaLabel = whatIf ? `${whatIf.delta > 0 ? '+' : ''}${whatIf.delta}% Win Probability ${whatIf.delta >= 0 ? 'Shift' : 'Drop'}` : 'Awaiting Simulation';

  return (
    <main className="min-h-screen px-4 py-5 text-ink md:px-6">
      <section className="mx-auto grid max-w-[1800px] gap-4 xl:grid-cols-[370px_minmax(420px,1fr)_390px]">
        <aside className="rounded-md border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Advanced Match Control Deck</p>
              <h1 className="mt-1 text-xl font-semibold">Captain Cool</h1>
            </div>
            <span className="grid size-10 place-items-center rounded-md bg-lime text-black">
              <Trophy size={19} />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase text-muted">Equation</p>
              <p className="mt-1 text-base font-semibold text-lime">{equation}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase text-muted">Over</p>
              <p className="mt-1 text-base font-semibold">{matchState.over}.{matchState.ball}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase text-muted">RRR</p>
              <p className="mt-1 text-base font-semibold text-danger">{matchState.requiredRunRate ?? '-'}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-lime/35 bg-lime/[0.06] px-4 py-5 text-center transition hover:border-lime/70"
            >
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageInput} />
              <UploadCloud size={24} className="text-lime" />
              <span className="mt-3 text-sm font-semibold">{imageName || 'Drop scorecard or pitch image'}</span>
              <span className="mt-1 text-xs leading-5 text-muted">JPEG/PNG feed primes Pitch_Vision_Analyst before the strategy loop.</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className={smallLabelClass}>
                Batting Team
                <input className={fieldClass} value={matchState.teamBatting} onChange={(event) => updateMatchState({ teamBatting: event.target.value })} />
              </label>
              <label className={smallLabelClass}>
                Bowling Team
                <input className={fieldClass} value={matchState.teamBowling} onChange={(event) => updateMatchState({ teamBowling: event.target.value })} />
              </label>
            </div>

            <label className={smallLabelClass}>
              Live Match URL
              <input className={fieldClass} placeholder="Paste Cricbuzz or ESPNCricinfo URL" value={liveUrl} onChange={(event) => setLiveUrl(event.target.value)} />
            </label>

            <label className={smallLabelClass}>
              Venue
              <input className={fieldClass} value={matchState.venue} onChange={(event) => updateMatchState({ venue: event.target.value })} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className={smallLabelClass}>
                Striker
                <input className={fieldClass} value={matchState.batsmanOnStrike} onChange={(event) => updateMatchState({ batsmanOnStrike: event.target.value })} />
              </label>
              <label className={smallLabelClass}>
                Non-Striker
                <input className={fieldClass} value={matchState.batsmanNonStrike} onChange={(event) => updateMatchState({ batsmanNonStrike: event.target.value })} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className={smallLabelClass}>
                Score
                <input type="number" className={fieldClass} value={matchState.currentScore} onChange={(event) => updateMatchState({ currentScore: setNumber(event.target.value) })} />
              </label>
              <label className={smallLabelClass}>
                Innings
                <select className={fieldClass} value={matchState.innings} onChange={(event) => updateMatchState({ innings: Number(event.target.value) as 1 | 2 })}>
                  <option value={1}>1st</option>
                  <option value={2}>2nd</option>
                </select>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
                <span>Over</span>
                <span className="text-ink">{matchState.over}</span>
              </div>
              <input type="range" min={0} max={19} value={matchState.over} onChange={(event) => updateMatchState({ over: setNumber(event.target.value) })} className="mt-2 w-full accent-lime" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
                  <span>Ball</span>
                  <span className="text-ink">{matchState.ball}</span>
                </div>
                <input type="range" min={0} max={6} value={matchState.ball} onChange={(event) => updateMatchState({ ball: setNumber(event.target.value) })} className="mt-2 w-full accent-lime" />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
                  <span>Wickets</span>
                  <span className="text-ink">{matchState.wickets}</span>
                </div>
                <input type="range" min={0} max={10} value={matchState.wickets} onChange={(event) => updateMatchState({ wickets: setNumber(event.target.value) })} className="mt-2 w-full accent-danger" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className={smallLabelClass}>
                Target
                <input type="number" className={fieldClass} value={matchState.target ?? ''} onChange={(event) => updateMatchState({ target: event.target.value ? setNumber(event.target.value) : undefined })} />
              </label>
              <label className={smallLabelClass}>
                Required RR
                <input type="number" step="0.01" className={fieldClass} value={matchState.requiredRunRate ?? ''} onChange={(event) => updateMatchState({ requiredRunRate: event.target.value ? setNumber(event.target.value) : undefined })} />
              </label>
            </div>

            <label className={smallLabelClass}>
              Pitch
              <select className={fieldClass} value={matchState.pitchConditions} onChange={(event) => updateMatchState({ pitchConditions: event.target.value as MatchState['pitchConditions'] })}>
                <option value="two-paced">Two-paced</option>
                <option value="flat">Flat</option>
                <option value="turning">Turning</option>
                <option value="green">Green</option>
              </select>
            </label>

            <label className={smallLabelClass}>
              Bowlers Remaining
              <textarea
                className={`${fieldClass} min-h-24 resize-none leading-5`}
                value={bowlersText}
                onChange={(event) => {
                  setBowlersText(event.target.value);
                  updateMatchState({ bowlersRemainingOvers: parseBowlers(event.target.value) });
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => updateMatchState({ dewFactor: !matchState.dewFactor })} className={`rounded-md border px-3 py-3 text-sm font-semibold transition ${matchState.dewFactor ? 'border-lime/50 bg-lime/15 text-lime' : 'border-white/10 bg-white/[0.03] text-muted'}`}>
                Dew {matchState.dewFactor ? 'On' : 'Off'}
              </button>
              <button type="button" onClick={() => updateMatchState({ impactPlayerAvailable: !matchState.impactPlayerAvailable })} className={`rounded-md border px-3 py-3 text-sm font-semibold transition ${matchState.impactPlayerAvailable ? 'border-lime/50 bg-lime/15 text-lime' : 'border-white/10 bg-white/[0.03] text-muted'}`}>
                Impact {matchState.impactPlayerAvailable ? 'Ready' : 'Used'}
              </button>
            </div>

            <button type="button" onClick={runStrategy} disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-3 text-sm font-bold text-black transition hover:bg-lime/90 disabled:cursor-wait disabled:opacity-70">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Run Advanced War Room
            </button>
            {error && <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          </div>
        </aside>

        <section className="space-y-4 rounded-md border border-white/10 bg-black/20 p-4 shadow-glow">
          <LiveStreamDeck onIngestSnapshot={ingestLiveVideoSnapshot} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">The War Room Log</p>
              <h2 className="mt-1 text-2xl font-semibold">Multimodal agent execution canvas</h2>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted">
              <Radio size={14} className={isLoading ? 'text-lime' : ''} />
              {isLoading ? 'Live reasoning loop' : strategy ? 'Consensus locked' : 'Awaiting toss call'}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted"><Gauge size={14} /> Chase</div>
              <p className="mt-2 text-xl font-semibold">{equation}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted"><Activity size={14} /> Surface</div>
              <p className="mt-2 text-xl font-semibold capitalize">{matchState.pitchConditions}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted"><ImagePlus size={14} /> Vision</div>
              <p className="mt-2 truncate text-sm font-semibold">{imageName || 'Manual only'}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted"><Sparkles size={14} /> Cache</div>
              <p className="mt-2 truncate text-sm font-semibold">{strategy?.cachedContextId ? 'Context cache active' : 'Prepared on run'}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <article key={step.name} className={`rounded-md border p-4 transition ${step.status === 'done' ? 'border-lime/35 bg-lime/[0.06]' : step.status === 'running' ? 'border-seam/40 bg-seam/[0.06]' : 'border-white/10 bg-white/[0.025]'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-9 place-items-center rounded-md border ${step.status === 'done' ? 'border-lime/40 text-lime' : step.status === 'running' ? 'border-seam/50 text-seam' : 'border-white/10 text-muted'}`}>
                      {step.status === 'done' ? <CheckCircle2 size={17} /> : step.status === 'running' ? <Loader2 size={17} className="animate-spin" /> : <Bot size={17} />}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">{step.name}</h3>
                      <p className="text-xs text-muted">{step.label}</p>
                    </div>
                  </div>
                  <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
                    Step {index + 1}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink/85">{step.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GitCompareArrows size={16} className="text-lime" />
              Divergent Timelines
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-lime/25 bg-lime/[0.06] p-4">
                <p className="text-[11px] uppercase tracking-wide text-lime/75">Standard recommendation timeline</p>
                <p className="mt-3 text-sm leading-6 text-ink/85">{strategy?.finalDecision ?? 'Run the war room to lock the baseline tactical path.'}</p>
                <div className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold">
                  Baseline Win Probability: {strategy ? `${strategy.winProbability}%` : '--'}
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-black/25 p-4">
                <label className={smallLabelClass}>
                  Test a different choice...
                  <textarea
                    className={`${fieldClass} min-h-28 resize-none leading-5`}
                    placeholder="What if we bowl a right-arm leg spinner to a set left-handed batsman instead of our strike pacer?"
                    value={whatIfText}
                    onChange={(event) => setWhatIfText(event.target.value)}
                  />
                </label>
                <button type="button" onClick={simulateWhatIf} disabled={isSimulating || !whatIfText.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-lime/40 bg-lime/10 px-4 py-3 text-sm font-bold text-lime transition hover:bg-lime/15 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSimulating ? <Loader2 size={16} className="animate-spin" /> : <GitCompareArrows size={16} />}
                  Simulate
                </button>
                <div className={`mt-4 rounded-md border px-3 py-3 text-center text-base font-bold ${deltaTone}`}>
                  {deltaLabel}
                </div>
                {whatIf && (
                  <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-ink/80">
                    {whatIf.structuralRiskExplanation} Original {whatIf.originalProbability}%, alternate {whatIf.counterfactualProbability}%.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-md border border-lime/25 bg-[#080c0d]/95 p-4 shadow-glow">
          <div className="flex items-center justify-between gap-3 border-b border-lime/20 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-lime/70">The Final Verdict Canvas</p>
              <h2 className="mt-1 text-xl font-semibold">Captain&apos;s Terminal</h2>
            </div>
            <span className="grid size-10 place-items-center rounded-md border border-lime/30 text-lime">
              <Command size={18} />
            </span>
          </div>

          <div className="mt-4 rounded-md border border-lime/20 bg-black p-4 font-mono">
            <div className="flex items-center gap-2 text-xs text-lime/80">
              <span className="size-2 rounded-full bg-lime" />
              CAPTAIN_COOL_CONSENSUS
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-wide text-muted">Final match order</p>
            <p className="mt-3 text-lg font-bold leading-8 text-ink">
              {strategy?.finalDecision ?? (isLoading ? 'Hold tight. The room is checking the matchup before the captain sends the next ball plan.' : 'No call yet. Load the match state and run the room.')}
            </p>
          </div>

          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert size={16} className="text-danger" />
              Structural Warning
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/75">
              {strategy?.dissent ?? 'The dissent note will appear here once Thala makes the first move.'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted">Win Pulse</p>
              <p className="mt-1 text-2xl font-semibold text-lime">{strategy ? `${strategy.winProbability}%` : '--'}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted">Delta</p>
              <p className={`mt-1 text-2xl font-semibold ${(whatIf?.delta ?? 0) >= 0 ? 'text-lime' : 'text-danger'}`}>{whatIf ? `${whatIf.delta > 0 ? '+' : ''}${whatIf.delta}%` : '--'}</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
