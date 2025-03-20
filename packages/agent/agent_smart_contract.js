import readline from 'readline';

import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import term from 'terminal-kit';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { deployTokenAndPool } from '../agent-function/deploy-new-token.js';
import { swapToken, getAddressFromSymbol } from '../agent-function/swap.js';
import { logger } from '../logger/index.js';

import { prompt } from './constant_agent.js';
import { getHistoryChat, addHitoryChat, changeCharacter, getCharacter } from './agent-memory.js';
import { config } from './config.js';

let character = 'Friendly';

const deployTokenAndPoolSchema = z.object({
	name: z.string(),
	symbol: z.string(),
});
const swapTokenSchema = z.object({
	amount: z.number().describe('The amount needs to swap'),
	tokenInAddress: z.string().describe('The address of input token need to swap from'),
	tokenOutAddress: z.string().describe('The address of destination token that needs to swap to'),
});

const addressSchema = z.object({
	symbol: z
		.string()
		.describe(
			'This param is a symbol of token and agent will pass through to get the address of token',
		),
});
const swapTokenTool = tool(
	async (input) => {
		try {
			logger.info(`Start swapping from ${input.amount}$`);
			const res = await swapToken(input.amount, input.tokenInAddress, input.tokenOutAddress);
			logger.info(res);
			return res;
		} catch (error) {
			return `Fail to swap with error ${error}`;
		}
	},
	{
		name: 'Swaper',
		description: `This function performs the token swap process, 
					converting a specified amount this type of token to another type`,
		schema: swapTokenSchema,
	},
);

const deployTokenTool = tool(
	async (input) => {
		try {
			logger.info(`Start deploying token named ${input.name}, symbol ${input.symbol}`);
			const response = await deployTokenAndPool(input.name, input.symbol);
			return `Successfully deploy a token with name:${input.name}, and symbol ${input.symbol} with essential information: 
				Token Addres: ${response[0]}
				Position id: ${response[1]}
				Supply: ${response[6]}`;
		} catch (error) {
			return `Fail in deploying this token with this error ${error}`;
		}
	},
	{
		name: 'Deployer',
		description: ` This function is responsible for deploying a new 
				  ERC-20 token along with a liquidity pool on the blockchain 
				  by interacting with a smart contract and It also add this new token to a pool`,
		schema: deployTokenAndPoolSchema,
	},
);

const addressTool = tool(
	async (input) => {
		try {
			const res = await getAddressFromSymbol(input.symbol);
			logger.info(res);
			return res;
		} catch (error) {
			console.log(input.symbol, 'cannot find', error);
			return 'Cannot find address of symbol.';
		}
	},
	{
		name: 'AddressFinder',
		description: ` This function is used to find the address of symbol.
						Recieving the input is symbol of token, try to find its address. `,
		schema: addressSchema,
	},
);

const tk = term.terminal;

function getUserQuestion(message) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(message, (userQuestion) => {
			rl.close();
			resolve(userQuestion);
		});
	});
}

function processChunks(chunk) {
	// Check if the chunk contains an agent's message
	if ('agent' in chunk) {
		let res = '';
		for (const message of chunk.agent.messages) {
			// Check if the message contains tool calls
			if (
				'tool_calls' in message.additional_kwargs &&
				Array.isArray(message.additional_kwargs.tool_calls)
			) {
				const toolCalls = message.additional_kwargs.tool_calls;
				toolCalls.forEach((toolCall) => {
					const toolName = toolCall.function.name;

					const toolArguments = JSON.parse(toolCall.function.arguments.replace(/'/g, '"'));
					const toolInput = toolArguments.input;

					tk
						.colorRgbHex('#00afff')(`\nThe agent is calling the tool `)
						.bgColorRgbHex('#00afff')
						.color('black')(`${toolName}`)
						.bgColor('black')
						.colorRgbHex('#00afff')(` with the query `)
						.bgColorRgbHex('#00afff')
						.color('black')(`${toolInput}`)
						.bgColor('black')
						.colorRgbHex('#00afff')(`. Please wait for the agent's answer...\n`);
				});
			} else {
				const agentAnswer = message.content;
				res += agentAnswer;
				tk.bgColor('white')
					.color('black')(`\nAgent:\n${agentAnswer}\n`)
					.color('white')
					.bgColor('black');
			}
		}
		return res;
	}
}

async function AgentWakeUp(id_thread = '1', request = '') {
	const history = await getHistoryChat(id_thread);
	const llm = new ChatOpenAI({
		apiKey: config.apiKey,
		modelName: 'gpt-4o-mini',
		maxTokens: 1024,
	});

	// Initialize chat memory (Note: This is in-memory only, not persistent)
	const memory = new MemorySaver();

	// Create a LangGraph agent
	const langgraphAgent = createReactAgent({
		llm: llm,
		prompt: prompt,
		tools: [addressTool, swapTokenTool, deployTokenTool],
		checkpointSaver: memory,
	});

	while (true) {
		// Get the user's question and display it in the terminal
		const userQuestion = await getUserQuestion('\nUser:\n');

		// Check if the user wants to quit the chat
		if (userQuestion.toLowerCase() === 'quit') {
			tk.bgColor('white').color('black')('\nAgent:\nHave a nice day!\n');
			tk.bgColor('black').color('white')('\n');
			break;
		}
		const cache = { user: userQuestion, system: '' };
		// Use the stream method of the LangGraph agent to get the agent's answer
		const agentAnswer = await langgraphAgent.stream(
			{ messages: [...history, new HumanMessage({ content: userQuestion })] },
			{ configurable: { thread_id: 'cache' } },
		);

		for await (const chunk of agentAnswer) {
			const response = processChunks(chunk);
			if (response && response.length > 0) {
				cache.system += response;
			}
		}
		await addHitoryChat(id_thread, cache);
	}
}

export async function setCharacter(personality = 'friendly') {
	character = personality;
	// await changeCharacter(chat_id,)
}

export async function invokeAgent(id_thread = '1', request = '') {
	const history = await getHistoryChat(id_thread);
	console.log(history);

	const llm = new ChatOpenAI({
		apiKey: config.apiKey,
		modelName: 'gpt-4o',
		temperature: 0.5,
	});

	// Initialize chat memory (Note: This is in-memory only, not persistent)
	const memory = new MemorySaver();

	// Create a LangGraph agent
	const langgraphAgent = createReactAgent({
		llm: llm,
		prompt: prompt,
		tools: [addressTool, swapTokenTool, deployTokenTool],
		checkpointSaver: memory,
	});
	if (history && history.length >= 80) {
		return 'This conservation is too long, please make another.';
	}
	request = `if user just communicate with you in normal way without any require, just response as a normal people. else:
				Pretend you are a ${character}.You have so much experience in blockchain as an expert.
				You must response for user in a ${character} way this promt from user: ${request}. With each request of user, if you lack of any information, require user provides.

				After finish, describe what did you do`;
	const cache = { user: request, system: '' };
	const agentAnswer = await langgraphAgent.stream(
		{ messages: [...history, new HumanMessage({ content: request })] },
		{ configurable: { thread_id: 'cache' } },
	);
	for await (const chunk of agentAnswer) {
		const response = processChunks(chunk);
		if (response && response.length > 0) {
			cache.system += response;
		}
	}
	await addHitoryChat(id_thread, cache);

	return cache.system;
}

// AgentWakeUp("test2");
// invokeAgent("2","deploy a token with name ITACHI and symbol ITC")
