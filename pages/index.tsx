import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';
import Main from '../components/Main';

const DynamicComponent = dynamic(
	() => import('../components/AlgorandSession'),
	{
		ssr: false,
	}
);

const Home: NextPage = () => {
	return (
		<div>
			<Head>
				<title>DeFi4 | Dapp</title>
				<meta name='description' content='Generated by create next app' />
				<link rel='icon' href='/favicon.ico' />
			</Head>
			{/* <div id='root'></div>
			<DynamicComponent /> */}
			<Navbar />
			<Main />
		</div>
	);
};

export default Home;