import { GoogleGenAI } from '@google/genai';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { AGENT_PROFILES, AGENT_TITLES } from '@/lib/agent-prompts';
import { createAdkAgentRoom } from '@/lib/adk';
import { extractJson } from '@/lib/json';
import type { AgentRole, AgentTurn, MatchState, StrategyDecision, StrategyResponse } from '@/types/cricket';

const flashModel = 'gemini-2.5-flash' as const;
const proModel = 'gemini-2.5-pro' as const;
const debateRoles = Object.keys(AGENT_PROFILES) as Exclude<AgentRole, 'captain-cool'>[];

type DebatePayload = Omit<AgentTurn, 'round' | 'role' | 'model' | 'title'>;

const fallbackTurn = (
  role: Exclude<AgentRole, 'captain-cool'>,
  round: number,
  matchState: MatchState,
  previousTurns: AgentTurn[]
): AgentTurn => {
  const pressure = matchState.innings === 2 && matchState.target
    ? `${Math.max(matchState.target - matchState.currentScore, 0)} needed`
    : `${matchState.currentScore}/${matchState.wickets}`;
  const hasDeathBowler = Object.entries(matchState.bowlersRemainingOvers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'best matchup bowler';
  const prior = previousTurns.at(-1)?.recommendation ?? 'baseline field pressure';

  const playbook: Record<Exclude<AgentRole, 'captain-cool'>, DebatePayload> = {
    'batting-analyst': {
      recommendation: `Treat this as a two-over launch window: protect ${matchState.batsmanOnStrike}, target the shorter side, and keep ${pressure} visible without forcing low-percentage singles.`,
      confidence: 0.78,
      risks: ['Two-paced surface can turn hard length into miscues', 'A wicket before the 18th over shrinks finishing options'],
      counters: [`Counter to prior: ${prior}. Batting should dictate matchups before the defense locks yorker fields.`]
    },
    'bowling-analyst': {
      recommendation: `Hold ${hasDeathBowler} for overs 18 and 20, use pace-off into the pitch now, and deny the on-pace slot ball while dew is making grip harder.`,
      confidence: 0.74,
      risks: ['Dew can turn slower balls into hittable floaters', 'Predictable wide yorkers invite premeditated movement'],
      counters: [`Counter to prior: ${prior}. Bowling value comes from forcing the hitter to create pace.`]
    },
    'fielding-analyst': {
      recommendation: 'Set long-on, deep midwicket, deep square, third, and fine leg back; keep one catching cover for the slower-ball miscue.',
      confidence: 0.72,
      risks: ['Singles through cover can release pressure', 'Fine margins on boundary riders at Pune'],
      counters: [`Counter to prior: ${prior}. Field shape must sell the bowler plan, not react after contact.`]
    },
    'impact-player-analyst': {
      recommendation: matchState.impactPlayerAvailable
        ? 'Keep the Impact Player trigger live for the next wicket or the 18th over; use it only if it improves boundary hitting or death bowling by a clear matchup.'
        : 'Impact Player is unavailable, so preserve role clarity and avoid tactical churn.',
      confidence: 0.69,
      risks: ['Late substitution can disrupt settled roles', 'Using the option too early may strand a better death-over matchup'],
      counters: [`Counter to prior: ${prior}. The substitution should be a leverage tool, not a panic button.`]
    }
  };

  return {
    round,
    role,
    model: flashModel,
    title: AGENT_TITLES[role],
    ...playbook[role]
  };
};

const fallbackDecision = (matchState: MatchState, turns: AgentTurn[]): StrategyDecision => ({
  call: `Freeze the next six balls around ${matchState.batsmanOnStrike}: chase boundary matchups, but do not spend the Impact Player unless the next wicket falls or a death-over specialist becomes decisive.`,
  battingPlan: 'One batter attacks the matchup while the other guarantees strike reset. Avoid cross-bat swings until the bowler misses length.',
  bowlingPlan: 'Defend with pace-off hard length now, then reserve the strongest death option for overs 18 and 20.',
  fieldPlan: 'Protect leg-side boundaries with one catching off-side position to keep wicket pressure alive.',
  impactPlayerPlan: matchState.impactPlayerAvailable
    ? 'Delay activation until the role is specific: finisher if chasing loses a wicket, death bowler if defending the final two overs.'
    : 'No substitution available; keep the XI stable.',
  riskControls: turns.flatMap((turn) => turn.risks).slice(0, 4),
  winProbabilitySwing: 'Estimated plus 6-9% if execution keeps wickets intact through the next over.'
});

async function generateJson<T>(ai: GoogleGenAI, model: typeof flashModel | typeof proModel, prompt: string): Promise<T> {
  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: model === proModel ? 0.35 : 0.55,
      responseMimeType: 'application/json'
    }
  });

  return extractJson<T>(result.text ?? '');
}

async function runAgentTurn(
  ai: GoogleGenAI,
  role: Exclude<AgentRole, 'captain-cool'>,
  round: number,
  matchState: MatchState,
  previousTurns: AgentTurn[]
): Promise<AgentTurn> {
  if (!process.env.GOOGLE_API_KEY) {
    return fallbackTurn(role, round, matchState, previousTurns);
  }

  const prompt = `You are ${AGENT_TITLES[role]} in a multi-agent IPL strategy room.
Use model-speed thinking and produce only JSON. Do not reveal hidden chain-of-thought.
Visible output must be concise cricket strategy: recommendation, confidence from 0 to 1, risks, counters.

Specialty: ${AGENT_PROFILES[role]}
Match state: ${JSON.stringify(matchState)}
Previous visible agent turns: ${JSON.stringify(previousTurns)}

Return exactly:
{"recommendation":"string","confidence":0.75,"risks":["string"],"counters":["string"]}`;

  try {
    const payload = await generateJson<DebatePayload>(ai, flashModel, prompt);
    return {
      round,
      role,
      model: flashModel,
      title: AGENT_TITLES[role],
      recommendation: payload.recommendation,
      confidence: payload.confidence,
      risks: payload.risks,
      counters: payload.counters
    };
  } catch {
    return fallbackTurn(role, round, matchState, previousTurns);
  }
}

async function runFinalDecision(ai: GoogleGenAI, matchState: MatchState, turns: AgentTurn[]): Promise<StrategyDecision> {
  if (!process.env.GOOGLE_API_KEY) {
    return fallbackDecision(matchState, turns);
  }

  const prompt = `You are Captain Cool, the final decision agent for an IPL tactical room.
Use gemini-2.5-pro quality judgment to synthesize the visible debate. Do not reveal hidden chain-of-thought.
Return production-ready cricket instructions only as JSON.

Match state: ${JSON.stringify(matchState)}
Visible multi-agent debate: ${JSON.stringify(turns)}

Return exactly:
{"call":"string","battingPlan":"string","bowlingPlan":"string","fieldPlan":"string","impactPlayerPlan":"string","riskControls":["string"],"winProbabilitySwing":"string"}`;

  try {
    return await generateJson<StrategyDecision>(ai, proModel, prompt);
  } catch {
    return fallbackDecision(matchState, turns);
  }
}

async function writeTrace(traceId: string, payload: StrategyResponse): Promise<void> {
  const dir = path.join(process.cwd(), '.antigravity', 'traces');
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, `${traceId}.jsonl`), `${JSON.stringify({ at: new Date().toISOString(), ...payload })}\n`);
}

export async function orchestrateStrategy(matchState: MatchState): Promise<StrategyResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY ?? 'local-demo-key' });
  const adkRoom = await createAdkAgentRoom();
  const turns: AgentTurn[] = [];

  for (let round = 1; round <= 2; round += 1) {
    for (const role of debateRoles) {
      const turn = await runAgentTurn(ai, role, round, matchState, turns);
      turns.push(turn);
    }
  }

  const decision = await runFinalDecision(ai, matchState, turns);
  const traceId = `captain-cool-${Date.now()}`;
  const response: StrategyResponse = {
    traceId,
    matchState,
    turns,
    decision,
    usedAdk: adkRoom.usedAdk,
    adkAgentCount: adkRoom.agentCount
  };
  await writeTrace(traceId, response).catch(() => undefined);
  return response;
}
