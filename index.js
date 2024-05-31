require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const express = require('express');

const milestoneStep = parseInt(process.env.MILESTONE_STEP) || 100;
let lastMemberCounts = {};
let lastMessageIds = {};

// Function to fetch Roblox group member count
async function getGroupMemberCount(groupId) {
  try {
    const response = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}`);
    return response.data.memberCount;
  } catch (error) {
    console.error(`Error fetching data for group ${groupId}:`, error);
    return null;
  }
}

// Function to send an embed message to a Discord webhook
async function sendWebhookEmbed(webhookUrl, memberCount, milestoneMessage) {
  const embed = {
    title: "Roblox Group Member Count",
    description: milestoneMessage,
    color: 5814783,
    fields: [
      {
        name: "Current Members",
        value: memberCount.toString(),
        inline: true
      }
    ],
    timestamp: new Date()
  };

  try {
    const response = await axios.post(webhookUrl, {
      embeds: [embed]
    });
    console.log(`Sent embed message to webhook ${webhookUrl} with ${memberCount} members`);
    return response.data.id; // Return the message ID
  } catch (error) {
    console.error(`Error sending embed message to webhook ${webhookUrl}:`, error);
    return null;
  }
}

// Function to delete a message using a webhook
async function deleteWebhookMessage(webhookUrl, messageId) {
  try {
    const webhookParts = webhookUrl.split('/');
    const webhookId = webhookParts[5];
    const webhookToken = webhookParts[6];

    const url = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`;
    await axios.delete(url);
    console.log(`Deleted message with ID ${messageId} from webhook ${webhookUrl}`);
  } catch (error) {
    console.error(`Error deleting message with ID ${messageId} from webhook ${webhookUrl}:`, error);
  }
}

// Function to determine milestone messages
function getMilestoneMessage(memberCount) {
  const milestoneReached = Math.floor(memberCount / milestoneStep) * milestoneStep;
  const nextMilestone = milestoneReached + milestoneStep;
  const membersUntilNextMilestone = nextMilestone - memberCount;

  let milestoneMessage = `We're now on ${memberCount} members!`;
  if (membersUntilNextMilestone > 0) {
    milestoneMessage += ` Only ${membersUntilNextMilestone} until the next milestone of ${nextMilestone} members!`;
  }

  return milestoneMessage;
}

// Scheduled task to update member counts every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const groupIds = [process.env.GROUP1_ID, process.env.GROUP2_ID, process.env.GROUP3_ID, process.env.GROUP4_ID, process.env.GROUP5_ID];
  const webhookUrls = [process.env.WEBHOOK1_URL, process.env.WEBHOOK2_URL, process.env.WEBHOOK3_URL, process.env.WEBHOOK4_URL, process.env.WEBHOOK5_URL];

  for (let i = 0; i < groupIds.length; i++) {
    const memberCount = await getGroupMemberCount(groupIds[i]);
    if (memberCount !== null && memberCount !== lastMemberCounts[groupIds[i]]) {
      const milestoneMessage = getMilestoneMessage(memberCount);
      if (lastMessageIds[groupIds[i]]) {
        await deleteWebhookMessage(webhookUrls[i], lastMessageIds[groupIds[i]]);
      }
      const messageId = await sendWebhookEmbed(webhookUrls[i], memberCount, milestoneMessage);
      if (messageId) {
        lastMessageIds[groupIds[i]] = messageId;
      }
      lastMemberCounts[groupIds[i]] = memberCount;
    }
  }
});

// Initial run to send messages right away
(async () => {
  const groupIds = [process.env.GROUP1_ID, process.env.GROUP2_ID, process.env.GROUP3_ID, process.env.GROUP4_ID, process.env.GROUP5_ID];
  const webhookUrls = [process.env.WEBHOOK1_URL, process.env.WEBHOOK2_URL, process.env.WEBHOOK3_URL, process.env.WEBHOOK4_URL, process.env.WEBHOOK5_URL];

  for (let i = 0; i < groupIds.length; i++) {
    const memberCount = await getGroupMemberCount(groupIds[i]);
    if (memberCount !== null) {
      const milestoneMessage = getMilestoneMessage(memberCount);
      const messageId = await sendWebhookEmbed(webhookUrls[i], memberCount, milestoneMessage);
      if (messageId) {
        lastMessageIds[groupIds[i]] = messageId;
      }
      lastMemberCounts[groupIds[i]] = memberCount;
    }
  }
})();

// Start the Express server
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Online.');
});

app.listen(port, () => {
  console.log(`Listening to http://localhost:${port}`);
});
