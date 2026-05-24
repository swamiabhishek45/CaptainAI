'use client';

import { useEffect, useMemo, useState } from 'react';
import { Radio, ScanLine, ToggleLeft, ToggleRight } from 'lucide-react';
import type { MatchState } from '@/types/cricket';

type LiveStreamDeckProps = {
  onIngestSnapshot: (snapshot: MatchState) => void;
};

type AnalysisLogEntry = {
  id: string;
  text: string;
};

const broadcastFrameUrl = process.env.NEXT_PUBLIC_LIVE_STREAM_EMBED_URL?.trim();

const simulatedSnapshots: MatchState[] = [
  {
    innings: 1,
    over: 14,
    ball: 4,
    currentScore: 128,
    wickets: 5,
    teamBatting: 'Rajasthan Royals',
    teamBowling: 'Mumbai Indians',
    batsmanOnStrike: 'Donovan Ferreira',
    batsmanNonStrike: 'Jofra Archer',
    bowlersRemainingOvers: {
      'Deepak Chahar': 1,
      'Shardul Thakur': 2.2,
      'Corbin Bosch': 2,
      'Allah Ghazanfar': 1
    },
    pitchConditions: 'flat',
    dewFactor: false,
    venue: 'Wankhede Stadium, Mumbai',
    impactPlayerAvailable: true
  },
  {
    innings: 1,
    over: 15,
    ball: 1,
    currentScore: 134,
    wickets: 5,
    teamBatting: 'Rajasthan Royals',
    teamBowling: 'Mumbai Indians',
    batsmanOnStrike: 'Jofra Archer',
    batsmanNonStrike: 'Donovan Ferreira',
    bowlersRemainingOvers: {
      'Deepak Chahar': 1,
      'Shardul Thakur': 2,
      'Corbin Bosch': 1.5,
      'Allah Ghazanfar': 1
    },
    pitchConditions: 'flat',
    dewFactor: true,
    venue: 'Wankhede Stadium, Mumbai',
    impactPlayerAvailable: true
  },
  {
    innings: 1,
    over: 15,
    ball: 5,
    currentScore: 141,
    wickets: 6,
    teamBatting: 'Rajasthan Royals',
    teamBowling: 'Mumbai Indians',
    batsmanOnStrike: 'Donovan Ferreira',
    batsmanNonStrike: 'Jofra Archer',
    bowlersRemainingOvers: {
      'Deepak Chahar': 1,
      'Shardul Thakur': 1.5,
      'Corbin Bosch': 1.5,
      'Allah Ghazanfar': 1
    },
    pitchConditions: 'flat',
    dewFactor: true,
    venue: 'Wankhede Stadium, Mumbai',
    impactPlayerAvailable: true
  }
];

const analysisTemplates = [
  'Scanning Over 14.4: Donovan Ferreira on strike vs Raghu Sharma. Fielders shifting to deep mid-wicket and long-on.',
  'Identifying visual signs of evening dew on outfield grass. Ball skid probability rising for seamers operating cross-seam.',
  'Boundary map update: Wankhede square pockets look protected. Third and deep point remain available for wide-yorker plans.',
  'Scorebug OCR pass complete: RR middle order under wicket pressure. MI keeping one over of Deepak Chahar in reserve.',
  'Pitch pixel scan: surface still true, but darker sheen near good length suggests pace-off grip is dropping.'
];

function timestamp() {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
}

function createLogEntry(text: string): AnalysisLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text
  };
}

function buildBroadcastFrame(snapshot: MatchState) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        color: #e5e7eb;
        background:
          radial-gradient(circle at 20% 15%, rgba(244, 63, 94, 0.22), transparent 28rem),
          linear-gradient(135deg, #020617 0%, #09090b 48%, #111827 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .frame {
        display: grid;
        min-height: 100vh;
        grid-template-rows: auto 1fr auto;
        padding: 24px;
      }
      .top, .bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .live {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: #fecdd3;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #f43f5e;
        box-shadow: 0 0 24px rgba(244, 63, 94, .9);
      }
      .score {
        align-self: center;
        display: grid;
        gap: 18px;
        text-align: center;
      }
      .match {
        color: #94a3b8;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .16em;
        text-transform: uppercase;
      }
      .runs {
        color: #f8fafc;
        font-size: clamp(58px, 10vw, 116px);
        font-weight: 900;
        line-height: .9;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
      }
      .pill {
        border: 1px solid rgba(148, 163, 184, .28);
        border-radius: 10px;
        background: rgba(15, 23, 42, .72);
        padding: 10px 14px;
        color: #cbd5e1;
        font-size: 13px;
        font-weight: 700;
      }
      .ticker {
        overflow: hidden;
        border-top: 1px solid rgba(148, 163, 184, .22);
        padding-top: 16px;
        color: #cbd5e1;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <main class="frame">
      <section class="top">
        <div class="live"><span class="dot"></span>Live Broadcast Simulation</div>
        <div class="pill">Wankhede Stadium, Mumbai</div>
      </section>
      <section class="score">
        <div class="match">${snapshot.teamBatting} vs ${snapshot.teamBowling}</div>
        <div class="runs">${snapshot.currentScore}/${snapshot.wickets}</div>
        <div class="meta">
          <div class="pill">Over ${snapshot.over}.${snapshot.ball}</div>
          <div class="pill">On strike: ${snapshot.batsmanOnStrike}</div>
          <div class="pill">Pitch: ${snapshot.pitchConditions}</div>
          <div class="pill">${snapshot.dewFactor ? 'Dew visible' : 'Dry outfield'}</div>
        </div>
      </section>
      <section class="bottom">
        <div class="ticker">AI video bridge active: field map, scorebug OCR, surface sheen and wicket pressure are being sampled every 15 seconds.</div>
      </section>
    </main>
  </body>
</html>`;
}

export default function LiveStreamDeck({ onIngestSnapshot }: LiveStreamDeckProps) {
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const [analysisLog, setAnalysisLog] = useState<AnalysisLogEntry[]>([
    {
      id: 'initial-live-analysis-log',
      text: 'Gemini Multimodal Live Analysis Feed initialized for MI vs RR at Wankhede.'
    }
  ]);

  const activeSnapshot = useMemo(
    () => simulatedSnapshots[scanIndex % simulatedSnapshots.length],
    [scanIndex]
  );
  const fallbackBroadcastFrame = useMemo(
    () => buildBroadcastFrame(activeSnapshot),
    [activeSnapshot]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setScanIndex((currentIndex) => {
        const nextIndex = currentIndex + 1;
        const nextMessage = analysisTemplates[nextIndex % analysisTemplates.length];
        setAnalysisLog((current) => {
          return [createLogEntry(`${timestamp()} | ${nextMessage}`), ...current].slice(0, 7);
        });
        return nextIndex;
      });
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (automationEnabled) {
      onIngestSnapshot(activeSnapshot);
    }
  }, [activeSnapshot, automationEnabled, onIngestSnapshot]);

  function toggleAutomation() {
    const nextEnabled = !automationEnabled;
    setAutomationEnabled(nextEnabled);
    if (nextEnabled) {
      onIngestSnapshot(activeSnapshot);
      setAnalysisLog((current) => [
        createLogEntry(`${timestamp()} | Automate Engine Ingestion enabled. MatchState synchronized from broadcast OCR snapshot.`),
        ...current
      ].slice(0, 7));
    }
  }

  return (
    <section className="rounded-md border border-slate-800 bg-zinc-950/95 p-4 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-rose-500" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300">
              LIVE BROADCAST DECK — MI vs RR | WANKHEDE STADIUM
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-100">Video intelligence cockpit</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAutomation}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
            automationEnabled
              ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
          }`}
        >
          {automationEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          Automate Engine Ingestion
        </button>
      </div>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black">
        <iframe
          title="MI vs RR live broadcast deck"
          src={broadcastFrameUrl || undefined}
          srcDoc={broadcastFrameUrl ? undefined : fallbackBroadcastFrame}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <ScanLine size={16} className="text-rose-300" />
            Gemini Multimodal Live Analysis Feed
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-black/30 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-400">
            <Radio size={13} className={automationEnabled ? 'text-rose-300' : 'text-slate-500'} />
            {automationEnabled ? 'OCR driving MatchState' : 'Observation only'}
          </div>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto p-4 font-mono text-xs leading-5 text-slate-300">
          {analysisLog.map((entry) => (
            <p key={entry.id} className="rounded border border-slate-800 bg-black/25 px-3 py-2">
              {entry.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
