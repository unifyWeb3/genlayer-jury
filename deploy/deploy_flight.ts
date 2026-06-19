import { readFileSync } from 'fs';
import path from 'path';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import {
  TransactionHash,
  TransactionStatus,
} from 'genlayer-js/types';

async function main(): Promise<void> {
  const rawKey = process.env.GENLAYER_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error('GENLAYER_PRIVATE_KEY env var is not set. Add it to .env.local and export it before running.');
  }

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = createAccount(privateKey);
  const client = createClient({ chain: studionet, account });

  const contractPath = path.resolve(process.cwd(), 'contracts/flight_delay.py');
  const code = new Uint8Array(readFileSync(contractPath));

  console.log('Deploying FlightDelayDispute contract to studionet…');

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

  // On studionet the address is in receipt.data.contract_address;
  // on testnet chains it's in receipt.txDataDecoded.contractAddress.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = receipt as any;
  const contractAddress: string =
    r?.data?.contract_address ??
    r?.toAddress ??
    r?.to_address ??
    r?.txDataDecoded?.contractAddress;

  console.log('\n✓ Contract deployed successfully!');
  console.log(`  Contract address : ${contractAddress}`);
  console.log(`  Deploy tx hash   : ${deployTx}`);
  console.log('\nCopy these into your .env.local:');
  console.log(`  NEXT_PUBLIC_FLIGHT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`  NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://studio.genlayer.com/`);
}

main().catch((err: unknown) => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
