import type { MatchState } from '@/types/cricket';

export const sampleMatchState: MatchState = {
  innings: 2,
  over: 15,
  ball: 4,
  currentScore: 142,
  wickets: 5,
  teamBatting: 'Chennai Super Kings',
  teamBowling: 'Mumbai Indians',
  batsmanOnStrike: 'MS Dhoni',
  batsmanNonStrike: 'Ravindra Jadeja',
  bowlersRemainingOvers: {
    'Jasprit Bumrah': 2,
    'Piyush Chawla': 1,
    'Hardik Pandya': 2,
    'Gerald Coetzee': 1
  },
  pitchConditions: 'two-paced',
  dewFactor: true,
  venue: 'MCA Stadium, Pune',
  target: 186,
  requiredRunRate: 9.92,
  impactPlayerAvailable: true
};
