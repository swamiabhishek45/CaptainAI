import { NextResponse } from 'next/server';
import { z } from 'zod';
import { orchestrateStrategy } from '@/lib/strategy-engine';

const matchStateSchema = z.object({
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
  impactPlayerAvailable: z.boolean()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = matchStateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid match state', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const strategy = await orchestrateStrategy(parsed.data);
  return NextResponse.json(strategy);
}
