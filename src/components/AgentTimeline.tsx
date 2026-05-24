import { BrainCircuit, Shield, Swords, UserRoundPlus, Waypoints } from 'lucide-react';
import type { AgentTurn } from '@/types/cricket';

const icons = {
  'batting-analyst': Swords,
  'bowling-analyst': Shield,
  'fielding-analyst': Waypoints,
  'impact-player-analyst': UserRoundPlus,
  'captain-cool': BrainCircuit
};

export function AgentTimeline({ turns }: { turns: AgentTurn[] }) {
  return (
    <div className="space-y-3">
      {turns.map((turn, index) => {
        const Icon = icons[turn.role];
        return (
          <article key={`${turn.role}-${turn.round}-${index}`} className="rounded-md border border-white/10 bg-panel/80 p-4 shadow-glow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-lime">
                  <Icon size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{turn.title}</h3>
                  <p className="text-xs text-muted">Round {turn.round} · {turn.model}</p>
                </div>
              </div>
              <span className="rounded-sm bg-lime/10 px-2 py-1 text-xs font-medium text-lime">
                {Math.round(turn.confidence * 100)}%
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/90">{turn.recommendation}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Risks</div>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-ink/75">
                  {turn.risks.map((risk) => <li key={risk}>{risk}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Counters</div>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-ink/75">
                  {turn.counters.map((counter) => <li key={counter}>{counter}</li>)}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
