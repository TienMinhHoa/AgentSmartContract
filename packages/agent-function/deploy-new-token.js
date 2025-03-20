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
		await tx.wait();

		const eventAbi = [
			"event TokenCreated(address tokenAddress, uint256 positionId, address deployer, uint256 fid, string name, string symbol, uint256 supply, address lockerAddress, string castHash)"
		];
		const contract = new ethers.Contract(config.CLANKER_FACTORY_V2, eventAbi, provider);
		const receipt = await provider.getTransactionReceipt(tx.hash);
		for (const log of receipt.logs) {
			try {
				const parsedLog = contract.interface.parseLog(log);
				if (parsedLog.name === "TokenCreated") {
					logger.info("🔥 TokenCreated Event Found!");
					return [
						parsedLog.args.tokenAddress, 
						parsedLog.args.positionId, 
						parsedLog.args.lockerAddress,
						parsedLog.args.fid,
						parsedLog.args.name,
						parsedLog.args.symbol,
						parsedLog.args.supply.toString(),
						parsedLog.args.castHash
					];
				}
			} catch (err) {
				// console.error("Error parsing log:", err);
			}
		}

		
		// Wait for the transaction to be mined
		// const receipt = await tx.wait();
		// logger.info(`✅ Token and Pool Deployed! TX Hash: ${receipt.hash}`);
	} catch (error) {
		console.error("❌ Deployment Error:", error);
		if (error.data) {
			const decodedError = clanker.interface.parseError(error.data);
			console.error("Decoded Error:", decodedError);
		}
	}
}

// deployTokenAndPool("ITACHI", "ITC");
// const [tokenAddress, positionId, lockerAddress, fid, name, symbol, supply, castHash] = await deployTokenAndPool("ITACHI", "ITC");
// logger.info(`Token Address: ${tokenAddress}`);
// logger.info(`Position ID: ${positionId}`);
// logger.info(`Locker Address: ${lockerAddress}`);

