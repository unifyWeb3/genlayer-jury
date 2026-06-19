import { readFileSync } from 'fs';
import path from 'path';
import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import {
  TransactionHash,
  TransactionStatus,
} from 'genlayer-js/types';

async function main(): Promise<void> {
  const rawKey = process.env.GENLAYER_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error(
      'GENLAYER_PRIVATE_KEY env var is not set. Export it before running:\n' +
      '  export GENLAYER_PRIVATE_KEY=$(grep GENLAYER_PRIVATE_KEY .env.local | cut -d= -f2)'
    );
  }

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = createAccount(privateKey);
  const client = createClient({ chain: testnetBradbury, account });

  const contractPath = path.resolve(process.cwd(), 'contracts/dispute_court.py');
  const code = new Uint8Array(readFileSync(contractPath));

  console.log('Deploying DisputeCourt contract to testnet-bradbury…');

  try {
    await client.initializeConsensusSmartContract();
  } catch {
    // Already initialized on this network — safe to continue.
  }

  const deployTx = (await client.deployContract({
    code,
    args: [],
  })) as TransactionHash;

  console.log(`Deploy transaction submitted: ${deployTx}`);
  console.log('Waiting for ACCEPTED status (up to ~5 min)…');

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTx,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });

  if (
    receipt.status !== 5 &&
    receipt.status !== 6 &&
    receipt.statusName !== 'ACCEPTED' &&
    receipt.statusName !== 'FINALIZED'
  ) {
    throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt, null, 2)}`);
  }

  // On testnet chains the address is in receipt.txDataDecoded.contractAddress.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = receipt as any;
  const contractAddress: string =
    r?.txDataDecoded?.contractAddress ??
    r?.toAddress ??
    r?.to_address ??
    r?.data?.contract_address;

  console.log('\n✓ DisputeCourt deployed successfully on testnet-bradbury!');
  console.log(`  Contract address : ${contractAddress}`);
  console.log(`  Deploy tx hash   : ${deployTx}`);
  console.log('\nAdd to your .env.local:');
  console.log(`  NEXT_PUBLIC_DISPUTE_COURT_ADDRESS=${contractAddress}`);
  console.log(`  NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-bradbury.genlayer.com`);
}

main().catch((err: unknown) => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
