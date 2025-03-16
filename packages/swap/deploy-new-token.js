import { ethers } from 'ethers';

import { logger } from '../logger/index.js';

import SIMPLE_DEPLOYER_ABI from './abis/SimpleDeployerABI.json';
import { config } from './config.js';

const provider = new ethers.JsonRpcProvider(config.RPC_URL);
const signer = new ethers.Wallet(config.PRIVATE_KEY, provider);
const simpleDeployer = new ethers.Contract(
	config.SIMPLE_DEPLOYER_ADDRESS,
	SIMPLE_DEPLOYER_ABI,
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

		logger.info('Deploying token and pool...');

		const tx = await simpleDeployer.deployTokenAndPool(
			name,
			symbol,
			initialSupply,
			owner,
			fee,
			tick,
		);
		logger.info(`Transaction hash: ${tx.hash}`);

		// Wait for the transaction to be mined
		const receipt = await tx.wait();
		logger.info(`✅ Token and Pool Deployed! TX Hash: ${receipt.hash}`);

		// Parse the event logs to get the token and pool addresses
		const event = receipt.logs.find((log) => log.address === config.SIMPLE_DEPLOYER_ADDRESS);
		if (event) {
			const parsedEvent = simpleDeployer.interface.parseLog(event);
			logger.info(`🎉 Token Address: ${parsedEvent.args.token}`);
			logger.info(`🎉 Pool Address: ${parsedEvent.args.pool}`);
		}
		return 'Successfull';
	} catch (error) {
		logger.error('❌ Error deploying token and pool:', error);
		return error;
	}
}

// deployTokenAndPool("Test Token", "Test Symbol", "1000000");
