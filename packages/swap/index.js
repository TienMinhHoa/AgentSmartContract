import { ethers } from 'ethers';

import { logger } from '../logger/index.js';

import { config } from './config.js';
import FACTORY_ABI from './abis/factory.json' assert { type: 'json' };
import QUOTER_ABI from './abis/quoter.json' assert { type: 'json' };
import SWAP_ROUTER_ABI from './abis/swaprouter.json' assert { type: 'json' };
import POOL_ABI from './abis/pool.json' assert { type: 'json' };
import TOKEN_IN_ABI from './abis/weth.json' assert { type: 'json' };

// Deployment Addresses
const UNISWAPV3_FACTORY_CONTRACT_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const QUOTER_CONTRACT_ADDRESS = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const SWAP_ROUTER_CONTRACT_ADDRESS = '0x2626664c2603336E57B271c5C0b26F421741e481';

// Provider, Contract & Signer Instances
const provider = new ethers.JsonRpcProvider(config.RPC_URL);
const factoryContract = new ethers.Contract(
	UNISWAPV3_FACTORY_CONTRACT_ADDRESS,
	FACTORY_ABI,
	provider,
);
const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, provider);
const signer = new ethers.Wallet(config.PRIVATE_KEY, provider);

// Token Configuration
const WETH = {
	chainId: 8453,
	address: '0x4200000000000000000000000000000000000006',
	decimals: 18,
	symbol: 'WETH',
	name: 'Wrapped Ether',
	isToken: true,
	isNative: true,
	wrapped: true,
};

const USDC = {
	chainId: 8543,
	address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
	decimals: 6,
	symbol: 'USDC',
	name: 'USD//C',
	isToken: true,
	isNative: true,
	wrapped: false,
};

/**
 *
 */
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
	try {
		const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

		const approveTransaction = await tokenContract.approve.populateTransaction(
			SWAP_ROUTER_CONTRACT_ADDRESS,
			ethers.parseEther(amount.toString()),
		);

		const transactionResponse = await wallet.sendTransaction(approveTransaction);
		logger.info(`-------------------------------`);
		logger.info(`Sending Approval Transaction...`);
		logger.info(`-------------------------------`);
		logger.info(`Transaction Sent: ${transactionResponse.hash}`);
		logger.info(`-------------------------------`);
		const receipt = await transactionResponse.wait();
		logger.info(`Approval Transaction Confirmed! https://sepolia.etherscan.io/txn/${receipt.hash}`);
	} catch (error) {
		logger.error('An error occurred during token approval:', error);
		throw new Error('Token approval failed');
	}
}

/**
 *
 */
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
	logger.info(tokenOut.address);
	const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
	if (!poolAddress) {
		throw new Error('Failed to get pool address');
	}
	logger.info(poolAddress);
	const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
	const [token0, token1, fee] = await Promise.all([
		poolContract.token0(),
		poolContract.token1(),
		poolContract.fee(),
	]);
	return { poolContract, token0, token1, fee };
}

/**
 *
 */
async function quoteAndLogSwap(quoterContract, fee, signer, amountIn) {
	const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall({
		tokenIn: WETH.address,
		tokenOut: USDC.address,
		fee: fee,
		recipient: signer.address,
		deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
		amountIn: amountIn,
		sqrtPriceLimitX96: 0,
	});
	logger.info(`-------------------------------`);
	logger.info(
		`Token Swap will result in: ${ethers.formatUnits(quotedAmountOut[0].toString(), USDC.decimals)} ${USDC.symbol} for ${ethers.formatEther(amountIn)} ${WETH.symbol}`,
	);
	const amountOut = ethers.formatUnits(quotedAmountOut[0], USDC.decimals);
	return amountOut;
}

/**
 *
 */
async function prepareSwapParams(poolContract, signer, amountIn, amountOut) {
	return {
		tokenIn: WETH.address,
		tokenOut: USDC.address,
		fee: await poolContract.fee(),
		recipient: signer.address,
		amountIn: amountIn,
		amountOutMinimum: amountOut,
		sqrtPriceLimitX96: 0,
	};
}

/**
 *
 */
async function executeSwap(swapRouter, params, signer) {
	logger.info(`-------------------------------`);
	logger.info(`Executing Swap...`);
	logger.info(`-------------------------------`);
	const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
	const receipt = await signer.sendTransaction(transaction);
	logger.info(`-------------------------------`);
	logger.info(`Receipt: https://sepolia.etherscan.io/tx/${receipt.hash}`);
	logger.info(`-------------------------------`);
}

/**
 *
 */
async function wrapETH(amount) {
	try {
		const wethContract = new ethers.Contract(WETH.address, TOKEN_IN_ABI, signer);

		const tx = await wethContract.deposit({
			value: ethers.parseUnits(amount.toString(), 18), // Convert ETH to Wei
		});

		logger.info(`-------------------------------`);
		logger.info(`Wrapping ${amount} ETH into WETH...`);
		logger.info(`Transaction Sent: ${tx.hash}`);
		logger.info(`-------------------------------`);

		await tx.wait();
		logger.info(`Wrapped Successfully! https://sepolia.etherscan.io/tx/${tx.hash}`);
	} catch (error) {
		logger.error('Error wrapping ETH:', error);
	}
}

/**
 *
 */
export async function swapToken(swapAmount) {
	const inputAmount = swapAmount;
	const amountIn = ethers.parseUnits(inputAmount.toString(), 18);

	try {
		await approveToken(WETH.address, TOKEN_IN_ABI, amountIn, signer);
		const { poolContract, token0, token1, fee } = await getPoolInfo(factoryContract, WETH, USDC);
		logger.info(`-------------------------------`);
		logger.info(`Fetching Quote for: ${WETH.symbol} to ${USDC.symbol}`);
		logger.info(`-------------------------------`);
		logger.info(`Swap Amount: ${ethers.formatEther(amountIn)}`);

		const quotedAmountOut = await quoteAndLogSwap(quoterContract, fee, signer, amountIn);

		await wrapETH(swapAmount);

		// const wethContract = new ethers.Contract(WETH.address, TOKEN_IN_ABI, provider);
		// const balance = await wethContract.balanceOf(signer.address);
		// console.log(`WETH Balance: ${ethers.formatEther(balance)}`);

		const params = await prepareSwapParams(
			poolContract,
			signer,
			amountIn,
			quotedAmountOut[0].toString(),
		);
		const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, signer);
		await executeSwap(swapRouter, params, signer);
		return 'Swap successfull';
	} catch (error) {
		logger.error('An error occurred:', error.message);
		return 'Fail in Swapping tokens';
	}
}

// swapToken(0.00001) // Change amount as needed
