
// // src/socket/socket.js
// const WebSocket = require('ws');
// const Message = require('../schema/messageSchema'); // Import the Message schema

// // Function to handle WebSocket connections
// module.exports = (wss) => {
//   const clients = new Map();

//   wss.on('connection', (ws) => {
//     console.log('New client connected');

//     ws.on('message', async (message) => {
//       try {
//         const data = JSON.parse(message); // Parse the incoming message

//         switch (data.type) {
//           case 'joinGroup':
//             const { groupId, senderId } = data; // Extract data

//             if (!clients.has(groupId)) {
//               clients.set(groupId, new Set()); // Create a new Set for groupId if it doesn't exist
//             }
//             clients.get(groupId).add(ws); // Add the client to the group
//             break;

//           case 'sendMessage':
//             const { groupId: groupIdSend, senderId: senderIdSend, content, image, video, document } = data;

//             // Ensure at least one of content, image, video, or document is provided
//             if (!content && !image && !video && !document) {
//               ws.send(JSON.stringify({ error: 'At least one of content, image, video, or document must be provided' }));
//               return;
//             }

//             // Create a new message object
//             const newMessageData = {
//               senderId: senderIdSend,
//               content,
//               image,
//               video,
//               document,
//               timestamp: new Date() // Add timestamp here
//             };

//             // Find or create the message document by groupId
//             let messageDoc = await Message.findOne({ groupId: groupIdSend });

//             if (!messageDoc) {
//               messageDoc = new Message({
//                 groupId: groupIdSend,
//                 messages: [newMessageData]
//               });
//             } else {
//               messageDoc.messages.push(newMessageData);
//             }

//             // Save the message document
//             await messageDoc.save();

//             // Populate senderId details for the new message
//             // await messageDoc.populate('messages.senderId', 'fullname');

//             // Get the last message added to the array
//             const newMessage = messageDoc.messages[messageDoc.messages.length - 1];

//             // Create a response object
//             const response = {
//               type: 'receiveMessage',
//               content: newMessage.content || '',
//               image: newMessage.image || '',
//               video: newMessage.video || '',
//               document: newMessage.document || '',
//               timestamp: newMessage.timestamp,
//               _id: newMessage._id
//             };
//           // console.log(groupIdSend,'ggg');
//           // console.log(senderIdSend,'sss');
//           // console.log(clients.get(groupIdSend),'tttt');


          

//             // Broadcast the new message to everyone in the group
//             clients.get(groupIdSend).forEach(client => {
//               if (client.readyState === WebSocket.OPEN) {
//                 client.send(JSON.stringify(response));
//               }
//             });
//         //             const client = clients.get(groupIdSend);
//         // if (client && client.readyState === WebSocket.OPEN) {
//         //   client.send(JSON.stringify(response));
// // }
//             break;

//           default:
//             console.log('Unknown message type:', data.type);
//         }
//       } catch (error) {
//         console.error("Error processing message:", error);
//         ws.send(JSON.stringify({ error: 'Failed to process message',errors:error }));
//       }
//     });

//     ws.on('close', () => {
//       console.log('Client disconnected');
//       // Remove the client from all groups
//       clients.forEach((groupClients, groupId) => {
//         if (groupClients.has(ws)) {
//           groupClients.delete(ws);
//           console.log(`Client removed from group: ${groupId}`);
//           if (groupClients.size === 0) {
//             clients.delete(groupId); // Remove the group if empty
//           }
//         }
//       });
//     });

//     // Send a welcome message to the client
//     ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome to the WebSocket server!' }));
//   });
// };


// src/socket/socket.const WebSocket = require('ws');
 const WebSocket = require('ws');

const UserModel = require('../schema/userSchema'); // Import the User schema

// Function to handle WebSocket connections
module.exports = (wss) => {
  const clients = new Map(); // Map to store WebSocket clients by groupId

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
              const { groupId, senderId, content, image, video, document } = data;
              
              // Fetch sender details from the database (await is correctly used inside async function)
              const userData = await UserModel.findById(senderId); 

              if (!userData) {
                ws.send(JSON.stringify({ error: 'User not found' }));
                return;
              }

              // Ensure at least one of content, image, video, or document is provided
              if (!content && !image && !video && !document) {
                ws.send(JSON.stringify({ error: 'At least one of content, image, video, or document must be provided' }));
                return;
              }

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
                document: document || '',
                timestamp: new Date(),
              };

              // Broadcast the new message to everyone in the group
              const groupClients = clients.get(groupId);
              if (groupClients) {
                groupClients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(response)); // Send the message to each client
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
    ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome to the WebSocket server!' }));
  });
};
