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
		CLANKER_FACTORY_V2: process.env.CLANKER_FACTORY_V2,
	};
}

export const config = loadConfig();
