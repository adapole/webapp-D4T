import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';
//import Main from '../components/Main';
const Main = dynamic(() => import('../components/Main'), {
	ssr: false,
});
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
import React from 'react';

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
interface IAppState {
	connector: WalletConnect | null;
	fetching: boolean;
	connected: boolean;
	showModal: boolean;
	pendingRequest: boolean;
	signedTxns: Uint8Array[][] | null;
	pendingSubmissions: Array<number | Error>;
	uri: string;
	accounts: string[];
	address: string;
	result: IResult | null;
	chain: ChainType;
	assets: IAssetData[];
	wc: boolean;
	mconnector: MyAlgoConnect | null;
}

const INITIAL_STATE: IAppState = {
	connector: null,
	fetching: false,
	connected: false,
	showModal: false,
	pendingRequest: false,
	signedTxns: null,
	pendingSubmissions: [],
	uri: '',
	accounts: [],
	address: '',
	result: null,
	chain: ChainType.TestNet,
	assets: [],
	wc: false,
	mconnector: null,
};

class Home extends React.Component<unknown, IAppState> {
	public state: IAppState = {
		...INITIAL_STATE,
	};
	public DynamicComponentWithNoSSR = dynamic(
		() => import('../components/WalletSelector'),
		{
			ssr: false,
		}
	);
	public walletConnectInit = async () => {
		// bridge url
		const bridge = 'https://bridge.walletconnect.org';

		// create new connector
		const connector = new WalletConnect({
			bridge,
			qrcodeModal: QRCodeModal,
		});
		await this.setStateAsync({ connector, wc: true });
		/* clientMeta: {
			description: 'My description ',
			url: 'http://localhost:3000',
			icons: ['../public/favicon.ico'],
			name: 'The name',
		}, */
		// check if already connected
		if (!connector.connected) {
			// create new session
			await connector.createSession();
		}

		// subscribe to events
		await this.subscribeToEvents();
		//await this.JinaAppOptin();
	};
	public subscribeToEvents = () => {
		const { connector } = this.state;

		if (!connector) {
			return;
		}

		connector.on('session_update', async (error, payload) => {
			console.log(`connector.on("session_update")`);

			if (error) {
				throw error;
			}

			const { accounts } = payload.params[0];
			this.onSessionUpdate(accounts);
		});

		connector.on('connect', (error, payload) => {
			console.log(`connector.on("connect")`);

			if (error) {
				throw error;
			}

			this.onConnect(payload);
		});

		connector.on('disconnect', (error, payload) => {
			console.log(`connector.on("disconnect")`);

			if (error) {
				throw error;
			}

			this.onDisconnect();
		});

		if (connector.connected) {
			const { accounts } = connector;
			const address = accounts[0];
			this.setState({
				connected: true,
				accounts,
				address,
			});
			this.onSessionUpdate(accounts);
		}

		this.setState({ connector });
	};

	public killsession = async () => {
		const { connector } = this.state;
		if (connector) {
			connector.killSession();
		}
		this.resetApp();
	};
	public clearsession = async () => {
		await this.setStateAsync({ ...INITIAL_STATE });
	};
	public chainupdate = (newChain: ChainType) => {
		this.setState({ chain: newChain }, this.getAccountAssets);
	};

	public resetApp = async () => {
		await this.setState({ ...INITIAL_STATE });
	};
	public checkOptin = async () => {
		const { address } = this.state;
		const accountInfo = await testNetClientindexer
			.lookupAccountAppLocalStates(address)
			.do();
		//console.log(accountInfo['apps-local-states']);
		return accountInfo['apps-local-states'];
	};
	setStateAsync(state: any) {
		return new Promise((resolve: any) => {
			this.setState(state, resolve);
		});
	}
	public onConnect = async (payload: IInternalEvent) => {
		const { accounts } = payload.params[0];
		const address = accounts[0];
		await this.setStateAsync({
			connected: true,
			accounts,
			address,
		});
		this.getAccountAssets();
	};

	public onDisconnect = async () => {
		this.resetApp();
	};

	public onSessionUpdate = async (accounts: string[]) => {
		const address = accounts[0];
		await this.setState({ accounts, address });

		await this.getAccountAssets();
	};

	public getAccountAssets = async () => {
		const { address, chain } = this.state;
		this.setState({ fetching: true });
		try {
			// get account balances
			const assets = await apiGetAccountAssets(chain, address);
			await this.setStateAsync({ fetching: false, address, assets });
		} catch (error) {
			await this.setStateAsync({ fetching: false });
		}
	};

	public toggleModal = () =>
		this.setState({
			showModal: !this.state.showModal,
			pendingSubmissions: [],
		});
	public connectToMyAlgo = async (accounts: any) => {
		try {
			const address: string = accounts[0]['address'];
			const { chain } = this.state;

			this.setState({
				connected: true,
				accounts,
				address,
			});

			try {
				// get account balances
				const assets = await apiGetAccountAssets(chain, address);
				await this.setStateAsync({ fetching: false, address, assets });
			} catch (error) {
				//console.error(error);
				await this.setStateAsync({ fetching: false });
			}
		} catch (err) {
			//console.error(err);
			await this.setStateAsync({ ...INITIAL_STATE });
		}
	};
	public returnWallet = async (data: any) => {
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
					// subscribe to events, if walletconnect
					//console.log(wprovider);
					await this.walletConnectInit();
				} else if (a['provider']['url']) {
					const onClearResponse = (): void => {
						this.setState({
							connected: false,
							accounts: [],
							address: '',
						});
					};

					try {
						await this.setStateAsync({
							...INITIAL_STATE,
							mconnector: data.connector,
						});
						await this.connectToMyAlgo(accounts);
					} catch (err) {
						//console.error(err);
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

	public render = () => {
		const {
			connector,
			chain,
			assets,
			address,
			connected,
			fetching,
			showModal,
			pendingRequest,
			pendingSubmissions,
			result,
			wc,
			mconnector,
		} = this.state;

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
				<addressContext.Provider value={{ address, chain, wc, connector }}>
					<Main />
				</addressContext.Provider>

				{!address && !assets.length ? (
					<div className='flex space-x-4 items-center'>
						<this.DynamicComponentWithNoSSR
							returnWallet={this.returnWallet}
							wallets={['myalgowallet', 'walletconnect']}
						/>
					</div>
				) : (
					<div></div>
				)}
				<Header
					connected={connected}
					address={address}
					killsession={this.killsession}
					chain={chain}
					chainupdate={this.chainupdate}
					wc={wc}
					clearsession={this.clearsession}
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
}

export default Home;
