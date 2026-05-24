import { FunctionTool, LlmAgent } from '@google/adk';
import { Type, type Schema } from '@google/genai';
import type { MatchState } from '@/types/cricket';

export const calculateWinProbabilityInputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    innings: { type: Type.INTEGER, enum: ['1', '2'] },
    currentScore: { type: Type.NUMBER },
    wickets: { type: Type.NUMBER },
    target: { type: Type.NUMBER, nullable: true },
    requiredRunRate: { type: Type.NUMBER, nullable: true },
    over: { type: Type.NUMBER },
    ball: { type: Type.NUMBER },
    pitchConditions: {
      type: Type.STRING,
      format: 'enum',
      enum: ['turning', 'flat', 'two-paced', 'green']
    },
    dewFactor: { type: Type.BOOLEAN }
  },
  required: ['innings', 'currentScore', 'wickets', 'over', 'ball', 'pitchConditions', 'dewFactor']
};

export function calculateWinProbability(input: MatchState): {
  winProbabilityPercentage: number;
} {
  const ballsElapsed = Math.min(input.over * 6 + input.ball, 120);
  const ballsRemaining = Math.max(120 - ballsElapsed, 1);
  const oversRemaining = ballsRemaining / 6;
  const wicketsInHand = Math.max(10 - input.wickets, 0);
  const scorePressure = input.target
    ? Math.max(input.target - input.currentScore, 0)
    : Math.max(190 - input.currentScore, 0);
  const requiredRate = input.requiredRunRate ?? (scorePressure / oversRemaining);
  const currentRate = ballsElapsed > 0 ? (input.currentScore / ballsElapsed) * 6 : requiredRate;

  const pitchFactor = {
    flat: 8,
    turning: -7,
    'two-paced': -10,
    green: -5
  }[input.pitchConditions];
  const dewBonus = input.dewFactor && input.innings === 2 ? 7 : input.dewFactor ? -2 : 0;
  const rateDelta = input.innings === 2
    ? (currentRate - requiredRate) * 5
    : (currentRate - 8.5) * 4;
  const wicketsFactor = (wicketsInHand - 5) * 4.5;
  const deathOversPressure = ballsRemaining <= 24 ? -Math.max(requiredRate - 10, 0) * 3 : 0;
  const base = input.innings === 2 ? 50 : 54;
  const rawProbability = base + rateDelta + wicketsFactor + pitchFactor + dewBonus + deathOversPressure;

  return {
    winProbabilityPercentage: Number(Math.min(95, Math.max(5, rawProbability)).toFixed(1))
  };
}

export function defineTool<TInput>(options: {
  name: string;
  description: string;
  parameters: Schema;
  execute: (input: TInput) => unknown;
}): FunctionTool<Schema> {
  return new FunctionTool({
    ...options,
    execute: (input) => options.execute(input as TInput)
  });
}

export const calculateWinProbabilityTool = defineTool<MatchState>({
  name: 'calculateWinProbability',
  description: 'Calculates a simulated live cricket win probability using target pressure, run-rate pressure, wickets, pitch behavior, and dew.',
  parameters: calculateWinProbabilityInputSchema,
  execute: calculateWinProbability
});

export const Thala_Strategist = new LlmAgent({
  name: 'Thala_Strategist',
  model: 'gemini-2.5-flash',
  instruction: 'You are an elite, ice-cool cricket captain (Dhoni/Rohit mindset). Analyze the MatchState and propose the definitive next tactical move (e.g., specific bowling change, field field placements, or impact player introduction). Use authentic, sharp cricketing strategies.',
  tools: [calculateWinProbabilityTool],
  includeContents: 'none'
});

export function createThalaStrategistAgent(cachedContextId: string | null): LlmAgent {
  return new LlmAgent({
    name: 'Thala_Strategist',
    model: 'gemini-2.5-flash',
    instruction: 'You are an elite, ice-cool cricket captain (Dhoni/Rohit mindset). Analyze the MatchState, cached IPL history, venue baselines, and any visual pitch inspection. Propose the definitive next tactical move with authentic, sharp cricketing strategy.',
    tools: [calculateWinProbabilityTool],
    generateContentConfig: cachedContextId ? { cachedContent: cachedContextId } : undefined,
    includeContents: 'none'
  });
}

export const Pitch_Vision_Analyst = new LlmAgent({
  name: 'Pitch_Vision_Analyst',
  model: 'gemini-2.5-flash',
  instruction: 'You are a cricket broadcast vision analyst. Extract visible match variables from screenshots, scorecards, field settings, pitch texture, cracks, grass cover, surface dampness, and any tactical implications. Be concise and concrete.',
  includeContents: 'none'
});

export const Gauti_Advocate = new LlmAgent({
  name: 'Gauti_Advocate',
  model: 'gemini-2.5-flash',
  instruction: "You are a ruthless, hyper-analytical cricket contrarian. Your sole job is to identify fatal vulnerabilities in Thala_Strategist's proposal based on match variables like pitch behavior, match-ups, and game pressure. Break down why the proposal could backfire.",
  includeContents: 'none'
});

export const Captain_Cool_Consensus = new LlmAgent({
  name: 'Captain_Cool_Consensus',
  model: 'gemini-2.5-pro',
  instruction: "You are the ultimate match-day commander. Review the match state, read Thala_Strategist's proposal, and weigh it against Gauti_Advocate's brutal critique. Resolve the friction loop. Output an unyielding, final operational match order.",
  includeContents: 'none'
});

export const cricketStrategyAgents = [
  Pitch_Vision_Analyst,
  Thala_Strategist,
  Gauti_Advocate,
  Captain_Cool_Consensus
] as const;
