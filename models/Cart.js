const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Auto-populate product details
cartSchema.pre(/^find/, function (next) {
  this.populate("items.product");
  next();
});

// Virtual for total price
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((acc, item) => {
    if (item.product?.price) {
      acc += item.qty * item.product.price;
    }
    return acc;
  }, 0);
});

// Merge duplicate products automatically before save
cartSchema.pre("save", function (next) {
  if (!this.items || this.items.length === 0) return next();

  const merged = [];
  const map = new Map();

  this.items.forEach((item) => {
    const key = item.product.toString();
    if (map.has(key)) {
      map.get(key).qty += item.qty;
    } else {
      map.set(key, { product: item.product, qty: item.qty });
    }
  });

  this.items = Array.from(map.values());
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
