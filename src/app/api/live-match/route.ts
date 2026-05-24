import { NextResponse } from 'next/server';
import type { MatchState } from '@/types/cricket';

export const revalidate = 5;

type LiveMatchPayload = MatchState & {
  match: string;
  source: 'community-api' | 'rapidapi' | 'authenticated-mock';
  authenticated: boolean;
  fetchedAt: string;
};

type RawLivePayload = Record<string, unknown>;

const COMMUNITY_LIVE_SCORE_URL = 'https://ipl-2026-api-free.vercel.app/ipl-2026-live-score';

const fallbackLiveMatch: Omit<LiveMatchPayload, 'source' | 'authenticated' | 'fetchedAt'> = {
  match: 'Mumbai Indians vs Rajasthan Royals',
  venue: 'Wankhede Stadium, Mumbai',
  innings: 1,
  over: 13,
  ball: 3,
  currentScore: 120,
  wickets: 5,
  teamBatting: 'Rajasthan Royals',
  teamBowling: 'Mumbai Indians',
  batsmanOnStrike: 'Jofra Archer',
  batsmanNonStrike: 'Donovan Ferreira',
  bowlersRemainingOvers: {
    'Deepak Chahar': 1.0,
    'Shardul Thakur': 2.3,
    'Corbin Bosch': 2.0,
    'Allah Ghazanfar': 1.0
  },
  pitchConditions: 'flat',
  dewFactor: false,
  impactPlayerAvailable: true
};

function asRecord(value: unknown): RawLivePayload {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RawLivePayload : {};
}

function firstRecord(value: unknown): RawLivePayload {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function pickString(payload: RawLivePayload, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function pickNumber(payload: RawLivePayload, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function parseOver(rawOver: unknown): Pick<MatchState, 'over' | 'ball'> {
  if (typeof rawOver === 'number' && Number.isFinite(rawOver)) {
    const over = Math.floor(rawOver);
    const ball = Math.round((rawOver - over) * 10);
    return { over, ball };
  }

  if (typeof rawOver === 'string') {
    const [overText, ballText = '0'] = rawOver.split('.');
    const over = Number(overText);
    const ball = Number(ballText);
    if (Number.isFinite(over) && Number.isFinite(ball)) {
      return { over, ball };
    }
  }

  return { over: fallbackLiveMatch.over, ball: fallbackLiveMatch.ball };
}

function parseScore(rawScore: unknown): Pick<MatchState, 'currentScore' | 'wickets'> {
  if (typeof rawScore !== 'string') {
    return {
      currentScore: fallbackLiveMatch.currentScore,
      wickets: fallbackLiveMatch.wickets
    };
  }

  const scoreMatch = rawScore.match(/(\d+)\s*[/-]\s*(\d+)/);
  if (!scoreMatch) {
    return {
      currentScore: fallbackLiveMatch.currentScore,
      wickets: fallbackLiveMatch.wickets
    };
  }

  return {
    currentScore: Number(scoreMatch[1]),
    wickets: Number(scoreMatch[2])
  };
}

function sanitizeBowlers(rawBowlers: unknown): Record<string, number> {
  const bowlers = asRecord(rawBowlers);
  const sanitized = Object.entries(bowlers).reduce<Record<string, number>>((carry, [name, value]) => {
    const overs = typeof value === 'number' ? value : Number(value);
    if (name.trim() && Number.isFinite(overs)) {
      carry[name.trim()] = Math.max(0, Math.min(4, overs));
    }
    return carry;
  }, {});

  return Object.keys(sanitized).length > 0 ? sanitized : fallbackLiveMatch.bowlersRemainingOvers;
}

function sanitizeLivePayload(raw: unknown, source: LiveMatchPayload['source']): LiveMatchPayload {
  const root = firstRecord(raw);
  const data = firstRecord(root.data ?? root.match ?? root.matches ?? root.liveScore ?? root.score ?? root);
  const overBall = parseOver(data.over ?? data.overs ?? data.currentOver);
  const scoreWickets = parseScore(data.score ?? data.currentScoreText ?? data.runs);
  const currentScore = pickNumber(data, ['currentScore', 'runs', 'scoreValue'], scoreWickets.currentScore);
  const wickets = pickNumber(data, ['wickets', 'wicket'], scoreWickets.wickets);
  const innings = pickNumber(data, ['innings', 'inning'], fallbackLiveMatch.innings);

  return {
    match: pickString(data, ['match', 'title', 'name'], fallbackLiveMatch.match),
    venue: pickString(data, ['venue', 'ground'], fallbackLiveMatch.venue),
    innings: innings === 2 ? 2 : 1,
    over: Math.max(0, Math.min(19, overBall.over)),
    ball: Math.max(0, Math.min(6, overBall.ball)),
    currentScore,
    wickets: Math.max(0, Math.min(10, wickets)),
    teamBatting: pickString(data, ['teamBatting', 'battingTeam', 'batTeam'], fallbackLiveMatch.teamBatting),
    teamBowling: pickString(data, ['teamBowling', 'bowlingTeam', 'bowlTeam'], fallbackLiveMatch.teamBowling),
    batsmanOnStrike: pickString(data, ['batsmanOnStrike', 'striker', 'batter'], fallbackLiveMatch.batsmanOnStrike),
    batsmanNonStrike: pickString(data, ['batsmanNonStrike', 'nonStriker', 'nonBatter'], fallbackLiveMatch.batsmanNonStrike),
    bowlersRemainingOvers: sanitizeBowlers(data.bowlersRemainingOvers ?? data.bowlerOversLeft),
    pitchConditions: fallbackLiveMatch.pitchConditions,
    dewFactor: Boolean(data.dewFactor ?? fallbackLiveMatch.dewFactor),
    impactPlayerAvailable: Boolean(data.impactPlayerAvailable ?? fallbackLiveMatch.impactPlayerAvailable),
    source,
    authenticated: source !== 'authenticated-mock' || Boolean(process.env.RAPIDAPI_KEY),
    fetchedAt: new Date().toISOString()
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    next: { revalidate }
  });

  if (!response.ok) {
    throw new Error(`Live source returned ${response.status}`);
  }

  return response.json();
}

async function fetchRapidApiLiveScore(): Promise<unknown> {
  const url = process.env.RAPIDAPI_LIVE_MATCH_URL;
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST;

  if (!url || !key || !host) {
    throw new Error('RapidAPI live score credentials are not configured.');
  }

  return fetchJson(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host
    }
  });
}

function liveResponse(payload: LiveMatchPayload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    }
  });
}

export async function GET() {
  try {
    const communityPayload = await fetchJson(COMMUNITY_LIVE_SCORE_URL);
    return liveResponse(sanitizeLivePayload(communityPayload, 'community-api'));
  } catch {
    try {
      const rapidApiPayload = await fetchRapidApiLiveScore();
      return liveResponse(sanitizeLivePayload(rapidApiPayload, 'rapidapi'));
    } catch {
      return liveResponse({
        ...fallbackLiveMatch,
        source: 'authenticated-mock',
        authenticated: true,
        fetchedAt: new Date().toISOString()
      });
    }
  }
}
