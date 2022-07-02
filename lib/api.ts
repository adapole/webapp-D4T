import algosdk, { Transaction } from 'algosdk';
import { IAssetData } from './helpers/types';

export enum ChainType {
	MainNet = 'mainnet',
	TestNet = 'testnet',
}

const mainNetClient = new algosdk.Algodv2('', 'https://algoexplorerapi.io', '');

const baseServer = 'https://testnet-algorand.api.purestake.io/ps2';
const baseServerIndexer = 'https://testnet-algorand.api.purestake.io/idx2';
const port = '';
const token = {
	'X-API-Key': process.env.NEXT_PUBLIC_PURESTAKE_API ?? '',
};

export const testNetClientalgod = new algosdk.Algodv2(token, baseServer, port);
export const testNetClientindexer = new algosdk.Indexer(
	token,
	baseServerIndexer,
	port
);
export function getPayTxn(suggested: any, addr: string): Transaction {
	const txnobj = {
		from: addr,
		type: 'pay',
		to: addr,
		...suggested,
	};
	return new Transaction(txnobj);
}
export async function constructPaymentTxn(
	sender: string,
	receiver: string,
	amount: number,
	chain: ChainType
): Promise<algosdk.Transaction[]> {
	const sp = await apiGetTxnParams(chain);
	return [
		new algosdk.Transaction({
			from: sender,
			to: receiver,
			amount: amount,
			suggestedParams: sp,
		}),
	];
}
function clientForChain(chain: ChainType): algosdk.Algodv2 {
	switch (chain) {
		case ChainType.MainNet:
			return mainNetClient;
		case ChainType.TestNet:
			return testNetClientalgod;
		default:
			throw new Error(`Unknown chain type: ${chain}`);
	}
}

export async function apiGetTxnParams(
	chain: ChainType
): Promise<algosdk.SuggestedParams> {
	const params = await clientForChain(chain).getTransactionParams().do();
	return params;
}
export async function apiGetAccountAssets(
	chain: ChainType,
	address: string
): Promise<IAssetData[]> {
	const client = clientForChain(chain);

	const accountInfo = await client
		.accountInformation(address)
		.setIntDecoding(algosdk.IntDecoding.BIGINT)
		.do();

	const algoBalance = accountInfo.amount as bigint;
	const assetsFromRes: Array<{
		'asset-id': bigint;
		amount: bigint;
		creator: string;
		frozen: boolean;
	}> = accountInfo.assets;

	const assets: IAssetData[] = assetsFromRes.map(
		({ 'asset-id': id, amount, creator, frozen }) => ({
			id: Number(id),
			amount,
			creator,
			frozen,
			decimals: 0,
		})
	);

	assets.sort((a, b) => a.id - b.id);

	await Promise.all(
		assets.map(async (asset) => {
			const { params } = await client.getAssetByID(asset.id).do();
			asset.name = params.name;
			asset.unitName = params['unit-name'];
			asset.url = params.url;
			asset.decimals = params.decimals;
		})
	);

	assets.unshift({
		id: 0,
		amount: algoBalance,
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'Algo',
		unitName: 'Algo',
	});

	return assets;
}
export async function apiSubmitTransactions(
	chain: ChainType,
	stxns: Uint8Array[]
): Promise<number> {
	const { txId } = await clientForChain(chain).sendRawTransaction(stxns).do();
	return await waitForTransaction(chain, txId);
}

async function waitForTransaction(
	chain: ChainType,
	txId: string
): Promise<number> {
	const client = clientForChain(chain);

	let lastStatus = await client.status().do();
	let lastRound = lastStatus['last-round'];
	while (true) {
		const status = await client.pendingTransactionInformation(txId).do();
		if (status['pool-error']) {
			throw new Error(`Transaction Pool Error: ${status['pool-error']}`);
		}
		if (status['confirmed-round']) {
			return status['confirmed-round'];
		}
		lastStatus = await client.statusAfterBlock(lastRound + 1).do();
		lastRound = lastStatus['last-round'];
	}
}
