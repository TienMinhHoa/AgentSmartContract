import readline from 'readline';

import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import term from 'terminal-kit';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { deployTokenAndPool } from '../agent-function/deploy-new-token.js';
import { swapToken } from '../agent-function/swap.js';
import { logger } from '../logger/index.js';

import { prompt } from './constant_agent.js';
import {getHistoryChat, addHitoryChat} from './agent-memory.js';
import { config } from './config.js';


const deployTokenAndPoolSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	supply: z.string(),
});
const swapTokenSchema = z.object({
	amount: z.number(),
	tokenInAddress: z.string(),
	tokenOutAddress: z.string()
});
const swapTokenTool = tool(
	async (input) => {
		logger.info(`Start swapping from ${input.amount}$ ETH to USDC`);
		const res = await swapToken(input.amount);
		logger.info(res);
		return res;
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
		logger.info(
			`Start deploying token named ${input.name}, symbol ${input.symbol}, supply ${input.supply}`,
		);
		const res = await deployTokenAndPool(input.name, input.symbol, input.supply);
		logger.info(res);
		return res;
	},
	{
		name: 'Deployer',
		description: ` This function is responsible for deploying a new 
                  ERC-20 token along with a liquidity pool on the blockchain 
                  by interacting with a smart contract and It also add this new token to a pool`,
		schema: deployTokenAndPoolSchema,
	},
);

// Initialize Terminal Kit for better output formatting and visualization
const tk = term.terminal;

// Initialize OpenAI LLM
const llm = new ChatOpenAI({
	apiKey: config.apiKey,
	modelName: 'gpt-4o-mini',
});

// Initialize chat memory (Note: This is in-memory only, not persistent)
const memory = new MemorySaver();

// Create a LangGraph agent
const langgraphAgent = createReactAgent({
	llm: llm,
	prompt: prompt,
	tools: [swapTokenTool, deployTokenTool],
	checkpointSaver: memory,
});

// Define an asynchronous function to get the user question
/**
 *
 */
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
		let res = "";
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
				res+=agentAnswer
				tk.bgColor('white')
					.color('black')(`\nAgent:\n${agentAnswer}\n`)
					.color('white')
					.bgColor('black');
			}
		}
		return res
	}
}

async function AgentWakeUp(id_thread="1") {
	const history = await getHistoryChat(id_thread)

	while (true) {
		// Get the user's question and display it in the terminal
		const userQuestion = await getUserQuestion('\nUser:\n');

		// Check if the user wants to quit the chat
		if (userQuestion.toLowerCase() === 'quit') {
			tk.bgColor('white').color('black')('\nAgent:\nHave a nice day!\n');
			tk.bgColor('black').color('white')('\n');
			break;
		}
		const cache = {user:userQuestion,system:""}
		// Use the stream method of the LangGraph agent to get the agent's answer
		const agentAnswer = await langgraphAgent.stream(
			{ messages: [...history,new HumanMessage({ content: userQuestion })] },
			{ configurable: { thread_id: 'cache' } },
		);

		// Process the chunks from the agent
		for await (const chunk of agentAnswer) {
			const response = processChunks(chunk);
			if (response.length > 0){
				cache.system+=response
			}
		}
		await addHitoryChat(id_thread, cache)

	}
}

AgentWakeUp("test2");
