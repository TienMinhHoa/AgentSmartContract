import { ChatOpenAI } from '@langchain/openai';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import pg from 'pg';

await checkpointer.setup();

const graph = createReactAgent({
	tools: [],
	llm: new ChatOpenAI({
		model: 'gpt-4o-mini',
	}),
	checkpointSaver: checkpointer,
});
const config = { configurable: { thread_id: '1' } };
