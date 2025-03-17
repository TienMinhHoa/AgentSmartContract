import { ethers } from 'ethers';

import { logger } from '../logger/index.js';

import { config } from './config.js';
import FACTORY_ABI from './abis/factory.json' assert { type: 'json' };
import QUOTER_ABI from './abis/quoter.json' assert { type: 'json' };
import SWAP_ROUTER_ABI from './abis/swaprouter.json' assert { type: 'json' };
import POOL_ABI from './abis/pool.json' assert { type: 'json' };
import WETH_IN_ABI from './abis/weth.json' assert { type: 'json' };

// Deployment Addresses
const UNISWAPV3_FACTORY_CONTRACT_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const QUOTER_CONTRACT_ADDRESS = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const SWAP_ROUTER_CONTRACT_ADDRESS = '0x2626664c2603336E57B271c5C0b26F421741e481';
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const cbBTC_ADDRESS = "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf";
const doginme_ADDRESS = "0x6921B130D297cc43754afba22e5EAc0FBf8Db75b";

// Provider, Contract & Signer Instances
const provider = new ethers.JsonRpcProvider(config.RPC_URL);
const factoryContract = new ethers.Contract(
	UNISWAPV3_FACTORY_CONTRACT_ADDRESS,
	FACTORY_ABI,
	provider,
);
const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, provider);
const signer = new ethers.Wallet(config.PRIVATE_KEY, provider);

/**
 *
 */
export const getAddressFromSymbol = (symbol) => {
	switch (symbol) {
		case 'WETH':
			return WETH_ADDRESS;
		case 'USDC':
			return USDC_ADDRESS;
		case 'cbBTC':
			return cbBTC_ADDRESS;
		case 'doginme':
			return doginme_ADDRESS;
		default:
			throw new Error('Token not supported');
	}
}

/**
 *
 */
async function approveToken(tokenAddress, amount, wallet) {
	try {
		const erc20Abi = [
			"function approve(address spender, uint256 amount) public returns (bool)"
		];
		const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);

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
		logger.info(`Approval Transaction Confirmed! https://basescan.org/tx/${receipt.hash}`);
	} catch (error) {
		logger.error('An error occurred during token approval:', error);
		throw new Error('Token approval failed');
	}
}

/**
 *
 */
async function getPoolInfo(factoryContract, tokenInAddress, tokenOutAddress) {
	const poolAddress = await factoryContract.getPool(tokenInAddress, tokenOutAddress, 3000);
	if (!poolAddress) {
		throw new Error('Failed to get pool address');
	}

	const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
	const [fee] = await Promise.all([
		poolContract.fee(),
	]);
	return { poolContract, fee };
}

async function getTokenInfo(tokenAddress, provider) {
	try {
		const erc20Abi = [
			"function name() view returns (string)",
			"function symbol() view returns (string)",
			"function decimals() view returns (uint8)"
		];

		const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
		const [address, name, symbol, decimals] = await Promise.all([
			tokenAddress,
			tokenContract.name(),
			tokenContract.symbol(),
			tokenContract.decimals()
		]);

		return { address, name, symbol, decimals };
	} catch (error) {
		logger.error(`Error fetching token info for: ${tokenAddress}`, error);
		throw new Error(`Failed to fetch token info for ${tokenAddress}`);
	}
}



/**
 *
 */
async function getTokenInfo(tokenAddress, provider) {
	try {
		const erc20Abi = [
			"function name() view returns (string)",
			"function symbol() view returns (string)",
			"function decimals() view returns (uint8)"
		];

		const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
		const [address, name, symbol, decimals] = await Promise.all([
			tokenAddress,
			tokenContract.name(),
			tokenContract.symbol(),
			tokenContract.decimals()
		]);

		return { address, name, symbol, decimals };
	} catch (error) {
		logger.error(`Error fetching token info for: ${tokenAddress}`, error);
		throw new Error(`Failed to fetch token info for ${tokenAddress}`);
	}
}



/**
 *
 */
async function quoteAndLogSwap(quoterContract, fee, signer, amountIn, tokenInInfo, tokenOutInfo) {
	const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall({
		tokenIn: tokenInInfo.address,
		tokenOut: tokenOutInfo.address,
		fee: fee,
		recipient: signer.address,
		deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
		amountIn: amountIn,
		sqrtPriceLimitX96: 0,
	});
	logger.info(`-------------------------------`);
	logger.info(
		`Token Swap will result in: ${ethers.formatUnits(quotedAmountOut[0].toString(), tokenOutInfo.decimals)} ${tokenOutInfo.symbol} for ${ethers.formatUnits(amountIn, tokenInInfo.decimals)} ${tokenInInfo.symbol}`,
	);
	const amountOut = ethers.formatUnits(quotedAmountOut[0], tokenOutInfo.decimals);
	return amountOut;
}

/**
 *
 */
async function prepareSwapParams(poolContract, signer, amountIn, amountOut, tokenInInfo, tokenOutInfo) {
	return {
		tokenIn: tokenInInfo.address,
		tokenOut: tokenOutInfo.address,
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
	logger.info(`Receipt: https://basescan.org/tx/${receipt.hash}`);
	logger.info(`-------------------------------`);
}

/**
 *
 */
async function wrapETH(amount) {
	try {
		const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_IN_ABI, signer);

		const tx = await wethContract.deposit({
			value: ethers.parseUnits(amount.toString(), 18), // Convert ETH to Wei
		});

		logger.info(`-------------------------------`);
		logger.info(`Wrapping ${amount} ETH into WETH...`);
		logger.info(`Transaction Sent: ${tx.hash}`);
		logger.info(`-------------------------------`);

		await tx.wait();
		logger.info(`Wrapped Successfully! https://basescan.org/tx/${tx.hash}`);
	} catch (error) {
		logger.error('Error wrapping ETH:', error);
	}
}

/**
 *
 */
export async function swapToken(swapAmount, tokenInAddress, tokenOutAddress) {
	const inputAmount = swapAmount;
	
	let tokenInInfo = await getTokenInfo(tokenInAddress, provider);
	let tokenOutInfo = await getTokenInfo(tokenOutAddress, provider);
	console.log(tokenInInfo.decimals);
	const amountIn = ethers.parseUnits(inputAmount.toString(), tokenInInfo.decimals);

	try {
		await approveToken(tokenInInfo.address, amountIn, signer);
		const { poolContract, fee } = await getPoolInfo(factoryContract, tokenInInfo.address, tokenOutInfo.address);
		logger.info(`-------------------------------`);
		logger.info(`Fetching Quote for: ${tokenInInfo.symbol} to ${tokenOutInfo.symbol}`);
		logger.info(`-------------------------------`);
		logger.info(`Swap Amount: ${ethers.formatEther(amountIn)}`);

		const quotedAmountOut = await quoteAndLogSwap(quoterContract, fee, signer, amountIn, tokenInInfo, tokenOutInfo);
		
		if (tokenInInfo.address === WETH_ADDRESS) {
			await wrapETH(swapAmount);
		}

		// const wethContract = new ethers.Contract(WETH.address, WETH_IN_ABI, provider);
		// const balance = await wethContract.balanceOf(signer.address);
		// console.log(`WETH Balance: ${ethers.formatEther(balance)}`);

		const params = await prepareSwapParams(
			poolContract,
			signer,
			amountIn,
			quotedAmountOut[0].toString(),
			tokenInInfo,
			tokenOutInfo,
		);
		const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, signer);
		await executeSwap(swapRouter, params, signer);
		return 'Swap successfull';
	} catch (error) {
		logger.error('An error occurred:', error.message);
		return 'Fail in Swapping tokens';
	}
}

// swapToken(
// 	0.00001, // Change amount as needed
// 	"0x4200000000000000000000000000000000000006", // WETH Address
// 	"0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC address
// ) 

// getAddressFromSymbol("WETH");
