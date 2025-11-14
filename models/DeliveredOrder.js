const mongoose = require("mongoose");

const deliveredOrderSchema = new mongoose.Schema(
  {
    originalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    user: {
      _id: String,
      name: String,
      email: String,
      phone: String,
    },

    items: [
      {
        name: String,
        qty: Number,
        price: Number,
        image: String,
      },
    ],

    shippingAddress: String,
    mobile: String,
    paymentMethod: String,

    totalPrice: Number,
    itemsPrice: Number,
    shippingPrice: Number,

    deliveredAt: Date,
    assignedTo: {
      _id: String,
      name: String,
      email: String,
    },

    paymentResult: {
      status: String,
      method: String,
      update_time: String,
      confirmedBy: String,
    },

    deliveryStage: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveredOrder", deliveredOrderSchema);
