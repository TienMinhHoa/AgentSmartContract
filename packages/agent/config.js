import dotenv from "dotenv";

dotenv.config();

/**
 *
 */
function loadConfig() {
	return {
		apiKey: process.env.OPENAI_API_KEY || "",
	};
}

export const config = loadConfig();
