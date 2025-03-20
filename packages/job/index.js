import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

dotenv.config(); // Load API keys from .env

// Initialize Twitter client
const client = new TwitterApi({
	appKey: process.env.TWITTER_APP_KEY,
	appSecret: process.env.TWITTER_APP_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const userId = process.env.TWITTER_USER_ID; // Your Twitter User ID

/**
 * Find recent mentions of the specified handle
 * @returns {Promise<Array>} Array of mention objects
 */
async function findMentions() {
	try {
		const query = '@0xaldric';
		const mentions = await client.v2.search(query, {
			max_results: 10,
			expansions: ['author_id', 'in_reply_to_user_id'],
		});

		console.log('Found mentions:', mentions.data ? mentions.data.length : 0);
		return mentions.data || [];
	} catch (error) {
		console.error('Error finding mentions:', error);
		return [];
	}
}

/**
 * Reply to a specific mention
 * @param {Object} mention - The mention to reply to
 * @returns {Promise<boolean>} Success status
 */
async function replyToMention(mention) {
	try {
		const tweetId = mention.id;
		const username = mention.author_id; // User ID of the mention

		// Check if we already replied to this mention
		const repliedBefore = await hasReplied(tweetId);
		if (repliedBefore) {
			console.log(`Already replied to tweet ${tweetId}`);
			return false;
		}

		// Reply message
		const replyText = `Hello @${username}, thanks for mentioning me! 🚀`;

		// Send the reply
		await client.v2.tweet({
			text: replyText,
			reply: { in_reply_to_tweet_id: tweetId },
		});

		console.log(`Replied to @${username}: ${replyText}`);
		return true;
	} catch (error) {
		console.error('Error replying to mention:', error);
		return false;
	}
}

/**
 *
 */
async function onlyReply() {
	const replyText = `This is the token you wanna deploy:
name: Test Token
symbol: Test Symbol
initialSupply: 1000000000000000000000000
owner: 0x0C5970e1767c0d7240d3B6D70431F751120Ca40E
	`;

	await client.v2.tweet({
		text: replyText,
		reply: { in_reply_to_tweet_id: '1902052751942807631' },
	});
}

/**
 * Main function to check mentions and process replies
 */
async function checkAndReply() {
	try {
		const mentions = await findMentions();

		for (const mention of mentions) {
			await replyToMention(mention);
		}
	} catch (error) {
		console.error('Error in check and reply process:', error);
	}
}

// Function to check if we already replied (to avoid duplicate replies)
/**
 * Checks if we've already replied to a specific tweet
 * @param {string} tweetId - ID of the tweet to check
 * @returns {Promise<boolean>} True if already replied
 */
async function hasReplied(tweetId) {
	const replies = await client.v2.userTimeline(userId, { max_results: 10 });
	return replies.data.some((tweet) => tweet.referenced_tweets?.some((ref) => ref.id === tweetId));
}

// Run the function every 60 seconds
// checkAndReply();

onlyReply();
