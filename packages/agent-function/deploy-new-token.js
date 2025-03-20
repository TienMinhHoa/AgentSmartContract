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
export async function deployTokenAndPool(name, symbol) {
	try {
		const initialSupply = ethers.parseUnits("1000000000".toString(), 18);
		const owner = signer.address;
		const fee = 10000;
		const tick = -230400;
		const saltData = await generateSalt(
			signer.address,
			0,
			name,
			symbol,
			"",
			"",
			initialSupply,
			config.WETH_ADDRESS,
		);

		logger.info('Deploying token and pool...');
		const poolConfig = [
			tick,
			config.WETH_ADDRESS,
			10000,
		];

		const saltRaw = saltData.salt.startsWith("0x") ? saltData.salt : `0x${saltData.salt}`;
		const salt = ethers.hexlify(saltRaw);
		logger.info(`Salt: ${salt}`);
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
	} catch (error) {
		console.error("❌ Deployment Error:", error);
		if (error.data) {
			const decodedError = clanker.interface.parseError(error.data);
			console.error("Decoded Error:", decodedError);
		}
	}
}

// deployTokenAndPool("ITACHI", "ITC");
