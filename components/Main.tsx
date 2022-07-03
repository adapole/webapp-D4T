import algosdk, {
	decodeAddress,
	OnApplicationComplete,
	Transaction,
	TransactionSigner,
} from 'algosdk';
import React, { useContext, useEffect, useState } from 'react';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import { toast } from 'react-toastify';
import {
	apiGetTxnParams,
	ChainType,
	testNetClientalgod,
	testNetClientindexer,
} from '../lib/api';
import WalletConnect from '@walletconnect/client';
import {
	APP_ID,
	DUSD,
	LQT,
	MNG,
	NFTColl,
	USDC,
} from '../lib/helpers/constants';
import { addressContext } from '../lib/helpers/addressContext';
import { encode, decode } from '@msgpack/msgpack';
import { create } from 'ipfs-http-client';
import { formatBigNumWithDecimals } from '../lib/helpers/utilities';
import { SignTxnParams } from '../lib/helpers/types';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
const ipfs = create({
	host: 'ipfs.infura.io',
	port: 5001,
	protocol: 'https',
});

type Props = {};
export interface SignedTxn {
	txID: string;
	blob: Uint8Array;
}
function getUint8Args(amount: number, round: number) {
	return [
		algosdk.encodeUint64(USDC),
		algosdk.encodeUint64(amount),
		algosdk.encodeUint64(round),
		algosdk.encodeUint64(APP_ID),
	];
}
interface iLender {
	xids: Array<number>;
	aamt: number;
	lvr: number;
}
const Main = (props: Props) => {
	const AddressContext = useContext(addressContext);
	const address = AddressContext.address;
	const connector = AddressContext.connector;
	const myAlgoConnect = new MyAlgoConnect({ disableLedgerNano: false });
	const [validRound, setValidRound] = useState(2);
	const [fileUrl, updateFileUrl] = useState(``);
	const [hashIpfs, setHashIpfs] = useState('');
	useEffect(() => {
		console.log('render for ipfsPath');

		/* return () => {
			console.log('return from change, CleanUP');
		}; */
	}, [hashIpfs]);
	let rounds = 10;
	const amount = 100;
	const newAmount = amount * 1000000;
	const camtCheck = async () => {
		const accountInfoResponse = await testNetClientindexer
			.lookupAccountAppLocalStates(
				'VUIXZS3FA5A2RMLJCFEQK7EU5AQX5RWWDHIC7ODTNPZ6TSUEFS4LXRVCAQ'
			)
			.applicationID(APP_ID)
			.do();

		if (accountInfoResponse === null) return;

		for (
			let n = 0;
			n < accountInfoResponse['apps-local-states'][0]['key-value'].length;
			n++
		) {
			let kv = accountInfoResponse['apps-local-states'][0]['key-value'];
			let ky = kv[n]['key'];

			// Allowed assets
			if (ky === 'eGlkcw==') {
				// Extract bytes and compare to assetid
				let xids = kv[n]['value']['bytes'];

				let buff = Buffer.from(xids, 'base64');
				let values: Array<number> = [];
				for (let n = 0; n < buff.length; n = n + 8) {
					// Array offset, then check value
					values.push(buff.readUIntBE(n, 8));
				}
				setDisplayLend((prevState) => {
					return { ...prevState, xids: values };
				});
				console.log('xids: ' + values);
			}

			if (ky === 'Y2FtdA==') {
				// Extract bytes and compare to assetid
				let xids = kv[n]['value']['bytes'];

				let buff = Buffer.from(xids, 'base64');
				let values: Array<number> = [];
				for (let n = 0; n < buff.length; n = n + 8) {
					// Array offset, then check value
					values.push(buff.readUIntBE(n, 8));
				}
				console.log('camt: ' + values);
			}
			if (ky === 'bGFtdA==') {
				// Extract bytes and compare to assetid
				let xids = kv[n]['value']['bytes'];

				let buff = Buffer.from(xids, 'base64');
				let values: Array<number> = [];
				for (let n = 0; n < buff.length; n = n + 8) {
					// Array offset, then check value
					values.push(buff.readUIntBE(n, 8));
				}
				console.log('lamt: ' + values);
			}
			//let buff = Buffer.from(ky, 'base64').toString('utf-8');
			//console.log(buff);
		}
		return;
	};

	const checkAppLocalState = async () => {
		const accountInfoResponse = await testNetClientindexer
			.lookupAccountAppLocalStates(address)
			.applicationID(APP_ID)
			.do();
		//console.log(accountInfo['apps-local-states']);
		return accountInfoResponse;
	};
	const [displayLend, setDisplayLend] = useState<iLender>({
		xids: [],
		aamt: 0,
		lvr: 0,
	});
	const checkAllowedAmount = async () => {
		const accountInfoResponse = await checkAppLocalState();
		if (accountInfoResponse === null) return;

		for (
			let n = 0;
			n < accountInfoResponse['apps-local-states'][0]['key-value'].length;
			n++
		) {
			let kv = accountInfoResponse['apps-local-states'][0]['key-value'];
			let ky = kv[n]['key'];

			// Allowed assets
			if (ky === 'eGlkcw==') {
				// Extract bytes and compare to assetid
				let xids = kv[n]['value']['bytes'];

				let buff = Buffer.from(xids, 'base64');
				let values: Array<number> = [];
				for (let n = 0; n < buff.length; n = n + 8) {
					// Array offset, then check value
					values.push(buff.readUIntBE(n, 8));
				}
				setDisplayLend((prevState) => {
					return { ...prevState, xids: values };
				});
				console.log('xids: ' + values);
			}
			// Last valid round, exp
			if (ky === 'bHZy') {
				// Check last valid round, lvr

				let lvr = kv[n]['value']['uint'];

				setDisplayLend((prevState) => {
					return { ...prevState, lvr: lvr };
				});
				console.log('lvr: ' + lvr);
			}
			if (ky === 'YWFtdA==') {
				// Check amount allowed, then check available amount in account
				let aamt = kv[n]['value']['uint'];
				console.log('aamt: ' + aamt);
				setDisplayLend((prevState) => {
					return {
						...prevState,
						aamt: Number(formatBigNumWithDecimals(aamt, 6)),
					};
				});
				// Check assetId balance
			}
		}
		return;
	};
	const logic = async () => {
		console.log('Stake function run!');
		//const lsig = await tealProgramMake(amount);
		let params = await testNetClientalgod.getTransactionParams().do();
		let data =
			'#pragma version 5 \nglobal ZeroAddress \ndup \ndup \ntxn RekeyTo \n== \nassert \ntxn CloseRemainderTo \n== \nassert \ntxn AssetCloseTo \n== \nassert \ntxn Fee \nint 0 \n== \nassert \ntxn XferAsset \narg_0 \nbtoi \n== \nassert \ntxn AssetAmount \narg_1 \nbtoi \n<= \nassert \ntxn LastValid \narg_2 \nbtoi \n<= \nassert \nglobal GroupSize \nint 1 \n- \ndup \ngtxns TypeEnum \nint appl \n== \nassert \ngtxns ApplicationID \narg_3 \nbtoi \n== \nreturn';
		let results = await testNetClientalgod.compile(data).do();
		console.log('Hash = ' + results.hash);
		console.log('Result = ' + results.result);
		let program = new Uint8Array(Buffer.from(results.result, 'base64'));

		if (rounds == 0) rounds = 10;
		let dayToRound = rounds * 17280;
		let exround = params.firstRound + dayToRound;
		setValidRound(exround);
		console.log(newAmount);
		let args = getUint8Args(Number(newAmount), exround);
		let lsiga = new algosdk.LogicSigAccount(program, args);

		const lsig = algosdk.makeLogicSig(program, args);

		const sigkey = decodeAddress(address).publicKey;
		console.log(sigkey);

		lsig.sig = await myAlgoConnect.signLogicSig(lsig.logic, address);
		//const lsigs = await myAlgoConnect.signLogicSig(lsig, result);
		const lsa = lsig.toByte();
		console.log(decode(lsa));
		//const nlsig = { arg: lsig.args, l: lsig.logic, sig: lsig.sig };
		let LogicAcc = { lsig: decode(lsa), sigkey };

		const encoded: Uint8Array = encode(LogicAcc);
		console.log(encoded);

		console.log('LogicSigAccount');
		console.log(decode(lsa));
		console.log('LSA');
		console.log(decode(encoded));
		/* const objL = decode(lsiga.toByte());
		console.log(objL);
		console.log('Decoding encoded');
		console.log(decode(encoded)); */

		try {
			toast.info(`Uploading to IPFS...`, {
				position: 'top-right',
				autoClose: false,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'info-ipfs',
			});
			const added = await ipfs.add(encoded);
			const url = `https://ipfs.infura.io/ipfs/${added.path}`;
			updateFileUrl(url);
			//console.log(url);
			const ipfsPath = added.path;
			console.log(added.path);
			console.log(added.cid.toString());

			//console.log(JSON.stringify(chunks));
			setHashIpfs(ipfsPath);

			toast.info(`IPFS hash: ${ipfsPath}`, {
				position: 'top-right',
				autoClose: false,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'info-hash',
			});
			toast.success(`Uploaded to IPFS🎉`, {
				position: 'top-right',
				autoClose: 8000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'success-ipfs',
			});
			//console.log(hashVal);
			/* const chunks = [];
			for await (const chunk of ipfs.cat(
				'QmaAnxTiT7yD7vRY42Doeg9fuW3es3dY6h5QJPb7pTJMs6'
			)) {
				chunks.push(chunk);
			}
			console.log(chunks);
			console.log(decode(chunks[0])); */
		} catch (error) {
			toast.error(`Failed to upload LogicSig`, {
				position: 'top-right',
				autoClose: 8000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'error-sig',
			});
			console.log('Error uploading hash: ', error);
		}
		//const hash = new Uint8Array(Buffer.from('ipfs-here'));
		//setHashVal(hash);
		//writeUserData(result, hash, lsa);
	};
	async function msignTxns(
		defaultAcct: string,
		txns: Transaction[],
		myalgoconnect: MyAlgoConnect
	): Promise<SignedTxn[]> {
		const unsigned = [];
		const signedTxns = [];

		for (const tidx in txns) {
			if (!txns[tidx]) continue;

			const txn = txns[tidx];
			if (algosdk.encodeAddress(txn.from.publicKey) === defaultAcct) {
				signedTxns.push(unsigned.length);
				unsigned.push(txn.toByte());
			} else {
				signedTxns.push({ txID: '', blob: new Uint8Array() });
			}
		}

		const s = await myalgoconnect.signTransaction(unsigned);
		for (let x = 0; x < signedTxns.length; x++) {
			if (typeof signedTxns[x] === 'number') signedTxns[x] = s[signedTxns[x]];
		}

		return signedTxns;
	}
	function getSigner(myAlgoConnect: MyAlgoConnect): TransactionSigner {
		//const myAlgoConnect = new MyAlgoConnect();
		return async (txnGroup: Transaction[], indexesToSign: number[]) => {
			const txns = await Promise.resolve(
				//myAlgoConnect.signTransaction(txnGroup.map((txn) => txn.toByte()))
				await msignTxns(address, txnGroup, myAlgoConnect)
			);
			return txns.map((tx) => {
				return tx.blob;
			});
		};
	}

	async function getContractAPI(): Promise<algosdk.ABIContract> {
		const resp = await fetch('/d4t.json');
		return new algosdk.ABIContract(await resp.json());
	}
	async function sign() {
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

		const myAlgoConnect = new MyAlgoConnect();
		// pass myAlgoConnect as exactly the same object for signer
		const signer = getSigner(myAlgoConnect);
		const commonParams = {
			appID: contract.networks['default'].appID,
			sender: address,
			suggestedParams: suggested,
			//OnComplete: algosdk.OnApplicationComplete.OptInOC,
			signer: signer,
		};
		const comp = new algosdk.AtomicTransactionComposer();

		// Simple ABI Calls with standard arguments, return type
		/*comp.addMethodCall({
			method: getMethodByName('test'),
			methodArgs: ['ping'],
			...commonParams,
		});
		 comp.addMethodCall({
			method: getMethodByName('test'),
			methodArgs: ['something'],
			...commonParams,
		}); */

		// This method requires a `transaction` as its second argument. Construct the transaction and pass it in as an argument.
		// The ATC will handle adding it to the group transaction and setting the reference in the application arguments.

		// Create a transaction
		const ptxn = new Transaction({
			from: address,
			to: address,
			amount: 10000,
			note: new Uint8Array(Buffer.from('testing')),
			suggestedParams: suggested,
		}); // algosdk.makePaymentTxnWithSuggestedParamsFromObject
		// Construct TransactionWithSigner
		const tws = {
			txn: ptxn,
			signer: signer,
		};

		// Pass TransactionWithSigner to ATC
		//comp.addTransaction(tws);
		comp.addMethodCall({
			method: getMethodByName('testtxn'),
			methodArgs: [tws, 'something'],
			...commonParams,
		});

		// This is not necessary to call but it is helpful for debugging
		// to see what is being sent to the network
		const g = comp.buildGroup();
		console.log(g);
		try {
			toast.info(`Submitting...`, {
				position: 'top-right',
				autoClose: 3000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'info-id',
			});
			const result = await comp.execute(testNetClientalgod, 2);
			console.log(result);
			for (const idx in result.methodResults) {
				console.log(result.methodResults[idx]);
			}
			if (result.confirmedRound) {
				toast.success(`Confirmed in round ${result.confirmedRound}`, {
					position: 'top-right',
					autoClose: 10000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'success-id',
				});
			} else {
				toast.error(`Error submitting transaction`, {
					position: 'top-right',
					autoClose: 10000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'error-id',
				});
			}
		} catch (error) {
			toast.error(`Transaction Rejected`, {
				position: 'top-right',
				autoClose: 10000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				toastId: 'error-id',
			});
		}
	}
	// Utility function to return an ABIMethod by its name
	async function getMethodByName(name: string): Promise<algosdk.ABIMethod> {
		const contract = await getContractAPI();
		const m = contract.methods.find((mt: algosdk.ABIMethod) => {
			return mt.name == name;
		});
		if (m === undefined) throw Error('Method undefined: ' + name);
		return m;
	}
	const stake = async () => {
		try {
			const suggested = await apiGetTxnParams(ChainType.TestNet);

			const ipfsLsaHash = Uint8Array.from(
				Buffer.from(hashIpfs) //'QmNTkHdGbUxnLSBf1jjmAHBQPjMFAvpJmEh8DzU3XYCqbG'
			);
			const contract = await getContractAPI();

			const getMethod = await getMethodByName('earn');

			const myAlgoConnect = new MyAlgoConnect();
			const signer = getSigner(myAlgoConnect);
			const commonParams = {
				appID: contract.networks['default'].appID,
				sender: address,
				suggestedParams: suggested,
				//OnComplete: algosdk.OnApplicationComplete.OptInOC,
				signer: signer,
			};
			const comp = new algosdk.AtomicTransactionComposer();

			// Create a transaction
			const ptxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
				from: address,
				to: address,
				amount: 0,
				assetIndex: DUSD,
				note: new Uint8Array(Buffer.from('Opt-in to NFT')),
				suggestedParams: suggested,
			}); // algosdk.makePaymentTxnWithSuggestedParamsFromObject
			// Construct TransactionWithSigner
			const tws = {
				txn: ptxn,
				signer: signer,
			};

			const optin = await checkAssetOptin(DUSD, address);

			if (optin == false || optin[0]['deleted']) {
				console.log('Not opted in');
				// Pass TransactionWithSigner to ATC
				comp.addTransaction(tws);
				comp.addMethodCall({
					method: getMethod,
					methodArgs: [[NFTColl], newAmount, validRound, ipfsLsaHash],
					...commonParams,
				});
				// This is not necessary to call but it is helpful for debugging
				// to see what is being sent to the network
				const g = comp.buildGroup();
				console.log(g);

				toast.info(`Submitting...`, {
					position: 'top-right',
					autoClose: 3000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'info-id',
				});
				const result = await comp.execute(testNetClientalgod, 2);
				console.log(result);
				for (const idx in result.methodResults) {
					console.log(result.methodResults[idx]);
				}
				if (result.confirmedRound) {
					toast.success(`Confirmed in round ${result.confirmedRound}`, {
						position: 'top-right',
						autoClose: 10000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						toastId: 'success-id',
					});
				} else {
					toast.error(`Error submitting transaction`, {
						position: 'top-right',
						autoClose: 10000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						toastId: 'error-id',
					});
				}

				// Submit the transaction
				return; //await submitTransaction(signedGroup);
			} else if ((optin.length = 1 && !optin[0]['deleted'])) {
				console.log('Already opted in');
				comp.addMethodCall({
					method: getMethod,
					methodArgs: [[NFTColl], newAmount, validRound, ipfsLsaHash],
					...commonParams,
				});
				// This is not necessary to call but it is helpful for debugging
				// to see what is being sent to the network
				const g = comp.buildGroup();
				console.log(g);

				toast.info(`Submitting...`, {
					position: 'top-right',
					autoClose: 3000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					toastId: 'info-id',
				});
				const result = await comp.execute(testNetClientalgod, 2);
				console.log(result);
				for (const idx in result.methodResults) {
					console.log(result.methodResults[idx]);
				}
				if (result.confirmedRound) {
					toast.success(`Confirmed in round ${result.confirmedRound}`, {
						position: 'top-right',
						autoClose: 10000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						toastId: 'success-id',
					});
				} else {
					toast.error(`Error submitting transaction`, {
						position: 'top-right',
						autoClose: 10000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						toastId: 'error-id',
					});
				}

				return; //await submitTransaction(signedGroup);
			}
		} catch (error) {
			console.log(error);
			toast.error(`Request Rejected`, {
				position: 'top-right',
				autoClose: 8000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
			});
		}
	};
	/**
	 * Returns Uint8array of LogicSig from ipfs, throw error
	 * @param ipfsPath hash string of ipfs path
	 */
	const borrowGetLogic = async (ipfsPath: string): Promise<Uint8Array> => {
		const chunks = [];
		for await (const chunk of ipfs.cat(ipfsPath)) {
			chunks.push(chunk);
		}
		//console.log(chunks);
		//setBorrowLogicSig(chunks[0]);
		return chunks[0];
	};
	async function wcsignATC() {
		const suggested = await apiGetTxnParams(ChainType.TestNet);
		const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
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
		const signer = getSignerWC(connector, address);
		suggested.flatFee = true;
		suggested.fee = 4000;
		let acct = algosdk.mnemonicToSecretKey(
			process.env.NEXT_PUBLIC_MEMONIC_VUI as string
		);
		// We initialize the common parameters here, they'll be passed to all the transactions
		// since they happen to be the same
		const commonParams = {
			appID: contract.networks['default'].appID,
			sender: acct.addr,
			suggestedParams: suggested,
			onComplete: OnApplicationComplete.NoOpOC,
			signer, //: algosdk.makeBasicAccountTransactionSigner(acct),
		};
		const comp = new algosdk.AtomicTransactionComposer();
		//'QmNU1gEgZKnMAL9gEWdWXAmuaDguUFhbGYqLw4p1iCGrSc' //'QmRY9HMe2fb6HAJhywnTTYQamLxQV9qJbjVeK7Wa314TeR' 'QmdvvuGptFDAoB6Vf9eJcPeQTKi2MjA3AnEv47syNPz6CS'
		const borrowLogic = await borrowGetLogic(
			'QmXJWc7jeSJ7F2Cc4cm6SSYdMnAiCG4M4gfaiQXvDbdAbL' //'QmWFR6jSCaqfxjVK9S3PNNyyCh35kYx5sGgwi7eZAogpD9' //'QmciTBaxmKRF9fHjJP7q83f9nvBPf757ocbyEvTnrMttyM' //'QmdHj2MHo6Evzjif3RhVCoMV2RMqkxvcZqLP946cN77ZEN' //'QmfWfsjuay1tJXJsNNzhZqgTqSj3CtnMGtu7NK3bVtdh6k' //'QmPubkotHM9iArEoRfntSB6VwbYBLz19c1uxmTp4FYJzbk' //'QmaDABqWt3iKso3YjxRRBCj4HJqqeerAvrBeLTMTTz7VzY' //'QmbbDFKzSAbBpbmhn9b31msyMz6vnZ3ZvKW9ebBuUDCyK9' //'QmYoFqC84dd7K5nCu5XGyWGyqDwEs7Aho8j46wqeGRfuJq' //'QmaGYNdQaj2cygMxxDQqJie3vfAJzCa1VBstReKY1ZuYjK'
		);
		console.log(borrowLogic);
		const borrowLogicSig = borrowLogic;
		const addressLogicSig =
			'KLNYAXOWHKBHUKVDDWFOSXNHYDS45M3KJW4HYJ6GOQB4LGAH4LJF57QVZI';
		const amountborrowing = 1000000;
		const xids = [NFTColl];
		const camt = [1];
		const lamt = [1000000];
		const USDC = 10458941;
		const DUSD = 84436770;
		const MNG = 84436122;
		const LQT = 84436752;
		/* let lsiga = algosdk.logicSigFromByte(borrowLogicSig);
		console.log(lsiga);
		console.log(lsiga.toByte()); */

		console.log('Logic sig here');
		let lsig = algosdk.LogicSigAccount.fromByte(borrowLogicSig);
		console.log(lsig.verify());
		console.log(lsig.toByte());
		suggestedParams.flatFee = true;
		suggestedParams.fee = 0;
		const ptxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: addressLogicSig, //Lender address
			to: acct.addr, //Borrower address
			amount: amountborrowing,
			assetIndex: USDC,
			suggestedParams,
		});

		// Construct TransactionWithSigner
		const tws = {
			txn: ptxn,
			signer: algosdk.makeLogicSigAccountTransactionSigner(lsig),
		};
		comp.addTransaction(tws);
		comp.addMethodCall({
			method: getMethodByName('borrow'),
			methodArgs: [xids, camt, lamt, addressLogicSig, xids[0], DUSD, MNG, LQT],
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
		console.log(result);
		for (const idx in result.methodResults) {
			console.log(result.methodResults[idx]);
		}
		return result;
	}
	async function repay() {
		const suggested = await apiGetTxnParams(ChainType.TestNet);
		const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
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
		const signer = getSignerWC(connector, address);
		suggested.flatFee = true;
		suggested.fee = 3000;
		// We initialize the common parameters here, they'll be passed to all the transactions
		// since they happen to be the same
		const commonParams = {
			appID: contract.networks['default'].appID,
			sender: address,
			suggestedParams: suggested,
			signer: signer,
		};
		const comp = new algosdk.AtomicTransactionComposer();

		const APP_ID = contract.networks['default'].appID;
		const xids = [97931298];
		const ramt = [1030000];
		const USDC = 10458941;
		const MNG = 84436122;
		const LQT = 84436752;
		suggestedParams.flatFee = true;
		suggestedParams.fee = 0;
		const ptxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: address,
			to: algosdk.getApplicationAddress(APP_ID),
			amount: ramt[0],
			assetIndex: USDC,
			suggestedParams,
		});
		const tws = {
			txn: ptxn,
			signer: signer,
		};

		comp.addMethodCall({
			method: getMethodByName('repay'),
			methodArgs: [tws, xids, ramt, xids[0], MNG, LQT],
			...commonParams,
		});
		//const pay_txn = getPayTxn(suggested, sw.getDefaultAccount());

		//comp.addTransaction({ txn: pay_txn, signer: sw.getSigner() });

		// This is not necessary to call but it is helpful for debugging
		// to see what is being sent to the network
		const g = comp.buildGroup();
		console.log(g);

		const result = await comp.execute(testNetClientalgod, 2);
		console.log(result);

		return result;
	}
	async function walletConnectSigner(
		txns: Transaction[],
		connector: WalletConnect | null,
		address: string
	) {
		if (!connector) {
			console.log('No connector found!');
			return txns.map((tx) => {
				return {
					txID: tx.txID(),
					blob: new Uint8Array(),
				};
			});
		}
		const txnsToSign = txns.map((txn) => {
			const encodedTxn = Buffer.from(
				algosdk.encodeUnsignedTransaction(txn)
			).toString('base64');
			if (algosdk.encodeAddress(txn.from.publicKey) !== address)
				return { txn: encodedTxn };
			return { txn: encodedTxn };
		});
		// sign transaction
		const requestParams: SignTxnParams = [txnsToSign];

		const request = formatJsonRpcRequest('algo_signTxn', requestParams);
		//console.log('Request param:', request);
		const result: string[] = await connector.sendCustomRequest(request);

		//console.log('Raw response:', result);
		return result.map((element, idx) => {
			return element
				? {
						txID: txns[idx].txID(),
						blob: new Uint8Array(Buffer.from(element, 'base64')),
				  }
				: {
						txID: txns[idx].txID(),
						blob: new Uint8Array(),
				  };
		});
	}
	function getSignerWC(
		connector: WalletConnect,
		address: string
	): TransactionSigner {
		return async (txnGroup: Transaction[], indexesToSign: number[]) => {
			const txns = await Promise.resolve(
				walletConnectSigner(txnGroup, connector, address)
			);
			return txns.map((tx) => {
				return tx.blob;
			});
		};
	}

	return (
		<div className='w-full h-screen text-center'>
			{/* Illustration behind hero content */}

			{/* <div className='h-0 w-full pt-[42%] relative'>
				<iframe
					className='absolute top-0 left-0 w-full h-full'
					src='/background.svg'
				></iframe>
			</div> */}

			<div className='max-w-[1240px] w-full h-full mx-auto p-2 flex justify-center items-center'>
				<div className='max-w-6xl mx-auto px-4 sm:px-6'>
					{/* content */}
					<div className='pt-20 pb-8 md:pt-24 md:pb-20'>
						{/* Section header */}
						{!address ? (
							<div className='text-center pb-14 md:pb-16'>
								<p className='uppercase text-sm tracking-widest text-gray-600'>
									Let's make money together
								</p>
								<h1>
									{'Leverage NFT with '}
									<span className='bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400'>
										{'DeFi4'}
									</span>
								</h1>
								<button
									onClick={async (e) => {
										e.preventDefault();
										await wcsignATC();
									}}
									className='bg-gradient-to-r from-gray-100 to-red-300 p-3 rounded-md ring-gray-200 text-sm text-gray-800 hover:ring-1 focus:outline-none active:ring-gray-300 hover:shadow-md'
								>
									borrow
								</button>
								<button
									onClick={async (e) => {
										e.preventDefault();
										await camtCheck();
									}}
									className='bg-gradient-to-r from-gray-100 to-red-300 p-3 rounded-md ring-gray-200 text-sm text-gray-800 hover:ring-1 focus:outline-none active:ring-gray-300 hover:shadow-md'
								>
									Check
								</button>
							</div>
						) : (
							<div className='text-centerpb-14 md:pb-16'>
								{hashIpfs ? (
									<button
										onClick={(e) => {
											e.preventDefault();
											stake();
										}}
										className='bg-gradient-to-r from-gray-100 to-red-300 p-3 rounded-md ring-gray-200 text-sm text-gray-800 hover:ring-1 focus:outline-none active:ring-gray-300 hover:shadow-md'
									>
										Stake - Promise
									</button>
								) : (
									<>
										<button
											onClick={(e) => {
												e.preventDefault();
												logic();
											}}
											className='btn'
										>
											LSign
										</button>
										<button
											onClick={(e) => {
												e.preventDefault();
												sign();
											}}
											className='btn'
										>
											ATC
										</button>
									</>
								)}
								<button
									onClick={async (e) => {
										e.preventDefault();
										checkAllowedAmount();
									}}
									className='btn'
								>
									Search
								</button>
								<button
									onClick={async (e) => {
										e.preventDefault();
										await wcsignATC();
									}}
									className='bg-gradient-to-r from-gray-100 to-red-300 p-3 rounded-md ring-gray-200 text-sm text-gray-800 hover:ring-1 focus:outline-none active:ring-gray-300 hover:shadow-md'
								>
									borrow
								</button>
								<button
									onClick={async (e) => {
										e.preventDefault();
										await camtCheck();
									}}
									className='bg-gradient-to-r from-gray-100 to-red-300 p-3 rounded-md ring-gray-200 text-sm text-gray-800 hover:ring-1 focus:outline-none active:ring-gray-300 hover:shadow-md'
								>
									Check
								</button>
								<button
									onClick={async (e) => {
										e.preventDefault();
										await repay();
									}}
									className='btn'
								>
									Repay
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
export async function checkAssetOptin(assetId: number, address: string) {
	const accountInfo = await testNetClientindexer
		.lookupAccountAssets(address)
		.assetId(assetId)
		.do();
	if (accountInfo.assets.length > 0) {
		return accountInfo['assets'];
	}
	return false;
}
export default Main;
