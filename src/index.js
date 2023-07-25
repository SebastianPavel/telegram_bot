const TOKEN = '';
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(TOKEN, { polling: true });

// Store website watchlist
const watchlist = {};

// Function to check website status

async function isWordPressDown(website) {
    try {
      const response = await axios.get(website);
      const htmlContent = response.data;
  
      // Check for common WordPress error messages and patterns
      if (htmlContent.includes('Error establishing a database connection') ||
          htmlContent.includes('Database Error') ||
          htmlContent.includes('Error establishing a database connection') ||
          htmlContent.includes('Error 404') ||
          htmlContent.includes('HTTP 404') ||
          htmlContent.includes('This site can’t be reached') ||
          htmlContent.includes('Not Found')) {
        return true; // Website is down
      } else {
        return false; // Website is up
      }
    } catch (error) {
      return true; // Error occurred, website is likely down
    }
  }
  
  
  async function checkWebsiteStatus(website, chatId) {
    try {
      // Check if the website is a WordPress site
      const isWordPress = await isWordPressDown(website);
  
      if (isWordPress) {
        bot.sendMessage(chatId, `Website ${website} is down!`);
      } else {
        const response = await axios.get(website);
  
        if (response.status === 200) {
          // Website is up
          if (watchlist[chatId][website].status === 'down') {
            bot.sendMessage(chatId, `Website ${website} is back up!`);
          }
          watchlist[chatId][website].status = 'up';
        } else {
          // Website is down
          if (watchlist[chatId][website].status === 'up') {
            bot.sendMessage(chatId, `Website ${website} is down!`);
          }
          watchlist[chatId][website].status = 'down';
        }
      }
    } catch (error) {
      // Error occurred while checking the website
      bot.sendMessage(chatId, `Error occurred while checking website ${website}`);
    }
  }

// Handle /watch command
bot.onText(/\/watch (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const website = match[1];

  // Add website to the watchlist
  if (!watchlist[chatId]) {
    watchlist[chatId] = {};
  }

  if (!watchlist[chatId][website]) {
    watchlist[chatId][website] = {
      status: 'up', // Initial status assumed to be 'up'
      intervalId: setInterval(() => checkWebsiteStatus(website, chatId), 60000) // Check website every 60 seconds
    };
    bot.sendMessage(chatId, `Watching website ${website}`);
  } else {
    bot.sendMessage(chatId, `Website ${website} is already being watched.`);
  }
});

// Handle /unwatch command
bot.onText(/\/unwatch (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const website = match[1];

  if (watchlist[chatId] && watchlist[chatId][website]) {
    clearInterval(watchlist[chatId][website].intervalId);
    delete watchlist[chatId][website];
    bot.sendMessage(chatId, `Stopped watching website ${website}`);
  } else {
    bot.sendMessage(chatId, `Website ${website} is not being watched.`);
  }
});


bot.onText(/\/listwatch/, (msg) => {
    const chatId = msg.chat.id;
  
    if (!watchlist[chatId] || Object.keys(watchlist[chatId]).length === 0) {
      bot.sendMessage(chatId, 'No websites are currently being watched.');
    } else {
      let response = 'List of watched websites:\n';
  
      for (const website in watchlist[chatId]) {
        response += `- ${website}\n`;
      }
  
      bot.sendMessage(chatId, response);
    }
  });

// Listen for any other message
// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(chatId, 'Unknown command. Use /watch <website> to start watching a website.');
// });