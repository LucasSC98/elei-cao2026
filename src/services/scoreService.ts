import type { GameId } from '../types';

const SUPABASE_URL = 'https://orpemhsswgxxamzlcrbk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VotpaV3rCyzGnANHuboFOg_vNG6oFN4';

type ScoreRow = {
  melhor_pontuacao: number;
};

type ScoreQuery = {
  eq: (column: string, value: string) => ScoreQuery;
  order: (column: string, options: { ascending: boolean }) => {
    limit: (count: number) => Promise<{ data: ScoreRow[] | null; error: Error | null }>;
  };
};

type SupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => ScoreQuery;
    insert: (row: {
      nome: string;
      jogo: string;
      melhor_pontuacao: number;
      ultima_pontuacao: number;
    }) => Promise<{ error: Error | null }>;
  };
};

declare global {
  interface Window {
    supabase?: {
      createClient: (url: string, key: string) => SupabaseClient;
    };
  }
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!window.supabase) {
    throw new Error('A biblioteca do Supabase não foi carregada.');
  }

  client ??= window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export async function saveScore(
  name: string,
  game: GameId,
  score: number,
): Promise<void> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('Informe um nome para salvar a pontuação.');
  }

  const gameName = game === 'runner' ? 'A Grande Fuga' : 'Roubando o Brasil';
  const { data, error: selectError } = await getClient()
    .from('pontuacoes')
    .select('melhor_pontuacao')
    .eq('nome', normalizedName)
    .eq('jogo', gameName)
    .order('melhor_pontuacao', { ascending: false })
    .limit(1);

  if (selectError) {
    throw selectError;
  }

  const bestScore = Math.max(score, data?.[0]?.melhor_pontuacao ?? 0);
  const { error: insertError } = await getClient()
    .from('pontuacoes')
    .insert({
      nome: normalizedName,
      jogo: gameName,
      melhor_pontuacao: bestScore,
      ultima_pontuacao: score,
    });

  if (insertError) {
    throw insertError;
  }
}
