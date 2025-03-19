import express from 'express';
import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = 3000;

// Initialize Twitter API client
const twitterClient = new TwitterApi({
	appKey: process.env.TWITTER_APP_KEY,
	appSecret: process.env.TWITTER_APP_SECRET,
});

const callbackUrl = 'http://localhost:3000/auth/twitter/callback';
let _oauth_token_secret = '';

// Step 1: Redirect user to Twitter login
app.get('/auth/twitter', async (req, res) => {
	try {
		const { url, oauth_token, oauth_token_secret } = await twitterClient.generateAuthLink(
			callbackUrl,
			{ linkMode: 'authorize' },
		);
		// Store oauth_token_secret in session (or database)
		req.session = { oauth_token_secret };
		_oauth_token_secret = oauth_token_secret;

		res.redirect(url);
	} catch (error) {
		console.error('Error starting Twitter OAuth:', error);
		res.status(500).send('Authentication failed');
	}
});

// Step 2: Handle Twitter callback & exchange tokens
app.get('/auth/twitter/callback', async (req, res) => {
	const { oauth_token, oauth_verifier } = req.query;

	if (!oauth_token || !oauth_verifier || !_oauth_token_secret) {
		return res.status(400).send('Invalid OAuth request');
	}

	try {
		const client = new TwitterApi({
			appKey: process.env.TWITTER_APP_KEY,
			appSecret: process.env.TWITTER_APP_SECRET,
			accessToken: oauth_token,
			accessSecret: _oauth_token_secret,
		});
		console.log(client, oauth_token, _oauth_token_secret);
		const { accessToken, accessSecret, screenName, userId } = await client.login(oauth_verifier);

		// Display credentials (store them in a database instead for security)
		res.send(`
      <h1>Twitter Auth Successful! 🎉</h1>
      <p><b>Access Token:</b> ${accessToken}</p>
      <p><b>Access Secret:</b> ${accessSecret}</p>
      <p><b>User ID:</b> ${userId}</p>
      <p><b>Username:</b> @${screenName}</p>
    `);
	} catch (error) {
		console.error('Error getting access token:', error);
		res.status(500).send('Authentication failed');
	}
});

// Start Express server
app.listen(port, () => {
	console.log(`🚀 Server running at http://localhost:${port}`);
});
