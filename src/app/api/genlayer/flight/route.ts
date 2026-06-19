import { createClient, createAccount } from 'genlayer-js';
import { studionet, testnetAsimov, testnetBradbury, localnet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export const maxDuration = 120;

const enc = new TextEncoder();
const sse = (obj: Record<string, unknown>): Uint8Array =>
  enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

const FLIGHT_QUESTION =
  'AA42 was scheduled to land at 14:00. The flight tracker shows it landed at 16:47. Did it land more than 2 hours late?';

type VerdictPayload = { verdict: string; reasoning: string };

// Resolve chain from NEXT_PUBLIC_GENLAYER_NETWORK env var.
// Defaults to testnetBradbury so network switching is config-only.
function resolveChain() {
  const network = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? 'testnetBradbury';
  switch (network) {
    case 'studionet':    return studionet;
    case 'testnetAsimov': return testnetAsimov;
    case 'localnet':     return localnet;
    default:             return testnetBradbury;
  }
}

// Tolerant verdict parser — handles proper object, valid JSON string, and GenLayer's
// known malformed-JSON serialization bug (missing comma between dict fields).
function parseResultValue(res: unknown): VerdictPayload | null {
  if (res !== null && typeof res === 'object') {
    const v = res as Record<string, unknown>;
    if (typeof v.verdict === 'string') {
      return {
        verdict: v.verdict.trim().toUpperCase(),
        reasoning: typeof v.reasoning === 'string' ? v.reasoning : '',
      };
    }
  }
  if (typeof res === 'string' && res.length > 0) {
    try {
      const parsed = JSON.parse(res) as Record<string, unknown>;
      if (typeof parsed.verdict === 'string') {
        return {
          verdict: parsed.verdict.trim().toUpperCase(),
          reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
        };
      }
    } catch {
      const verdictMatch = res.match(/\b(UPHELD|DISMISSED)\b/i);
      const reasoningMatch = res.match(/"reasoning"\s*:\s*"([^"]+)"/);
      if (verdictMatch) {
        return {
          verdict: verdictMatch[1].toUpperCase(),
          reasoning: reasoningMatch?.[1] ?? '',
        };
      }
    }
  }
  return null;
}

// Reasoning is deterministic in the contract — mirrors what's stored in contract state.
const REASONING: Record<string, string> = {
  UPHELD:
    'Flight AA42 arrived at 16:47 against a scheduled arrival of 14:00 — a delay of ' +
    '2 hours 47 minutes, exceeding the 2-hour parametric threshold. The claim is upheld.',
  DISMISSED:
    'The recorded delay does not exceed the parametric threshold. The claim is dismissed.',
};

// Walks the receipt (works for studio chains that decode consensus_data) to find the
// leader's execution result, then falls back to eq_outputs for the strict_eq verdict word.
function extractVerdictFromReceipt(receipt: unknown): VerdictPayload | null {
  const r = receipt as Record<string, unknown>;
  const cd = r?.consensus_data as Record<string, unknown> | undefined;
  const lrRaw = cd?.leader_receipt;
  const lr = (Array.isArray(lrRaw) ? lrRaw[0] : lrRaw) as
    | Record<string, unknown>
    | undefined;

  if (!lr) return null;

  const payload = parseResultValue(lr.result);
  if (payload) return payload;

  // Fallback: eq_outputs contains the exact word all validators agreed on via strict_eq.
  const eqRaw = lr.eq_outputs;
  const eqStr =
    typeof eqRaw === 'string'
      ? eqRaw
      : Array.isArray(eqRaw) && typeof eqRaw[0] === 'string'
      ? eqRaw[0]
      : typeof eqRaw === 'object' && eqRaw !== null
      ? JSON.stringify(eqRaw)
      : '';

  const verdictFromEq = eqStr.match(/\b(UPHELD|DISMISSED)\b/i);
  if (verdictFromEq) {
    const v = verdictFromEq[1].toUpperCase();
    return { verdict: v, reasoning: REASONING[v] ?? '' };
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  const rawKey = process.env.GENLAYER_PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_FLIGHT_CONTRACT_ADDRESS as
    | `0x${string}`
    | undefined;

  if (!rawKey || !contractAddress) {
    return new Response('Server misconfigured: missing GenLayer env vars.', { status: 500 });
  }

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = createAccount(privateKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createClient({ chain: resolveChain(), account }) as any;

  const disputeId = `flight-${Date.now()}`;

  const body = new ReadableStream<Uint8Array>({
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
        const txHash = (await client.writeContract({
          address: contractAddress,
          functionName: 'resolve_dispute',
          args: [disputeId, FLIGHT_QUESTION],
        })) as string;

        emit({ type: 'submitted', txHash });

        const receipt = await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 90,
        });

        const r = receipt as Record<string, unknown>;
        const resultName = r?.result_name as string | undefined;

        if (resultName && resultName !== 'MAJORITY_AGREE') {
          emit({
            type: 'error',
            message: `Validators did not reach consensus (${resultName}). Tx: ${txHash}`,
          });
          return;
        }

        // Primary: parse verdict from receipt (works on studio chains).
        let payload = extractVerdictFromReceipt(receipt);

        // Fallback: readContract — the clean path; works on all chains including testnet.
        if (!payload) {
          const raw = await client.readContract({
            address: contractAddress,
            functionName: 'get_verdict',
            args: [disputeId],
          });
          payload = parseResultValue(raw);
        }

        if (!payload) {
          emit({
            type: 'error',
            message:
              `Consensus reached but verdict could not be read. Tx: ${txHash} — check the explorer.`,
          });
          return;
        }

        emit({ type: 'verdict', verdict: payload.verdict, reasoning: payload.reasoning });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({
          type: 'error',
          message: msg.toLowerCase().includes('timed out')
            ? 'Consensus is taking longer than expected. Check the tx hash on the explorer.'
            : msg,
        });
      } finally {
        finish();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
