import type { AgentRole } from '@/types/cricket';

export const AGENT_PROFILES: Record<Exclude<AgentRole, 'captain-cool'>, string> = {
  'batting-analyst':
    'You optimize chase tempo, batter matchups, strike rotation, boundary options, and collapse prevention.',
  'bowling-analyst':
    'You optimize defensive bowling changes, over allocation, yorker/pace-off usage, and matchup pressure.',
  'fielding-analyst':
    'You optimize field placements, catching positions, boundary riders, and pressure-saving angles.',
  'impact-player-analyst':
    'You evaluate whether and when to activate the Impact Player based on leverage, dew, matchup, and innings context.'
};

export const AGENT_TITLES: Record<AgentRole, string> = {
  'batting-analyst': 'Batting Analyst',
  'bowling-analyst': 'Bowling Analyst',
  'fielding-analyst': 'Fielding Analyst',
  'impact-player-analyst': 'Impact Player Analyst',
  'captain-cool': 'Captain Cool'
};
