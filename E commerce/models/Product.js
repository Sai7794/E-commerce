const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Please add an image URL'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    brand: {
      type: String,
      default: 'Generic',
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      default: 0.0,
    },
    countInStock: {
      type: Number,
      required: [true, 'Please add stock count'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
