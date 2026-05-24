import { NextResponse } from 'next/server';
import { InMemorySessionService, Runner, isFinalResponse, stringifyContent } from '@google/adk';
import type { BaseAgent } from '@google/adk';
import type { Content, Part } from '@google/genai';
import { z } from 'zod';
import {
  Captain_Cool_Consensus,
  Gauti_Advocate,
  Pitch_Vision_Analyst,
  calculateWinProbability,
  createThalaStrategistAgent
} from '@/lib/agents';
import { getCachedContextId } from '@/lib/cacheInitializer';
import type { MatchState } from '@/types/cricket';

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
  impactPlayerAvailable: z.boolean(),
  base64Image: z.string().min(1).optional()
});

type StrategyRequest = MatchState & {
  base64Image?: string;
};

type StrategyApiResponse = {
  proposal: string;
  dissent: string;
  finalDecision: string;
  winProbability: number;
  visionInspection?: string;
  cachedContextId?: string | null;
};

async function runAgent(agent: BaseAgent, newMessage: Content): Promise<string> {
  const runner = new Runner({
    appName: 'captain-cool-strategy',
    agent,
    sessionService: new InMemorySessionService()
  });

  let finalText = '';
  for await (const event of runner.runEphemeral({
    userId: 'match-ops',
    newMessage
  })) {
    const text = stringifyContent(event).trim();
    if (text) finalText = text;
    if (isFinalResponse(event) && text) finalText = text;
  }

  if (!finalText) {
    throw new Error(`${agent.name} did not produce a response.`);
  }

  return finalText;
}

function textMessage(text: string): Content {
  return { role: 'user', parts: [{ text }] };
}

async function inspectPitchImage(base64Image: string): Promise<string> {
  const parts: Part[] = [
    {
      text: 'Extract match variables, run rates, field configurations, and analyze pitch textures, cracks, or surface dampness if visible.'
    },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    }
  ];

  return runAgent(Pitch_Vision_Analyst, { role: 'user', parts });
}

function fallbackStrategy(matchState: MatchState, winProbability: number, visionInspection?: string): StrategyApiResponse {
  const bestBowler = Object.entries(matchState.bowlersRemainingOvers)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'the highest-control bowler';
  const chasePressure = matchState.target
    ? `${Math.max(matchState.target - matchState.currentScore, 0)} needed with ${Math.max(120 - matchState.over * 6 - matchState.ball, 0)} balls left`
    : `${matchState.currentScore}/${matchState.wickets} after ${matchState.over}.${matchState.ball}`;
  const visionNote = visionInspection ? ` Vision feed adds: ${visionInspection}` : '';

  const proposal = `Use ${bestBowler} immediately with a hard-length, pace-off plan into the pitch. Protect long-on, deep midwicket, deep square, third, and fine leg, while keeping catching cover active. Match equation: ${chasePressure}. Win probability: ${winProbability}%.${visionNote}`;
  const dissent = `This can backfire if the surface skids under dew or the batter premeditates the leg-side boundary. A predictable pace-off plan also gives ${matchState.batsmanOnStrike} time to set early and access the shorter side.`;
  const finalDecision = `Operational order: ${bestBowler} bowls the next over. First three balls are hard length into the pitch with the leg-side boundary protected; if the batter shuffles, go wide yorker with third and deep point alive. Keep Impact Player ${matchState.impactPlayerAvailable ? 'ready for the next wicket or death-over role' : 'out of the plan because it is unavailable'}.`;

  return { proposal, dissent, finalDecision, winProbability, visionInspection };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = matchStateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid match state', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { base64Image, ...matchState } = parsed.data satisfies StrategyRequest;
  const { winProbabilityPercentage } = calculateWinProbability(matchState);

  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    return NextResponse.json(fallbackStrategy(matchState, winProbabilityPercentage));
  }

  try {
    const visionInspection = base64Image ? await inspectPitchImage(base64Image) : undefined;
    const cachedContextId = await getCachedContextId();
    const Thala_Strategist = createThalaStrategistAgent(cachedContextId);
    const enrichedState = {
      matchState,
      visualInspection: visionInspection ?? 'No image supplied.',
      cachedContextId
    };

    const proposal = await runAgent(
      Thala_Strategist,
      textMessage(`Initialization state parameters: ${JSON.stringify(enrichedState)}
Live calculateWinProbability tool output: ${JSON.stringify({ winProbabilityPercentage })}

Produce only the initial tactical concept as plain text. Be specific: name the bowler/change, field, matchup, and trigger.`)
    );

    const dissent = await runAgent(
      Gauti_Advocate,
      textMessage(`MatchState: ${JSON.stringify(matchState)}
Visual inspection: ${visionInspection ?? 'No image supplied.'}
Thala_Strategist exact proposal: ${proposal}

Produce only the dissenting viewpoint as plain text. Attack the proposal using pitch behavior, matchup risk, phase pressure, and execution risk.`)
    );

    const finalDecision = await runAgent(
      Captain_Cool_Consensus,
      textMessage(`MatchState: ${JSON.stringify(matchState)}
Visual inspection: ${visionInspection ?? 'No image supplied.'}
Win probability percentage: ${winProbabilityPercentage}
Thala_Strategist proposal: ${proposal}
Gauti_Advocate dissent: ${dissent}

Produce only the final operational match order as plain text. Resolve the friction and give the exact next tactical command.`)
    );

    return NextResponse.json({
      proposal,
      dissent,
      finalDecision,
      winProbability: winProbabilityPercentage,
      visionInspection,
      cachedContextId
    } satisfies StrategyApiResponse);
  } catch {
    return NextResponse.json(fallbackStrategy(matchState, winProbabilityPercentage));
  }
}
