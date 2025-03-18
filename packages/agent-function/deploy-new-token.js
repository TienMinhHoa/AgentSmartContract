import { ethers } from 'ethers';

import { logger } from '../logger/index.js';

import CLANKER_ABI from './abis/Clanker.json' assert { type: 'json' };
import { config } from './config.js';
import { generateSalt } from './generate-salt.js';

const provider = new ethers.JsonRpcProvider(config.RPC_URL);
const signer = new ethers.Wallet(config.PRIVATE_KEY, provider);
const clanker = new ethers.Contract(
	config.CLANKER_FACTORY_V2,
	CLANKER_ABI.abi,
	signer,
);

/**
 *
 */
export async function deployTokenAndPool(name, symbol, supply) {
	try {
		const initialSupply = ethers.parseUnits(supply.toString(), 18);
		const owner = signer.address;
		const fee = 3000;
		const tick = 60;
		const saltData = await generateSalt(
			signer.address,
			name,
			symbol,
			supply,
			config.WETH_ADDRESS,
		);

		logger.info('Deploying token and pool...');
		const poolConfig = [
			tick,
			config.WETH_ADDRESS,
			10000,
		];

		// const allowed_pair_tx = await clanker.toggleAllowedPairedToken(
		// 	config.WETH_ADDRESS,
		// 	true,
		// );
		// await allowed_pair_tx.wait();
		// logger.info('transaction hash:', allowed_pair_tx.hash);
		// logger.info('Allowed pair token toggled');
		// logger.info(`---------------------------------`);

		const saltRaw = saltData.salt.startsWith("0x") ? saltData.salt : `0x${saltData.salt}`;
		const salt = ethers.hexlify(saltRaw);

		// i want to console all of params
		logger.info(`name: ${name}`);
		logger.info(`symbol: ${symbol}`);
		logger.info(`initialSupply: ${initialSupply}`);
		logger.info(`fee: ${fee}`);
		logger.info(`salt: ${salt}`);
		logger.info(`owner: ${owner}`);
		logger.info(poolConfig);
		const tx = await clanker.deployToken(
			name,
			symbol,
			initialSupply,
			fee,
			salt,
			owner,
			0,
			"",
			"",
			poolConfig,
		);
		logger.info(`Transaction hash: ${tx.hash}`);

		// Wait for the transaction to be mined
		const receipt = await tx.wait();
		logger.info(`✅ Token and Pool Deployed! TX Hash: ${receipt.hash}`);

		// Parse the event logs to get the token and pool addresses
		// const event = receipt.logs.find((log) => log.address === config.SIMPLE_DEPLOYER_ADDRESS);
		// if (event) {
		// 	const parsedEvent = clankerToken.interface.parseLog(event);
		// 	logger.info(`🎉 Token Address: ${parsedEvent.args.token}`);
		// 	logger.info(`🎉 Pool Address: ${parsedEvent.args.pool}`);
		// }
		// return 'Successfull';
	} catch (error) {
		console.error("❌ Deployment Error:", error);
		if (error.data) {
			const decodedError = clanker.interface.parseError(error.data);
			console.error("Decoded Error:", decodedError);
		}
	}
}

// deployTokenAndPool("Test Token", "Test Symbol", "1000000");
