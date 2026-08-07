const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter product name'],
      trim: true,
      maxLength: [100, 'Product name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true
    },
    description: {
      type: String,
      required: [true, 'Please enter product description']
    },
    price: {
      type: Number,
      required: [true, 'Please enter product price'],
      min: [0, 'Price cannot be negative']
    },
    discountPrice: {
      type: Number,
      default: 0
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please select category for this product']
    },
    stock: {
      type: Number,
      required: [true, 'Please enter product stock'],
      default: 0
    },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],
    ratings: {
      type: Number,
      default: 0
    },
    numReviews: {
      type: Number,
      default: 0
    },
    reviews: [reviewSchema],
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
