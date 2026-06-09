import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entrepreneur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startupName: { type: String, required: true },
  industry: { type: String },
  amount: { type: String, required: true },
  equity: { type: String },
  status: {
    type: String,
    enum: ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'],
    default: 'Due Diligence'
  },
  stage: { type: String, default: 'Seed' },
  notes: { type: String },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

dealSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  this.lastActivity = new Date();
  next();
});

const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
