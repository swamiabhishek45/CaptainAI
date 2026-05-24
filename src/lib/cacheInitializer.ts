import { GoogleGenAI } from '@google/genai';

type CachedContextState = {
  name: string;
  expiresAt: number;
};

const CACHE_TTL_SECONDS = 3600;
const CACHE_MODEL = 'gemini-2.5-flash';

let activeCache: CachedContextState | null = null;

const historicalIplContext = {
  squads: {
    CSK: ['Ruturaj Gaikwad', 'MS Dhoni', 'Ravindra Jadeja', 'Shivam Dube', 'Matheesha Pathirana', 'Deepak Chahar'],
    MI: ['Rohit Sharma', 'Suryakumar Yadav', 'Hardik Pandya', 'Jasprit Bumrah', 'Tilak Varma', 'Piyush Chawla'],
    RCB: ['Virat Kohli', 'Faf du Plessis', 'Glenn Maxwell', 'Mohammed Siraj', 'Dinesh Karthik', 'Rajat Patidar'],
    KKR: ['Shreyas Iyer', 'Sunil Narine', 'Andre Russell', 'Rinku Singh', 'Varun Chakravarthy', 'Mitchell Starc'],
    SRH: ['Pat Cummins', 'Travis Head', 'Heinrich Klaasen', 'Abhishek Sharma', 'Bhuvneshwar Kumar', 'T Natarajan'],
    RR: ['Sanju Samson', 'Yashasvi Jaiswal', 'Jos Buttler', 'Riyan Parag', 'Yuzvendra Chahal', 'Trent Boult'],
    DC: ['Rishabh Pant', 'David Warner', 'Axar Patel', 'Kuldeep Yadav', 'Prithvi Shaw', 'Anrich Nortje'],
    PBKS: ['Shikhar Dhawan', 'Liam Livingstone', 'Arshdeep Singh', 'Sam Curran', 'Kagiso Rabada', 'Jitesh Sharma'],
    GT: ['Shubman Gill', 'Rashid Khan', 'David Miller', 'Rahul Tewatia', 'Mohit Sharma', 'Sai Sudharsan'],
    LSG: ['KL Rahul', 'Nicholas Pooran', 'Marcus Stoinis', 'Ravi Bishnoi', 'Krunal Pandya', 'Mayank Yadav']
  },
  activeVenueBaselines: {
    'MCA Stadium, Pune': {
      parFirstInnings: 182,
      chasingBias: 'moderate dew-assisted',
      boundaryProfile: 'square boundaries reward cross-bat hitting; straight boundary demands loft control',
      phaseNotes: {
        powerplay: 'new ball can skid with early carry',
        middleOvers: 'pace-off and wrist spin produce miscues into the bigger square side',
        death: 'wide yorkers and hard length into the pitch outperform predictable slot pace'
      }
    },
    'Wankhede Stadium, Mumbai': {
      parFirstInnings: 194,
      chasingBias: 'high dew and short boundary acceleration',
      boundaryProfile: 'fast outfield, value for straight hitting',
      phaseNotes: {
        powerplay: 'true bounce favors top-order intent',
        middleOvers: 'wrist spin needs boundary protection',
        death: 'missed yorkers travel quickly under dew'
      }
    }
  },
  bowlerArchetypes: {
    strikePacer: {
      strengths: ['hard length', 'wide yorker', 'high-pace bouncer'],
      risk: 'can leak if the batter uses pace into short square boundaries'
    },
    rightArmLegSpinner: {
      strengths: ['away turn to right-handers', 'wrong-un into left-handers', 'large-side boundary traps'],
      risk: 'set left-handers can slog-sweep if length is full'
    },
    leftArmOrthodox: {
      strengths: ['stump-to-stump squeeze', 'matchup into right-handers', 'low-risk darts under dew'],
      risk: 'predictable angle lets batters line up the leg side'
    },
    offCutterSeamer: {
      strengths: ['two-paced surface exploitation', 'cross-seam grip', 'mis-hit generation'],
      risk: 'skiddy dew can turn cutters into slot balls'
    }
  }
};

export async function getCachedContextId(): Promise<string | null> {
  const now = Date.now();
  if (activeCache && activeCache.expiresAt > now + 30_000) {
    return activeCache.name;
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const cache = await ai.caches.create({
    model: CACHE_MODEL,
    config: {
      displayName: 'captain-cool-ipl-historical-context',
      ttl: `${CACHE_TTL_SECONDS}s`,
      systemInstruction: {
        role: 'user',
        parts: [{ text: 'Static IPL squad, venue, and bowler archetype context for Captain Cool tactical agents.' }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(historicalIplContext) }]
        }
      ]
    }
  });

  if (!cache.name) return null;

  activeCache = {
    name: cache.name,
    expiresAt: now + CACHE_TTL_SECONDS * 1000
  };

  return activeCache.name;
}
