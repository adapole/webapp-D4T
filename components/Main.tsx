import React from 'react';

type Props = {};

const Main = (props: Props) => {
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
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Main;
