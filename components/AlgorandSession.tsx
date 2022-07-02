import {
	SessionWallet,
	allowedWallets,
	SignedTxn,
	PermissionResult,
} from 'algorand-session-wallet';
import algosdk, { Transaction } from 'algosdk';
import { useState } from 'react';
import {
	apiGetTxnParams,
	ChainType,
	getPayTxn,
	testNetClientalgod,
} from '../lib/api';
import { PopupPermissions } from './PopupPermissions';

const pprops = {
	isOpen: false,
	result: (s: string): void => {},
};

export default function AlgorandSession() {
	const [popupProps, setPopupProps] = useState(pprops);

	const permPopupCallback = {
		async request(pr: PermissionResult): Promise<SignedTxn[]> {
			// set a local var that will be modified in the popup
			let result = '';
			function setResult(res: string) {
				result = res;
			}

			setPopupProps({ isOpen: true, result: setResult });

			// Wait for it to finish

			const timeout = async (ms: number) =>
				new Promise((res) => setTimeout(res, ms));
			async function wait(): Promise<SignedTxn[]> {
				while (result === '') await timeout(50);

				if (result === 'approve') return pr.approved();
				return pr.declined();
			}

			//get signed
			const txns = await wait();

			//close popup
			setPopupProps(pprops);

			//return signed
			return txns;
		},
	};

	const [sw, setSw] = useState(new SessionWallet('TestNet', permPopupCallback));
	const [addrs, setAddrs] = useState(sw.accountList());
	const [connected, setConnected] = useState(sw.connected());
	async function getContractAPI(): Promise<algosdk.ABIContract> {
		const resp = await fetch('/d4t.json');
		return new algosdk.ABIContract(await resp.json());
	}

	async function connect(choice: string) {
		const w = new SessionWallet('TestNet', permPopupCallback, choice);

		if (!(await w.connect())) return alert('Couldnt connect');

		setConnected(w.connected());
		setAddrs(w.accountList());
		setSw(w);
	}

	async function disconnect() {
		sw.disconnect();
		setConnected(false);
		setAddrs([]);
		setSw(sw);
	}

	async function sign(e: any) {
		const suggested = await apiGetTxnParams(ChainType.TestNet);
		const contract = await getContractAPI();
		console.log(contract);
		// Utility function to return an ABIMethod by its name
		function getMethodByName(name: string): algosdk.ABIMethod {
			const m = contract.methods.find((mt: algosdk.ABIMethod) => {
				return mt.name == name;
			});
			if (m === undefined) throw Error('Method undefined: ' + name);
			return m;
		}
		// We initialize the common parameters here, they'll be passed to all the transactions
		// since they happen to be the same
		const commonParams = {
			appID: contract.networks['default'].appID,
			sender: sw.getDefaultAccount(),
			suggestedParams: suggested,
			//OnComplete: algosdk.OnApplicationComplete.OptInOC,
			signer: sw.getSigner(),
		};
		const comp = new algosdk.AtomicTransactionComposer();

		// Simple ABI Calls with standard arguments, return type
		/* comp.addMethodCall({
			method: getMethodByName('optin'),
			methodArgs: [84436122],
			...commonParams,
		}); */
		// Create a transaction
		const ptxn = new Transaction({
			from: sw.getDefaultAccount(),
			to: sw.getDefaultAccount(),
			amount: 10000,
			note: new Uint8Array(Buffer.from('testing')),
			suggestedParams: suggested,
		});
		// Construct TransactionWithSigner
		const tws = {
			txn: ptxn,
			signer: sw.getSigner(),
		};
		comp.addMethodCall({
			method: getMethodByName('testtxn'),
			methodArgs: [tws, 'something'],
			...commonParams,
		});
		//const pay_txn = getPayTxn(suggested, sw.getDefaultAccount());

		//comp.addTransaction({ txn: pay_txn, signer: sw.getSigner() });

		// This is not necessary to call but it is helpful for debugging
		// to see what is being sent to the network
		const g = comp.buildGroup();
		console.log(g);
		for (const x in g) {
			console.log(g[x].txn.appArgs);
		}

		const result = await comp.execute(testNetClientalgod, 2);
		for (const idx in result.methodResults) {
			console.log(result.methodResults[idx]);
		}
	}

	const walletOptions = [];
	if (!connected) {
		for (const [k, v] of Object.entries(allowedWallets)) {
			walletOptions.push(
				<button
					key={k}
					onClick={() => {
						connect(k);
					}}
				>
					<img src={v.img(false)} alt='branding'></img>
					{v.displayName()}
				</button>
			);
		}
	} else {
		walletOptions.push(
			<button key='disco' onClick={disconnect}>
				Sign out
			</button>
		);
		walletOptions.push(
			<button key='sign' onClick={sign}>
				Sign a txn
			</button>
		);
	}

	const accts = addrs.map((a) => {
		return <li key={a}>{a}</li>;
	});
	return (
		<div>
			<div className='flex justify-evenly'>{walletOptions}</div>
			<ul className='list-none'> {accts} </ul>
			<PopupPermissions {...popupProps} />
		</div>
	);
}
