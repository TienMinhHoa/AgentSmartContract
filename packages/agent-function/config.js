import dotenv from 'dotenv';

dotenv.config();

/**
 *
 */
function loadConfig() {
	return {
		WETH_ADDRESS: process.env.WETH_ADDRESS,
		RPC_URL: process.env.RPC_URL,
		PRIVATE_KEY: process.env.PRIVATE_KEY,
		SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
		SEPOLIA_PRIVATE_KEY: process.env.SEPOLIA_PRIVATE_KEY,
		UNISWAP_FACTORY: process.env.UNISWAP_FACTORY,
		POSITION_MANAGER: process.env.POSITION_MANAGER,
		LOCKER: process.env.LOCKER,
		TOKEN_FACTORY: process.env.TOKEN_FACTORY,
		CLANKER_FACTORY_V2: process.env.CLANKER_FACTORY_V2,
	};
}

export const config = loadConfig();
