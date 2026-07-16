import { createClient, createAccount } from 'genlayer-js';
import { studionet, testnetAsimov, testnetBradbury, localnet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

// 150 s = 90 s consensus wait + 20 s read-retry window + 40 s buffer.
export const maxDuration = 150;

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

// Minimal shape we need from the genlayer client.
type ReadableClient = {
  readContract(args: {
    address: `0x${string}`;
    functionName: string;
    args: unknown[];
  }): Promise<unknown>;
};

// Resolve chain from NEXT_PUBLIC_GENLAYER_NETWORK env var.
function resolveChain() {
  const network = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? 'testnetBradbury';
  switch (network) {
    case 'studionet':     return studionet;
    case 'testnetAsimov': return testnetAsimov;
    case 'localnet':      return localnet;
    default:              return testnetBradbury;
  }
}

// Tolerant result parser — handles proper object, valid JSON string, and GenLayer's
// known malformed-JSON serialization bug (missing comma between dict fields).
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

// Retries readContract('get_verdict') with linear back-off to handle the
// propagation gap between a write tx being ACCEPTED and its state being readable.
// On Bradbury, state typically propagates within 2–10 s after ACCEPTED.
async function readVerdictWithRetry(
  client: ReadableClient,
  contractAddress: `0x${string}`,
  disputeId: string,
  maxAttempts = 6,
  baseDelayMs = 2000
): Promise<VerdictPayload | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Linear back-off: 2s, 3s, 4s, 5s, 6s (total window ≈ 20 s).
      await new Promise<void>((r) =>
        setTimeout(r, baseDelayMs + (attempt - 1) * 1000)
      );
    }
    try {
      const raw = await client.readContract({
        address: contractAddress,
        functionName: 'get_verdict',
        args: [disputeId],
      });
      const parsed = parseResult(raw);
      if (parsed) return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // "Dispute not found" means state hasn't propagated yet — keep retrying.
      const isNotFound =
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('dispute not found');
      if (!isNotFound) {
        console.warn(`[dispute] get_verdict attempt ${attempt + 1}/${maxAttempts}: ${msg}`);
      }
    }
  }
  return null;
}

// Sanitises errors before sending them to the client — strips raw genvm hex dumps.
function sanitizeError(err: unknown, txHash?: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes('genvm.VMResult') ||
    raw.includes('&genvm.') ||
    raw.includes('execution failed:')
  ) {
    const suffix = txHash ? ` Tx: ${txHash}` : '';
    return `On-chain execution error.${suffix} Check the block explorer for details.`;
  }
  if (raw.toLowerCase().includes('timed out')) {
    return 'Consensus is taking longer than expected. Check the tx hash on the explorer.';
  }
  return raw;
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
  const client = createClient({ chain: resolveChain(), account }) as any;

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

      let txHash = '';
      try {
        // 1 — Submit write transaction (hash returned before consensus runs).
        txHash = (await client.writeContract({
          address: contractAddress,
          functionName: 'resolve_dispute',
          args: [disputeId, question, mode, criteria ?? ''],
        })) as string;

        emit({ type: 'submitted', txHash });

        // 2 — Wait for validator consensus.
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 90,
        });

        const r = receipt as Record<string, unknown>;
        const resultName = (r?.result_name ?? '') as string;

        // 3a — No consensus: validators split. Valid outcome, not an error.
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

        // 3b — Consensus reached. Read stored verdict with retry back-off to handle
        // the propagation gap between ACCEPTED and state being readable on Bradbury.
        const payload = await readVerdictWithRetry(
          client as ReadableClient,
          contractAddress,
          disputeId
        );

        if (!payload) {
          // All retries exhausted — state still not readable. Graceful degradation:
          // surface the tx hash so the user can verify consensus on the explorer.
          const explorerBase =
            process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL?.replace(/\/$/, '') ??
            'https://explorer-bradbury.genlayer.com';
          emit({
            type: 'error',
            message:
              `Verdict reached consensus and is accepted on-chain, but the state is still ` +
              `propagating. Your transaction is verifiable at: ${explorerBase}/tx/${txHash}`,
          });
          return;
        }

        emit({ type: 'verdict', verdict: payload.verdict, reasoning: payload.reasoning });
      } catch (err) {
        emit({
          type: 'error',
          message: sanitizeError(err, txHash || undefined),
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
