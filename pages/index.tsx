import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';
//import Main from '../components/Main';
const Main = dynamic(() => import('../components/Main'), {
	ssr: false,
});
import { useEffect, useState } from 'react';
import {
	apiGetAccountAssets,
	ChainType,
	testNetClientalgod,
	testNetClientindexer,
} from '../lib/api';
import { IAssetData } from '../lib/helpers/types';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import { IInternalEvent } from '@walletconnect/types';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import { addressContext } from '../lib/helpers/addressContext';
import Header from '../components/Header';

const DynamicComponent = dynamic(
	() => import('../components/AlgorandSession'),
	{
		ssr: false,
	}
);
export interface IResult {
	method: string;
	body: Array<
		Array<{
			txID: string;
			signingAddress?: string;
			signature: string;
		} | null>
	>;
}
const Home: NextPage = () => {
	const [connector, setConnector] = useState<WalletConnect | null>(null);
	const [mconnector, setMConnector] = useState<MyAlgoConnect | null>(null);
	const [connected, setConnected] = useState(false);
	const [accounts, setAccounts] = useState<String[]>([]);
	const [address, setAddress] = useState('');
	const [chain, setChain] = useState<ChainType>(ChainType.TestNet);
	const [fetching, setFetching] = useState(false);
	const [assets, setAssets] = useState<IAssetData[]>([]);
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState<IResult | null>(null);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);
	const [wc, setWc] = useState(false);
	const DynamicComponentWithNoSSR = dynamic(
		() => import('../components/WalletSelector'),
		{
			ssr: false,
		}
	);
	function setConnectorAsync(state: any) {
		return new Promise((resolve: any) => {
			setConnector(state), resolve;
		});
	}

	const walletConnectInit = async () => {
		// bridge url
		const bridge = 'https://bridge.walletconnect.org';

		// create new connector
		const connector = new WalletConnect({
			bridge,
			qrcodeModal: QRCodeModal,
		});
		//await setStateAsync({ connector, wc: true });
		setConnectorAsync(connector);
		setWc(true);
		console.log('connector');
		// check if already connected
		if (!connector.connected) {
			// create new session
			await connector.createSession();
		}

		// subscribe to events
		await subscribeToEvents();
		//await D4TAppOptin();
	};
	const subscribeToEvents = () => {
		if (!connector) {
			return;
		}

		connector.on('session_update', async (error, payload) => {
			console.log(`connector.on("session_update")`);

			if (error) {
				throw error;
			}

			const { accounts } = payload.params[0];
			onSessionUpdate(accounts);
		});

		connector.on('connect', (error, payload) => {
			console.log(`connector.on("connect")`);

			if (error) {
				throw error;
			}

			onConnect(payload);
		});

		connector.on('disconnect', (error, payload) => {
			console.log(`connector.on("disconnect")`);

			if (error) {
				throw error;
			}

			onDisconnect();
		});

		if (connector.connected) {
			const { accounts } = connector;
			const address = accounts[0];

			setConnected(true);
			setAccounts(accounts);
			setAddress(address);

			onSessionUpdate(accounts);
		}

		//setState({ connector });
		setConnector(connector);
	};
	const killsession = async () => {
		//const { connector } = this.state;
		if (connector) {
			connector.killSession();
		}
		resetApp();
	};
	const clearsession = async () => {
		await InitialState();
		await setConnectorAsync(null);
	};
	const InitialState = async () => {
		setConnector(null);
		setMConnector(null);
		setConnected(false);
		setAccounts([]);
		setAddress('');
		setChain(ChainType.TestNet);
		setFetching(false);
		setAssets([]);
		setShowModal(false);
		setResult(null);
		setPendingSubmissions([]);
		setPendingRequest(false);
		setWc(false);
	};
	const chainupdate = (newChain: ChainType) => {
		//this.setState({ chain: newChain }, getAccountAssets);
		setChain(newChain);
		getAccountAssets();
	};
	const checkOptin = async () => {
		if (!address) return;
		const accountInfo = await testNetClientindexer
			.lookupAccountAppLocalStates(address)
			.do();
		//console.log(accountInfo['apps-local-states']);
		return accountInfo['apps-local-states'];
	};
	const onConnect = async (payload: IInternalEvent) => {
		const { accounts } = payload.params[0];
		const address = accounts[0];

		setConnected(true);
		setAccounts(accounts);
		setAddress(address);

		getAccountAssets();
	};

	const onDisconnect = async () => {
		resetApp();
	};

	const onSessionUpdate = async (accounts: string[]) => {
		const address = accounts[0];

		setAccounts(accounts);
		setAddress(address);

		await getAccountAssets();
	};

	const getAccountAssets = async () => {
		//const { address, chain } = this.state;

		setFetching(true);
		try {
			// get account balances
			const assets = await apiGetAccountAssets(chain, address);

			setFetching(false);
			setAddress(address);
			setAccounts(accounts);
		} catch (error) {
			console.error(error);
			//await this.setStateAsync({ fetching: false });
			setFetching(false);
		}
	};

	const resetApp = async () => {
		await clearsession();
	};
	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};

	const connectToMyAlgo = async (accounts: any) => {
		try {
			const address: string = accounts[0]['address'];
			//const { chain } = this.state;

			setConnected(true);
			setAccounts(accounts);
			setAddress(address);

			try {
				// get account balances
				const assets = await apiGetAccountAssets(chain, address);
				//await this.setStateAsync({ fetching: false, address, assets });
				setFetching(false);
				setAddress(address);
				setAssets(assets);
			} catch (error) {
				console.error(error);
				//await this.setStateAsync({ fetching: false });
				setFetching(false);
			}
		} catch (err) {
			console.error(err);
			//await this.setStateAsync({ ...INITIAL_STATE });
		}
	};
	const returnWallet = async (data: any) => {
		if (!!data) {
			try {
				console.log(data.connector.check());
				const accounts = await data.connector.connect();
				const connector = data.connector.provider;
				console.log(connector);

				const a = data.connector;
				console.log(a);
				console.log(accounts);

				if (a['provider']['protocol'] === 'wc') {
					await walletConnectInit();
				} else if (a['provider']['url']) {
					const onClearResponse = (): void => {
						setConnected(false);
						setAccounts([]);
						setAddress('');
					};

					try {
						setMConnector(data.connector);
						await connectToMyAlgo(accounts);
					} catch (err) {
						console.error(err);
					}
				}
			} catch (error) {
				console.error(error);
				toast.error(`Window not loaded`, {
					position: 'top-left',
					autoClose: 4000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
				});
			}
		}
	};

	return (
		<div>
			<Head>
				<title>DeFi4NFT | Dapp</title>
				<meta name='description' content='Generated by create next app' />
				<link rel='icon' href='/favicon.ico' />
			</Head>
			{/* <div id='root'></div>
			<DynamicComponent /> */}
			<Navbar />
			<addressContext.Provider value={{ address, accounts, chain }}>
				<Main />
			</addressContext.Provider>

			{!address && !assets.length ? (
				<div className='flex space-x-4 items-center'>
					<DynamicComponentWithNoSSR
						returnWallet={returnWallet}
						wallets={['myalgowallet', 'walletconnect']}
					/>
				</div>
			) : (
				<div></div>
			)}
			<Header
				connected={connected}
				address={address}
				killsession={killsession}
				chain={chain}
				chainupdate={chainupdate}
				wc={wc}
				clearsession={clearsession}
			/>
			<ToastContainer
				hideProgressBar={false}
				newestOnTop
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
		</div>
	);
};

export default Home;
