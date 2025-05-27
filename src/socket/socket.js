

const WebSocket = require('ws');
const UserModel = require('../schema/userSchema'); // Import the User schema

// Function to handle WebSocket connections
module.exports = (wss) => {
  const clients = new Map();
global.clients = clients;
  wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', async (message) => {  // Make the message handler async to handle the DB call properly
      try {
        const data = JSON.parse(message); // Parse the incoming message
        console.log(data, 'Incoming message data');

        switch (data.type) {
          case 'joinGroup':
            {
              const { groupId } = data; // Extract groupId from the incoming data
              // Create a new Set for the group if it doesn't exist
              if (!clients.has(groupId)) {
                clients.set(groupId, new Set());
              }
              clients.get(groupId).add(ws); // Add the client to the group
              console.log(`Client joined group: ${groupId}`);
            }
            break;

          case 'sendMessage':
            {
              const { groupId, senderId, content, image, video, document, pollOptions,message,tamp } = data;
                  // Utility to extract @mentions from content
            const extractMentions = (text) => {
              const regex = /@([\w\s]+)/g; // matches @Full Name with spaces
              const mentions = [];
              let match;
              while ((match = regex.exec(text)) !== null) {
                mentions.push(match[1].trim());
              }
              return mentions;
            }
              
              // Fetch sender details from the database (await is correctly used inside async function)
              const userData = await UserModel.findById(senderId); 

              if (!userData) {
                ws.send(JSON.stringify({ error: 'User not found' }));
                return;
              }

              // Ensure at least one of content, image, video, or document is provided
              if (!content && !image && !video && !document && !pollOptions) {
                ws.send(JSON.stringify({ error: 'At least one of content, image, video, document and poll options must be provided' }));
                return;
              }

              const mentionedFullnames = extractMentions(content || "");
              const mentionedUsers = await UserModel.find({ fullname: { $in: mentionedFullnames } }).select("_id fullname");
              const mentionedUserIds = mentionedUsers.map(u => u._id.toString());
  
  
              // Create a response object for the message
              const response = {
                type: 'receiveMessage',
                content: content || '',
                groupId: groupId || '',
                senderId: senderId || '', 
                fullname: userData.fullname || '',
                profileImage: userData.profileImage || '',            
                image: image || '',
                video: video || '',
                tamp: tamp || '',
                document: document || '', 
                poll:pollOptions || '',
                pollOptions:pollOptions || '',
                mentions: mentionedUserIds,
                timestamp: new Date(),
              };
if (message && message.trim() !== '') {
      response.message = message;
    }
              // Broadcast the new message to everyone in the group except the sender
              const groupClients = clients.get(groupId);
              if (groupClients) {
                groupClients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN && client !== ws) {
                    client.send(JSON.stringify(response)); // Send the message to each client except the sender
                  }
                });
              }
            }
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ error: 'Failed to process message', errors: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      // Remove the client from all groups
      clients.forEach((groupClients, groupId) => {
        if (groupClients.has(ws)) {
          groupClients.delete(ws);
          console.log(`Client removed from group: ${groupId}`);
          if (groupClients.size === 0) {
            clients.delete(groupId); // Remove the group if empty
          }
        }
      });
    });

    // Send a welcome message to the client
    ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome to the WebSocket server! socket' }));
  });
};
