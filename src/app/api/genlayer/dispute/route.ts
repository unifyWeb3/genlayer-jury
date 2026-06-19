import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export const maxDuration = 120;

const enc = new TextEncoder();
const sse = (obj: Record<string, unknown>): Uint8Array =>
  enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

type RequestBody = {
  disputeId: string;
  question: string;
  mode: string;
  criteria: string;
};

type VerdictPayload = { verdict: string; reasoning: string };

// Tolerant result parser — handles proper object, valid JSON string, and GenLayer's
// known malformed-JSON bug (missing comma between dict fields).
function parseResult(raw: unknown): VerdictPayload | null {
  if (raw !== null && typeof raw === 'object') {
    const v = raw as Record<string, unknown>;
    if (typeof v.verdict === 'string') {
      return {
        verdict: v.verdict.trim().toUpperCase(),
        reasoning: typeof v.reasoning === 'string' ? v.reasoning : '',
      };
    }
  }
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      if (typeof p.verdict === 'string') {
        return {
          verdict: p.verdict.trim().toUpperCase(),
          reasoning: typeof p.reasoning === 'string' ? p.reasoning : '',
        };
      }
    } catch {
      const vm = raw.match(/\b(UPHELD|DISMISSED)\b/i);
      const rm = raw.match(/"reasoning"\s*:\s*"([^"]+)"/);
      if (vm) return { verdict: vm[1].toUpperCase(), reasoning: rm?.[1] ?? '' };
    }
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const rawKey = process.env.GENLAYER_PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_DISPUTE_COURT_ADDRESS as
    | `0x${string}`
    | undefined;

  if (!rawKey || !contractAddress) {
    return new Response('Server misconfigured: missing GenLayer env vars.', { status: 500 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response('Invalid JSON body.', { status: 400 });
  }

  const { disputeId, question, mode, criteria } = body;
  if (!disputeId || !question || !mode) {
    return new Response('Missing required fields: disputeId, question, mode.', { status: 400 });
  }

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = createAccount(privateKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createClient({ chain: studionet, account }) as any;

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      let closed = false;
      const emit = (obj: Record<string, unknown>) => {
        if (closed) return;
        try { ctrl.enqueue(sse(obj)); } catch { closed = true; }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        emit({ type: 'done' });
        try { ctrl.close(); } catch { /* already closed */ }
      };

      request.signal.addEventListener('abort', finish, { once: true });

      try {
        // 1 — Submit transaction (returns hash immediately, before consensus).
        const txHash = (await client.writeContract({
          address: contractAddress,
          functionName: 'resolve_dispute',
          args: [disputeId, question, mode, criteria ?? ''],
        })) as string;

        emit({ type: 'submitted', txHash });

        // 2 — Wait for consensus.
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 90,
        });

        const r = receipt as Record<string, unknown>;
        const resultName = (r?.result_name ?? '') as string;

        // 3a — No consensus: validators split on the verdict.
        // This is a VALID outcome for subjective disputes, not an error.
        if (resultName && resultName !== 'MAJORITY_AGREE') {
          emit({
            type: 'no_consensus',
            txHash,
            resultName,
            message:
              'Validators could not reach a majority verdict on this dispute. ' +
              'The transaction completed without modifying contract state. ' +
              'This is the Equivalence Principle in action — real disagreement on a subjective question.',
          });
          return;
        }

        // 3b — Consensus reached: retrieve stored verdict via readContract (clean path).
        const raw = await client.readContract({
          address: contractAddress,
          functionName: 'get_verdict',
          args: [disputeId],
        });

        const payload = parseResult(raw);
        if (!payload) {
          emit({
            type: 'error',
            message:
              `Consensus reached but verdict could not be read. Tx: ${txHash}`,
          });
          return;
        }

        emit({ type: 'verdict', verdict: payload.verdict, reasoning: payload.reasoning });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({
          type: 'error',
          message: msg.toLowerCase().includes('timed out')
            ? 'Consensus is taking longer than expected. Check the tx hash on Studionet.'
            : msg,
        });
      } finally {
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
