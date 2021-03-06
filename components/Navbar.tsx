import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiOutlineClose, AiOutlineMail, AiOutlineMenu } from 'react-icons/ai';
import { FaDiscord, FaGithub, FaTelegram } from 'react-icons/fa';

type Props = {};

const Navbar = (props: Props) => {
	const [nav, setNav] = useState(false);

	const handleNav = () => {
		setNav(!nav);
	};
	return (
		<div className='fixed w-full h-20 shadow-xl z-[100]'>
			<div className='flex w-full justify-between items-center h-full px-2 2xl:px-16'>
				<Image src='/navLogo.png' alt='/' width={125} height={50} />
				<div
					className={
						nav
							? 'md:hidden fixed left-0 top-0 w-full h-screen bg-black/70'
							: ''
					}
				>
					<div
						className={
							nav
								? 'fixed left-0 top-0 w-[75%] sm:w-[60%] md:w-[45%] h-screen bg-[#ecf0f3] p-10 ease-in duration-500'
								: 'fixed left-[-100%] top-0 p-10 ease-in duration-500'
						}
					>
						<div>
							<div className='flex w-full items-center justify-between'>
								<Image src='/navLogo.png' alt='/' width={87} height={35} />
								<div
									onClick={handleNav}
									className='rounded-full shadow-lg shadow-gray-400 p-3 cursor-pointer'
								>
									<AiOutlineClose />
								</div>
							</div>
							<div className='border-b border-gray-300 my-4'>
								<p className='w-[85%] md:w-[90%] py-4'>
									Let's make money together
								</p>
							</div>
						</div>
						<div className='py-4 flex flex-col'>
							<ul className='uppercase'>
								<Link href='/'>
									<li className='py-4 text-sm '>Home</li>
								</Link>
								<Link href='/'>
									<li className='py-4 text-sm '>About</li>
								</Link>
								<Link href='/'>
									<li className='py-4 text-sm'>Contact</li>
								</Link>
								<Link href='/'>
									<li className='py-4 text-sm'>Launch app</li>
								</Link>
							</ul>
							<div className='pt-14 sm:pt-40'>
								<p className='uppercase tracking-widest text-[#5651e5]'>
									Let's connect
								</p>
								<div className='flex items-center justify-between my-4 w-full sm:w-[80%]'>
									<div className='rounded-full shadow-lg shadow-gray-400 p-3 cursor-pointer hover:scale-105 ease-in duration-300'>
										<FaTelegram />
									</div>
									<div className='rounded-full shadow-lg shadow-gray-400 p-3 cursor-pointer hover:scale-105 ease-in duration-300'>
										<FaGithub />
									</div>
									<div className='rounded-full shadow-lg shadow-gray-400 p-3 cursor-pointer hover:scale-105 ease-in duration-300'>
										<AiOutlineMail />
									</div>
									<div className='rounded-full shadow-lg shadow-gray-400 p-3 cursor-pointer hover:scale-105 ease-in duration-300'>
										<FaDiscord />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div>
					<ul className='hidden md:flex uppercase'>
						<Link href='/'>
							<li className='ml-10 text-sm hover:border-b'>Home</li>
						</Link>
						<Link href='/'>
							<li className='ml-10 text-sm hover:border-b'>About</li>
						</Link>
						<Link href='/'>
							<li className='ml-10 text-sm hover:border-b'>Contact</li>
						</Link>
						<Link href='/'>
							<li className='ml-10 text-sm hover:border-b'>Launch app</li>
						</Link>
					</ul>
					<div onClick={handleNav} className='md:hidden'>
						<AiOutlineMenu size={25} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Navbar;
