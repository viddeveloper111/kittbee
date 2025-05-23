const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageArray = new Schema({

  senderId: { type: Schema.Types.ObjectId, ref: 'Users' },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  content: { type: String, },
  image: { type: String, default: '' },
  video: { type: String, default: '' },
  document: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
    pollOptions: { type: pollSchema, default: null }, 
  amount: { type: Number, default: 0 },
  amountType: { type: String, enum: ['Contribution', 'Expense'], default: 'Contribution' },
  name: { type: String, default: '' },
  message: { type: String,}, // Store name
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
})

const messageSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'groups' },
  messages : [messageArray]
  
});

const Message = mongoose.model('Messages', messageSchema);
module.exports = Message;
