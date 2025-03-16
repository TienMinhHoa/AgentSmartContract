import dotenv from 'dotenv';

dotenv.config();

/**
 *
 */
export function loadConfig() {
	return {
		apiKey: process.env.OPENAI_API_KEY || '',
	};
}
