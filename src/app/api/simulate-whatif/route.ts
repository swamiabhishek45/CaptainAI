import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateWinProbability } from '@/lib/agents';
import type { MatchState } from '@/types/cricket';

const simulateSchema = z.object({
  innings: z.union([z.literal(1), z.literal(2)]),
  over: z.number().min(0).max(19),
  ball: z.number().min(0).max(6),
  currentScore: z.number().min(0),
  wickets: z.number().min(0).max(10),
  teamBatting: z.string().min(1),
  teamBowling: z.string().min(1),
  batsmanOnStrike: z.string().min(1),
  batsmanNonStrike: z.string().min(1),
  bowlersRemainingOvers: z.record(z.string(), z.number().min(0).max(4)),
  pitchConditions: z.enum(['turning', 'flat', 'two-paced', 'green']),
  dewFactor: z.boolean(),
  venue: z.string().min(1),
  target: z.number().min(1).optional(),
  requiredRunRate: z.number().min(0).optional(),
  impactPlayerAvailable: z.boolean(),
  counterfactualDecision: z.string().min(8)
});

type WhatIfResponse = {
  originalProbability: number;
  counterfactualProbability: number;
  delta: number;
  structuralRiskExplanation: string;
};

function scoreCounterfactualRisk(matchState: MatchState, decision: string): {
  probabilityShift: number;
  explanation: string;
} {
  const text = decision.toLowerCase();
  let shift = 0;
  const reasons: string[] = [];

  if (text.includes('leg spin') || text.includes('leg spinner') || text.includes('wrist spin')) {
    const spinShift = matchState.pitchConditions === 'turning' ? 7 : matchState.dewFactor ? -9 : 2;
    shift += spinShift;
    reasons.push(spinShift > 0 ? 'wrist spin is structurally supported by the surface' : 'dew reduces grip and makes wrist-spin length control fragile');
  }

  if (text.includes('left-handed') || text.includes('left hand')) {
    shift -= 4;
    reasons.push('a set left-hander can target the slog-sweep and leg-side boundary against this matchup');
  }

  if (text.includes('strike pacer') || text.includes('pacer') || text.includes('pace')) {
    const paceShift = matchState.pitchConditions === 'green' ? 5 : matchState.pitchConditions === 'two-paced' ? -3 : 0;
    shift += paceShift;
    reasons.push(paceShift >= 0 ? 'pace remains defensible if hard lengths are available' : 'two-paced bounce makes pure pace easier to mis-time unless length is perfect');
  }

  if (matchState.requiredRunRate && matchState.requiredRunRate > 11) {
    shift += text.includes('defensive') ? -6 : 3;
    reasons.push('high required rate rewards wicket-taking intent but punishes passive fields');
  }

  if (matchState.wickets >= 6) {
    shift += 4;
    reasons.push('lower-order exposure increases the value of attacking the stumps');
  }

  if (reasons.length === 0) {
    shift -= 2;
    reasons.push('the alternate choice changes the plan without a clear structural matchup edge');
  }

  return {
    probabilityShift: Math.max(-18, Math.min(18, shift)),
    explanation: reasons.join('; ')
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = simulateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid simulation request', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { counterfactualDecision, ...matchState } = parsed.data;
  const { winProbabilityPercentage } = calculateWinProbability(matchState);
  const risk = scoreCounterfactualRisk(matchState, counterfactualDecision);
  const counterfactualProbability = Number(
    Math.min(95, Math.max(5, winProbabilityPercentage + risk.probabilityShift)).toFixed(1)
  );
  const delta = Number((counterfactualProbability - winProbabilityPercentage).toFixed(1));

  return NextResponse.json({
    originalProbability: winProbabilityPercentage,
    counterfactualProbability,
    delta,
    structuralRiskExplanation: `Counterfactual decision: "${counterfactualDecision}". ${risk.explanation}.`
  } satisfies WhatIfResponse);
}
