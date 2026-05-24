import { AGENT_PROFILES, AGENT_TITLES } from '@/lib/agent-prompts';
import type { AgentRole } from '@/types/cricket';

export interface AdkAgentRoom {
  usedAdk: boolean;
  agentCount: number;
}

export async function createAdkAgentRoom(): Promise<AdkAgentRoom> {
  try {
    const adk = await import('@google/adk');
    const LlmAgent = adk.LlmAgent as new (config: {
      name: string;
      description?: string;
      model?: string;
      instruction?: string;
      includeContents?: 'default' | 'none';
    }) => unknown;

    const agents = (Object.keys(AGENT_PROFILES) as Exclude<AgentRole, 'captain-cool'>[]).map((role) => (
      new LlmAgent({
        name: role,
        description: AGENT_TITLES[role],
        model: 'gemini-2.5-flash',
        instruction: AGENT_PROFILES[role],
        includeContents: 'none'
      })
    ));

    agents.push(new LlmAgent({
      name: 'captain-cool',
      description: AGENT_TITLES['captain-cool'],
      model: 'gemini-2.5-pro',
      instruction: 'Synthesize the visible specialist debate into a final IPL tactical decision.',
      includeContents: 'none'
    }));

    return { usedAdk: true, agentCount: agents.length };
  } catch {
    return { usedAdk: false, agentCount: 0 };
  }
}
