This is the code that I use to filter comments on my [blog](https://www.liquidbrain.net/) for obvious spam. The code deletes spam while forwards non-spam to a selected email for human review. It costs me less than $.50 per month.

As featured in [this blog post](https://liquidbrain.net/blog/blog-comment-moderation/).

# How to use this script

If you are using Mataroa and want to use this to filter your comments for obvious spam, there are a couple of steps you'll have to follow:  
1. (Probably) use a Gmail account for your Mataroa email.
2. Create a new [Google Apps Script](https://script.google.com/) project using that Google account.
3. Copy the code from contentModerationScript.js into the editor,
4. Create a Gemini API key. Following the instructions [here](https://ai.google.dev/gemini-api/docs/api-key) to make one.
5. Go to the dashboard of your mataroa blog and press the link to the API to get your API key. (Or go to this [link](https://mataroa.blog/api/docs/) on a browser that you are signed in on.)
6. Add the script properties geminiAPIKey, mataroaAPIKey, and emailToSendTo with their corresponding values in the settings tab.
7. Try running the `firstPassOnComment` function, and grant any necessary permissions to the script.
8. After you get step 7 working, go the to the Triggers tab, click Add Trigger, and run `firstPassOnComment` hourly, or at whatever frequency you would find convient.

Leave an issue request if this process doesn't work. Or email kai at domain name of my blog.