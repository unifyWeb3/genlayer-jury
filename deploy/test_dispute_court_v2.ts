import { readFileSync } from 'fs';
import path from 'path';
import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

// Reads a var from process.env first, then falls back to .env.local.
// trim() strips the CRLF that has bitten this project before.
function readEnv(name: string): string | undefined {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;
  try {
    const txt = readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    const m = txt.match(new RegExp(`^${name}=(.*)$`, 'm'));
    return m?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const rawKey = readEnv('GENLAYER_PRIVATE_KEY');
  const contractAddress = readEnv('NEXT_PUBLIC_DISPUTE_COURT_V2_ADDRESS') as
    | `0x${string}`
    | undefined;
  if (!rawKey) throw new Error('GENLAYER_PRIVATE_KEY not found in env or .env.local');
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_DISPUTE_COURT_V2_ADDRESS not found in env or .env.local');
  }

  const explorerBase =
    readEnv('NEXT_PUBLIC_GENLAYER_EXPLORER_URL')?.replace(/\/$/, '') ??
    'https://explorer-bradbury.genlayer.com';

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = createAccount(privateKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createClient({ chain: testnetBradbury, account }) as any;

  // A real evidence-based dispute against a stable public page. The URL is
  // fetched by the GenLayer validators themselves, never by this script.
  const disputeId = process.argv[2] ?? `v2-test-${Date.now()}`;
  const claim = 'The Eiffel Tower is taller than 300 metres.';
  const criteria =
    'UPHOLD if the evidence states the Eiffel Tower height exceeds 300 metres; ' +
    'otherwise DISMISS.';
  const evidenceUrls = ['https://en.wikipedia.org/wiki/Eiffel_Tower'];
  const requestedRemedy = 'Declare the claim verified on-chain.';
  const mode = 'non_comparative';

  console.log(`Contract   : ${contractAddress}`);
  console.log(`Dispute id : ${disputeId}`);
  console.log(`Mode       : ${mode}`);
  console.log(`Evidence   : ${evidenceUrls[0]}`);
  console.log('\nSubmitting submit_and_resolve …');

  const txHash = (await client.writeContract({
    address: contractAddress,
    functionName: 'submit_and_resolve',
    args: [disputeId, claim, criteria, evidenceUrls, requestedRemedy, mode],
  })) as string;

  console.log(`Tx submitted: ${txHash}`);
  console.log(`Explorer    : ${explorerBase}/tx/${txHash}`);
  console.log('Waiting for validator consensus (evidence fetch + LLM judgment, up to ~5 min) …');

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });

  const r = receipt as Record<string, unknown>;
  const resultName = (r?.result_name ?? '') as string;
  if (resultName && resultName !== 'MAJORITY_AGREE') {
    console.log(`\nValidators did not reach majority agreement (${resultName}).`);
    console.log('No state was written. This is a valid consensus outcome — inspect the tx on the explorer.');
    return;
  }

  console.log('Consensus reached (ACCEPTED). Reading verdict via get_verdict …');

  // Retry to cover the ACCEPTED → readable-state propagation gap on Bradbury.
  let record: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) await new Promise((res) => setTimeout(res, 2000 + attempt * 1000));
    try {
      const raw = await client.readContract({
        address: contractAddress,
        functionName: 'get_verdict',
        args: [disputeId],
      });
      if (raw !== null && typeof raw === 'object') {
        record = raw as Record<string, unknown>;
        break;
      }
    } catch {
      // "Dispute not found" until state propagates — keep retrying.
    }
  }

  if (!record) {
    console.log(
      `\nState not readable yet — verify on the explorer, then re-read:\n` +
      `  ${explorerBase}/tx/${txHash}`
    );
    return;
  }

  console.log('\n✓ Dispute finalized on testnet-bradbury — Final Case Dossier fields:');
  console.log(JSON.stringify(record, null, 2));
  console.log(`\nDeploy checklist:`);
  console.log(`  verdict           : ${record.verdict}`);
  console.log(`  status            : ${record.status}`);
  console.log(`  evidence hashes   : ${JSON.stringify(record.evidence_hashes)}`);
  console.log(`  tx hash           : ${txHash}`);
  console.log(`  explorer          : ${explorerBase}/tx/${txHash}`);
}

main().catch((err: unknown) => {
  console.error('Test failed:', err);
  process.exit(1);
});
