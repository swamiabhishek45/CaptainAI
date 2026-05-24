export interface MatchState {
  innings: 1 | 2;
  over: number;
  ball: number;
  currentScore: number;
  wickets: number;
  teamBatting: string;
  teamBowling: string;
  batsmanOnStrike: string;
  batsmanNonStrike: string;
  bowlersRemainingOvers: Record<string, number>;
  pitchConditions: 'turning' | 'flat' | 'two-paced' | 'green';
  dewFactor: boolean;
  venue: string;
  target?: number;
  requiredRunRate?: number;
  impactPlayerAvailable: boolean;
}

export type AgentRole =
  | 'batting-analyst'
  | 'bowling-analyst'
  | 'fielding-analyst'
  | 'impact-player-analyst'
  | 'captain-cool';

export interface AgentTurn {
  round: number;
  role: AgentRole;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  title: string;
  recommendation: string;
  confidence: number;
  risks: string[];
  counters: string[];
}

export interface StrategyDecision {
  call: string;
  battingPlan: string;
  bowlingPlan: string;
  fieldPlan: string;
  impactPlayerPlan: string;
  riskControls: string[];
  winProbabilitySwing: string;
}

export interface StrategyResponse {
  traceId: string;
  matchState: MatchState;
  turns: AgentTurn[];
  decision: StrategyDecision;
  usedAdk: boolean;
  adkAgentCount: number;
}

export interface StrategyApiResponse {
  proposal: string;
  dissent: string;
  finalDecision: string;
  winProbability: number;
}
