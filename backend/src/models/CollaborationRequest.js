import mongoose from 'mongoose';

const { Schema } = mongoose;

const CollaborationRequestSchema = new Schema({
  investor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  entrepreneur: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('CollaborationRequest', CollaborationRequestSchema);
