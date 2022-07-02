import WalletConnect from '@walletconnect/client';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';

const checkConnection = (connector: any) => {
	return connector.connected;
};

const ConnectToWalletConnect = (opts: any) => {
	const connector = new WalletConnect({
		bridge: 'https://bridge.walletconnect.org', // Required
		qrcodeModal: QRCodeModal,
	});

	return {
		provider: connector,
		connect: async () => {
			if (!connector.connected) {
				//await connector.createSession();
				console.log('connect index');
			}
		},
		check: () => checkConnection(connector),
	};
};

export default ConnectToWalletConnect;
