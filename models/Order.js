// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    shippingAddress: { type: String, required: true },
    mobile: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["COD", "qr", "card"],
      required: true,
      default: "COD",
    },
    itemsPrice: { type: Number, required: true, default: 0 },
    shippingPrice: { type: Number, required: true, default: 0 },
    taxPrice: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paymentResult: {
      transactionId: { type: String },
      status: { type: String },
      update_time: { type: String },
      email: { type: String },
    },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    default: null,
  },
},
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate("items.product", "name image price");
  next();
});

module.exports = mongoose.model("Order", orderSchema);
