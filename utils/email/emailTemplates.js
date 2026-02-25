const { wrapWithTheme, styles, THEME } = require("./emailTheme");

// ================= OTP BOX COMPONENT =================
const otpBox = (otp) => `
<tr>
  <td align="center" style="padding: 25px 0;">
    <div style="
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      padding: 20px 40px;
      background: linear-gradient(135deg, ${THEME.brandColor}10, ${THEME.brandColor}20);
      color: ${THEME.brandColor};
      border-radius: 12px;
      display: inline-block;
      border: 2px dashed ${THEME.brandColor}30;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: ${THEME.textLight}; margin-top: 15px;">
      This OTP is valid for <strong>10 minutes</strong>. Please don't share it with anyone.
    </p>
  </td>
</tr>
`;

// ================= ORDER ITEMS TABLE =================
const orderItemsTable = (items) => `
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
  <tr>
    <th style="text-align: left; padding: 12px 8px; background: ${THEME.background}; color: ${THEME.textLight}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${THEME.borderColor};">Product</th>
    <th style="text-align: center; padding: 12px 8px; background: ${THEME.background}; color: ${THEME.textLight}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${THEME.borderColor};">Qty</th>
    <th style="text-align: right; padding: 12px 8px; background: ${THEME.background}; color: ${THEME.textLight}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${THEME.borderColor};">Price</th>
  </tr>
  ${items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid ${THEME.borderColor};">
      <td style="padding: 15px 8px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right: 12px;">
              <img src="${item.image}" width="60" height="60" style="border-radius: 10px; object-fit: cover; border: 1px solid ${THEME.borderColor};" />
            </td>
            <td style="vertical-align: middle;">
              <p style="margin: 0; font-size: 14px; color: ${THEME.textDark}; font-weight: 500;">${item.name}</p>
            </td>
          </tr>
        </table>
      </td>
      <td align="center" style="padding: 15px 8px; font-size: 14px; color: ${THEME.textDark};">${item.qty}</td>
      <td align="right" style="padding: 15px 8px; font-size: 14px; color: ${THEME.textDark}; font-weight: 500;">₹${(item.price * item.qty).toLocaleString("en-IN")}</td>
    </tr>
  `
    )
    .join("")}
</table>
`;

// ================= ORDER DETAILS SECTION =================
const orderDetailsSection = (order) => {
  const orderId = order._id.toString();
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const paymentMethodDisplay = order.paymentMethod?.toUpperCase() || "N/A";
  const paymentStatus = order.isPaid 
    ? styles.statusBadge("Paid", THEME.secondaryColor)
    : styles.statusBadge("Pending", THEME.warningColor);

  return `
${styles.sectionTitle("Order Information")}
<table width="100%" cellpadding="0" cellspacing="0" style="background: ${THEME.background}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
  <tr>
    <td style="padding: 8px 0;">
      <span style="color: ${THEME.textLight}; font-size: 13px;">Order ID</span>
      <p style="margin: 5px 0 0; font-size: 15px; color: ${THEME.textDark}; font-weight: 600;">#${orderId.toUpperCase()}</p>
    </td>
  </tr>
  <tr>
    <td style="padding: 8px 0;">
      <span style="color: ${THEME.textLight}; font-size: 13px;">Order Date</span>
      <p style="margin: 5px 0 0; font-size: 15px; color: ${THEME.textDark}; font-weight: 500;">${orderDate}</p>
    </td>
  </tr>
  <tr>
    <td style="padding: 8px 0;">
      <span style="color: ${THEME.textLight}; font-size: 13px;">Payment Method</span>
      <p style="margin: 5px 0 0; font-size: 15px; color: ${THEME.textDark}; font-weight: 500;">${paymentMethodDisplay}</p>
    </td>
  </tr>
  <tr>
    <td style="padding: 8px 0;">
      <span style="color: ${THEME.textLight}; font-size: 13px;">Payment Status</span>
      <div style="margin-top: 8px;">${paymentStatus}</div>
    </td>
  </tr>
  ${order.expectedDeliveryDate ? `
  <tr>
    <td style="padding: 8px 0;">
      <span style="color: ${THEME.textLight}; font-size: 13px;">Expected Delivery</span>
      <p style="margin: 5px 0 0; font-size: 15px; color: ${THEME.brandColor}; font-weight: 500;">${new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </td>
  </tr>
  ` : ""}
</table>

${styles.sectionTitle("Shipping Address")}
<table width="100%" cellpadding="0" cellspacing="0" style="background: ${THEME.background}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
  <tr>
    <td style="padding: 5px 0;">
      <p style="margin: 0; font-size: 14px; color: ${THEME.textDark}; line-height: 1.6;">
        <strong>${order.user?.name || "Customer"}</strong><br/>
        ${order.shippingAddress}<br/>
        Phone: ${order.mobile}
      </p>
    </td>
  </tr>
</table>
`;
};

// ================= PRICE SUMMARY SECTION =================
const priceSummarySection = (order) => `
${styles.sectionTitle("Price Summary")}
<table width="100%" cellpadding="0" cellspacing="0" style="background: ${THEME.background}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
  ${styles.priceRow("Items Price", order.itemsPrice || 0)}
  ${styles.priceRow("Shipping", order.shippingPrice || 0)}
  ${styles.priceRow("Tax", order.taxPrice || 0)}
  ${styles.priceRow("Total", order.totalPrice || 0, true)}
</table>
`;

// ================= WELCOME TEMPLATE =================
exports.welcomeTemplate = ({ name }) => {
  const body = `
<tr>
  <td align="center" style="padding: 20px 0;">
    <div style="
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, ${THEME.brandColor}, ${THEME.brandColor}cc);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 36px; color: white;">🛍️</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 24px;">Welcome to ${THEME.brandName}!</h2>
    <p style="font-size: 15px; color: ${THEME.textLight}; margin: 0 0 20px;">
      Hi <strong>${name}</strong>, thank you for joining us. We're thrilled to have you!
    </p>
  </td>
</tr>
<tr>
  <td align="center">
    <p style="font-size: 13px; color: ${THEME.textLight}; line-height: 1.6;">
      Start exploring our latest collection and enjoy exclusive deals.<br/>
      Happy shopping with ${THEME.brandName}!
    </p>
  </td>
</tr>
${styles.ctaButton("Shop Now", "https://mystorx.com/products")}
`;

  return wrapWithTheme(body);
};

// ================= VERIFY OTP TEMPLATE =================
exports.verifyOtpTemplate = ({ name, otp }) => {
  const body = `
<tr>
  <td align="center" style="padding: 20px 0;">
    <div style="
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, ${THEME.brandColor}20, ${THEME.brandColor}10);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 32px;">🔐</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 22px;">Verify Your Email</h2>
    <p style="font-size: 14px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${name}</strong>, use the OTP below to verify your email address.
    </p>
  </td>
</tr>
${otpBox(otp)}
<tr>
  <td align="center">
    <p style="font-size: 13px; color: ${THEME.textLight};">
      If you didn't create an account with ${THEME.brandName}, you can safely ignore this email.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

// ================= RESEND VERIFY OTP TEMPLATE =================
exports.resendVerifyOtpTemplate = ({ name, otp }) => {
  const body = `
<tr>
  <td align="center" style="padding: 20px 0;">
    <div style="
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, ${THEME.warningColor}20, ${THEME.warningColor}10);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 32px;">📧</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 22px;">Resend: Verify Your Email</h2>
    <p style="font-size: 14px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${name}</strong>, here's your new OTP. Use it to verify your email address.
    </p>
  </td>
</tr>
${otpBox(otp)}
<tr>
  <td align="center">
    <p style="font-size: 13px; color: ${THEME.textLight};">
      This is a new OTP. Your previous OTP (if any) will no longer work.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

// ================= RESET PASSWORD OTP TEMPLATE =================
exports.resetPasswordOtpTemplate = ({ name, otp }) => {
  const body = `
<tr>
  <td align="center" style="padding: 20px 0;">
    <div style="
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, ${THEME.dangerColor}20, ${THEME.dangerColor}10);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 32px;">🔒</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 22px;">Reset Your Password</h2>
    <p style="font-size: 14px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${name}</strong>, use the OTP below to reset your password.
    </p>
  </td>
</tr>
${otpBox(otp)}
<tr>
  <td align="center">
    <p style="font-size: 13px; color: ${THEME.textLight};">
      If you didn't request a password reset, please ignore this email. Your account is secure.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

// ================= ORDER CONFIRMED TEMPLATE =================
exports.orderConfirmedTemplate = (order) => {
  const orderId = order._id.toString();
  const body = `
<tr>
  <td align="center" style="padding: 25px 0 15px;">
    <div style="
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, ${THEME.secondaryColor}, #20c997);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 40px;">✅</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 26px;">Order Confirmed!</h2>
    <p style="font-size: 15px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${order.user?.name || "Customer"}</strong>, thank you for your order!
    </p>
  </td>
</tr>
<tr>
  <td align="center" style="padding-bottom: 20px;">
    ${styles.statusBadge("Order #" + orderId.slice(-6).toUpperCase(), THEME.brandColor)}
  </td>
</tr>
${orderDetailsSection(order)}
${styles.sectionTitle("Order Items")}
${orderItemsTable(order.items)}
${priceSummarySection(order)}
${styles.ctaButton("Track Your Order", "https://mystorx.com/orders/" + order._id)}
<tr>
  <td align="center" style="padding-top: 20px;">
    <p style="font-size: 13px; color: ${THEME.textLight}; margin: 0;">
      You'll receive a confirmation email with tracking details once your order is shipped.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

// ================= ORDER DELIVERED TEMPLATE =================
exports.orderDeliveredTemplate = (order) => {
  const orderId = order._id.toString();
  const deliveredDate = new Date(order.deliveredAt).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = `
<tr>
  <td align="center" style="padding: 25px 0 15px;">
    <div style="
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, ${THEME.secondaryColor}, #20c997);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 40px;">🎉</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 26px;">Order Delivered!</h2>
    <p style="font-size: 15px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${order.user?.name || "Customer"}</strong>, great news! Your order has been delivered.
    </p>
  </td>
</tr>
<tr>
  <td align="center" style="padding-bottom: 20px;">
    ${styles.statusBadge("Delivered on " + deliveredDate, THEME.secondaryColor)}
  </td>
</tr>
${orderDetailsSection(order)}
${styles.sectionTitle("Delivered Items")}
${orderItemsTable(order.items)}
${priceSummarySection(order)}
<tr>
  <td align="center" style="padding-top: 25px;">
    <p style="font-size: 14px; color: ${THEME.textDark}; margin: 0 0 15px;">
      We hope you enjoy your purchase! Please take a moment to rate your experience.
    </p>
  </td>
</tr>
${styles.ctaButton("Write a Review", "https://mystorx.com/orders/" + order._id)}
<tr>
  <td align="center" style="padding-top: 20px;">
    <p style="font-size: 13px; color: ${THEME.textLight}; margin: 0;">
      Need to return or exchange? Our hassle-free return policy is here to help.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

// ================= ORDER CANCELLED TEMPLATE =================
exports.orderCancelledTemplate = (order) => {
  const orderId = order._id.toString();
  const cancelDate = order.canceledAt 
    ? new Date(order.canceledAt).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  const body = `
<tr>
  <td align="center" style="padding: 25px 0 15px;">
    <div style="
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, ${THEME.dangerColor}, #e74c3c);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 40px;">❌</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 26px;">Order Cancelled</h2>
    <p style="font-size: 15px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${order.user?.name || "Customer"}</strong>, your order has been cancelled.
    </p>
  </td>
</tr>
<tr>
  <td align="center" style="padding-bottom: 20px;">
    ${styles.statusBadge("Cancelled on " + cancelDate, THEME.dangerColor)}
  </td>
</tr>
${orderDetailsSection(order)}
${styles.sectionTitle("Cancelled Items")}
${orderItemsTable(order.items)}
${priceSummarySection(order)}
${order.cancelReason ? `
<tr>
  <td style="padding: 20px; background: ${THEME.dangerColor}10; border-radius: 12px; margin-top: 15px;">
    <p style="margin: 0; font-size: 14px; color: ${THEME.textDark};">
      <strong>Cancellation Reason:</strong> ${order.cancelReason}
    </p>
  </td>
</tr>
` : ""}
<tr>
  <td align="center" style="padding-top: 25px;">
    <p style="font-size: 14px; color: ${THEME.textLight}; margin: 0 0 15px;">
      If you didn't request this cancellation, please contact our support team.
    </p>
  </td>
</tr>
${styles.ctaButton("Continue Shopping", "https://mystorx.com/products")}
`;

  return wrapWithTheme(body);
};

// ================= DELIVERY WELCOME TEMPLATE =================
exports.deliveryWelcomeTemplate = ({ name, email, phone }) => {
  const body = `
<tr>
  <td align="center" style="padding: 25px 0 15px;">
    <div style="
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, ${THEME.brandColor}, #6c63ff);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;">
      <span style="font-size: 40px;">🚚</span>
    </div>
    <h2 style="color: ${THEME.textDark}; margin: 0 0 10px; font-size: 26px;">Welcome to ${THEME.brandName} Delivery Team!</h2>
    <p style="font-size: 15px; color: ${THEME.textLight}; margin: 0;">
      Hi <strong>${name}</strong>, we're excited to have you on board!
    </p>
  </td>
</tr>
${styles.sectionTitle("Your Account Details")}
<table width="100%" cellpadding="0" cellspacing="0" style="background: ${THEME.background}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
  ${styles.infoRow("Email", email)}
  ${styles.infoRow("Phone", phone || "Not provided")}
</table>
<tr>
  <td align="center" style="padding: 20px 0;">
    <p style="font-size: 14px; color: ${THEME.textDark}; line-height: 1.6;">
      As a delivery partner, you'll be responsible for delivering orders to our customers.<br/>
      Please make sure to:
    </p>
    <ul style="text-align: left; font-size: 14px; color: ${THEME.textDark}; line-height: 1.8; display: inline-block;">
      <li>Check your delivery dashboard daily for new assignments</li>
      <li>Follow delivery guidelines and timestamps</li>
      <li>Update delivery status in real-time</li>
      <li>Handle customer queries professionally</li>
    </ul>
  </td>
</tr>
${styles.ctaButton("Go to Delivery Dashboard", "https://mystorx.com/admin/delivery")}
<tr>
  <td align="center" style="padding-top: 20px;">
    <p style="font-size: 13px; color: ${THEME.textLight}; margin: 0;">
      If you have any questions, contact our support team at <a href="mailto:support@mystorx.com" style="color: ${THEME.brandColor};">support@mystorx.com</a>
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};
