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
  { _id: false } // ✅ Prevents duplicate _id for each item
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
  { timestamps: true }
);

// ✅ Pre hook: auto-populate product details when fetching cart
cartSchema.pre(/^find/, function (next) {
  this.populate("items.product");
  next();
});

// ✅ Optional virtual: calculate total cart price dynamically
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((acc, item) => {
    if (item.product?.price) {
      return acc + item.qty * item.product.price;
    }
    return acc;
  }, 0);
});

module.exports = mongoose.model("Cart", cartSchema);
