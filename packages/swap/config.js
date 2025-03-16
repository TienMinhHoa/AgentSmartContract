import dotenv from "dotenv";

dotenv.config();

/**
 *
 */
function loadConfig() {
	return {
		RPC_URL: process.env.RPC_URL,
		PRIVATE_KEY: process.env.PRIVATE_KEY,
		SIMPLE_DEPLOYER_ADDRESS: process.env.SIMPLE_DEPLOYER_ADDRESS,
	};
}

export const config = loadConfig();
