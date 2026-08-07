const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter category name'],
      unique: true,
      trim: true,
      maxLength: [50, 'Category name cannot exceed 50 characters']
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true
    },
    description: {
      type: String,
      default: ''
    },
    image: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
