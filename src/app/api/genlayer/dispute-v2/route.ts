import { createClient, createAccount } from 'genlayer-js';
import { studionet, testnetAsimov, testnetBradbury, localnet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import type { V2DossierRecord } from '@/components/DossierBlock';

// 150 s = 90 s consensus wait + 20 s read-retry window + 40 s buffer.
// v2 consensus is slower than v1: every validator fetches the evidence URLs
// itself before reasoning.
export const maxDuration = 150;

const enc = new TextEncoder();
const sse = (obj: Record<string, unknown>): Uint8Array =>
  enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

type RequestBody = {
  disputeId: string;
  claim: string;
  criteria: string;
  requestedRemedy: string;
  evidenceUrls: string[];
  mode: string;
};

const VALID_MODES = new Set(['strict', 'comparative', 'non_comparative']);
const MAX_EVIDENCE_URLS = 3;

const DEFAULT_CRITERIA =
  'Judge the claim fairly against the retrieved evidence. ' +
  'Determine UPHELD if the claim is supported by the evidence, DISMISSED if it is not. ' +
  'Base the decision on the evidence content only, without assuming information not provided.';

// Minimal shape we need from the genlayer client — avoids `any` while the
// upstream types churn between releases.
type GenlayerClient = {
  writeContract(args: {
    address: `0x${string}`;
    functionName: string;
    args: unknown[];
  }): Promise<string>;
  waitForTransactionReceipt(args: {
    hash: string;
    status: TransactionStatus;
    retries: number;
  }): Promise<Record<string, unknown>>;
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

function toStringArray(x: unknown): string[] {
  return Array.isArray(x) ? x.map((item) => String(item)) : [];
}

// Shapes the raw get_verdict record into the typed dossier. Views return real
// objects (JSON decoding is handled contract-side); coercion here only guards
// against transport quirks (e.g. bigint for ints).
function parseDossier(raw: unknown): V2DossierRecord | null {
  if (raw === null || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.verdict !== 'string' || typeof v.status !== 'string') return null;
  return {
    dispute_id: String(v.dispute_id ?? ''),
    claim: String(v.claim ?? ''),
    criteria: String(v.criteria ?? ''),
    requested_remedy: String(v.requested_remedy ?? ''),
    mode: String(v.mode ?? ''),
    evidence_urls: toStringArray(v.evidence_urls),
    evidence_hashes: toStringArray(v.evidence_hashes),
    evidence_summary: String(v.evidence_summary ?? ''),
    verdict: v.verdict.trim().toUpperCase(),
    reasoning: String(v.reasoning ?? ''),
    agreement_strength_bps: Number(v.agreement_strength_bps ?? 0) || 0,
    remedy_follows: Boolean(v.remedy_follows),
    status: v.status,
    why_consensus: String(v.why_consensus ?? ''),
  };
}

// Retries readContract('get_verdict') with linear back-off to handle the
// propagation gap between a write tx being ACCEPTED and its state being
// readable. On Bradbury, state typically propagates within 2–10 s.
async function readDossierWithRetry(
  client: GenlayerClient,
  contractAddress: `0x${string}`,
  disputeId: string,
  maxAttempts = 6,
  baseDelayMs = 2000
): Promise<V2DossierRecord | null> {
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
      const parsed = parseDossier(raw);
      if (parsed) return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // "Dispute not found" means state hasn't propagated yet — keep retrying.
      const isNotFound = msg.toLowerCase().includes('not found');
      if (!isNotFound) {
        console.warn(`[dispute-v2] get_verdict attempt ${attempt + 1}/${maxAttempts}: ${msg}`);
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

// Mirrors the contract's own input rules so users don't burn a tx on input
// the contract will reject: 1–3 https-only URLs, trimmed and deduped.
function normalizeEvidenceUrls(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const urls: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') return null;
    const url = raw.trim();
    if (url === '') continue;
    if (!url.startsWith('https://')) return null;
    if (!urls.includes(url)) urls.push(url);
  }
  if (urls.length < 1 || urls.length > MAX_EVIDENCE_URLS) return null;
  return urls;
}

export async function POST(request: Request): Promise<Response> {
  const rawKey = process.env.GENLAYER_PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_DISPUTE_COURT_V2_ADDRESS as
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

  const { disputeId, claim, mode } = body;
  if (!disputeId || typeof claim !== 'string' || claim.trim().length < 10) {
    return new Response('Missing required fields: disputeId, claim (min 10 chars).', {
      status: 400,
    });
  }
  if (!VALID_MODES.has(mode)) {
    return new Response('mode must be strict, comparative or non_comparative.', {
      status: 400,
    });
  }
  const evidenceUrls = normalizeEvidenceUrls(body.evidenceUrls);
  if (!evidenceUrls) {
    return new Response('evidenceUrls must be 1–3 https:// links.', { status: 400 });
  }
  const criteria =
    typeof body.criteria === 'string' && body.criteria.trim() !== ''
      ? body.criteria.trim()
      : DEFAULT_CRITERIA;
  const requestedRemedy =
    typeof body.requestedRemedy === 'string' ? body.requestedRemedy.trim() : '';

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = createAccount(privateKey);
  const client = createClient({
    chain: resolveChain(),
    account,
  }) as unknown as GenlayerClient;

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
        // 1 — Submit write transaction. Positional args must match the
        // DEPLOYED v2 signature exactly:
        // submit_and_resolve(dispute_id, claim, criteria, evidence_urls,
        //                    requested_remedy, mode)
        txHash = await client.writeContract({
          address: contractAddress,
          functionName: 'submit_and_resolve',
          args: [disputeId, claim.trim(), criteria, evidenceUrls, requestedRemedy, mode],
        });

        emit({ type: 'submitted', txHash });

        // 2 — Wait for validator consensus (evidence fetch + LLM per node).
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 90,
        });

        const resultName = (receipt?.result_name ?? '') as string;

        // 3a — Protocol-level disagreement: validators split, no state written.
        if (resultName && resultName !== 'MAJORITY_AGREE') {
          emit({
            type: 'no_consensus',
            txHash,
            resultName,
            message:
              'The jury is split — validators did not reach agreement on this claim. ' +
              'The transaction completed without modifying contract state. ' +
              'This is the Equivalence Principle working: independent validators ' +
              'each fetched the evidence, reasoned over it, and genuinely disagreed.',
          });
          return;
        }

        // 3b — Consensus reached. Read the full dossier via get_verdict —
        // never parse the write receipt for the verdict.
        const dossier = await readDossierWithRetry(client, contractAddress, disputeId);

        if (!dossier) {
          const explorerBase =
            process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL?.replace(/\/$/, '') ??
            'https://explorer-bradbury.genlayer.com';
          emit({
            type: 'error',
            message:
              `The verdict reached consensus and is accepted on-chain, but the state is still ` +
              `propagating. Your transaction is verifiable at: ${explorerBase}/tx/${txHash}`,
          });
          return;
        }

        emit({ type: 'dossier', txHash, record: dossier });
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
