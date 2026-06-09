import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['deposit', 'withdraw', 'transfer'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stripeId: { type: String },
  metadata: { type: Object, default: {} },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
