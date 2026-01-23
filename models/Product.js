const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    brand: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    countInStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
    },

    stockStatus: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
    },

    // Optional controls
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


// Auto update stock status before save
productSchema.pre("save", function (next) {
  if (this.countInStock === 0) {
    this.stockStatus = "out_of_stock";
  } else if (this.countInStock <= this.lowStockThreshold) {
    this.stockStatus = "low_stock";
  } else {
    this.stockStatus = "in_stock";
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
