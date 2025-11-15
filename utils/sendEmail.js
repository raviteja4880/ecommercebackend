const EmailLog = require("../models/EmailLog");
const Sib = require("sib-api-v3-sdk");

// ------------------ COMMON CONFIG ------------------
const client = Sib.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
const transEmailApi = new Sib.TransactionalEmailsApi();

const SENDER = {
  email: process.env.FROM_EMAIL || "onboarding@brevo.com",
  name: "MyStore",
};

const BASE_STYLE = `
  font-family: Arial, Helvetica, sans-serif;
  background:#f4f7fb;
  padding: 30px 0;
`;

const CARD_STYLE = `
  background: #fff;
  border-radius: 12px;
  padding: 25px;
  width: 600px;
  border: 1px solid #e4e6ef;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
`;

const FOOTER = `
  <tr>
    <td style="padding:15px 0;text-align:center;font-size:12px;color:#999;">
      © ${new Date().getFullYear()} MyStore. All rights reserved.
    </td>
  </tr>
`;

const LOGO_HEADER = `
  <tr>
    <td align="center" style="padding-bottom:10px;">
      <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="70" />
      <h2 style="margin:8px 0 0;font-size:24px;color:#0d6efd;">MyStore</h2>
    </td>
  </tr>
`;

// ORDER CONFIRMATION EMAIL
const sendOrderConfirmationEmail = async (to, order) => {
  try {
    if (!to) return;

    const orderId = order._id.toString();
    const expectedDate = new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const trackingUrl =
      (process.env.CLIENT_URL || "https://tejacommerce.netlify.app") +
      `/order-success/${orderId}`;

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="${BASE_STYLE}">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" style="${CARD_STYLE}">
        ${LOGO_HEADER}
        <tr>
          <td align="center" style="padding:10px 0;">
            <svg width="50" height="50" fill="#0d6efd" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 17l-5-5 1.41-1.42L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <h3 style="margin:10px 0;color:#0d6efd;">Order Confirmed</h3>
            <p style="font-size:15px;color:#444;">
              Hi <b>${order.user?.name || "Customer"}</b>, your order 
              <b>#${orderId.slice(-6).toUpperCase()}</b> has been placed successfully!<br/>
              Expected Delivery: <b>${expectedDate}</b>
            </p>
          </td>
        </tr>

        <tr>
          <td>
            <h4 style="color:#333;margin:20px 0 10px;">Items Ordered</h4>
            <table width="100%">
              ${order.items.map(item => `
                <tr>
                  <td width="60"><img src="${item.image}" width="55" height="55"
                    style="border-radius:8px;object-fit:cover;border:1px solid #ddd;" /></td>
                  <td style="font-size:14px;color:#333;">${item.name} × ${item.qty}</td>
                  <td align="right" style="font-size:14px;color:#333;">₹${(item.price * item.qty).toLocaleString("en-IN")}</td>
                </tr>`).join("")}
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:25px 0;">
            <a href="${trackingUrl}"
              style="padding:12px 26px;background:#0d6efd;color:white;border-radius:8px;
              text-decoration:none;font-weight:bold;">Track Order</a>
          </td>
        </tr>

        ${FOOTER}
      </table>
    </td>
  </tr>
</table>`;

    const result = await transEmailApi.sendTransacEmail({
      sender: SENDER,
      to: [{ email: to }],
      subject: `Order Confirmed • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    await EmailLog.create({
      to,
      subject: `Order Confirmed • #${orderId.slice(-6).toUpperCase()}`,
      orderId: order._id,
      status: "sent",
      messageId: result?.messageId || "",
      meta: result,
    });
  } catch (err) {
    console.error("Order Confirmation Email Error:", err.message);
  }
};

// ORDER DELIVERED EMAIL
const sendDeliveryEmail = async (to, order) => {
  try {
    if (!to) return;
    const orderId = order._id.toString();

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="${BASE_STYLE}">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" style="${CARD_STYLE}">
        ${LOGO_HEADER}
        <tr>
          <td align="center" style="padding:10px 0;">
            <svg width="50" height="50" fill="#28a745" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17l-3.88-3.88-1.41 1.41L9 19l12-12-1.41-1.41z"/>
            </svg>
            <h3 style="color:#28a745;">Order Delivered</h3>
            <p style="font-size:15px;color:#333;">
              Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been delivered successfully!
            </p>
          </td>
        </tr>

        <tr>
          <td>
            <h4 style="color:#333;margin:20px 0 10px;">Items Delivered</h4>
            <table width="100%">
              ${order.items.map(item => `
                <tr>
                  <td width="60"><img src="${item.image}" width="55" height="55"
                    style="border-radius:8px;object-fit:cover;border:1px solid #ddd;" /></td>
                  <td style="font-size:14px;color:#333;">${item.name} × ${item.qty}</td>
                  <td align="right" style="font-size:14px;color:#333;">₹${(item.price * item.qty).toLocaleString("en-IN")}</td>
                </tr>`).join("")}
            </table>
          </td>
        </tr>

        ${FOOTER}
      </table>
    </td>
  </tr>
</table>`;

    const result = await transEmailApi.sendTransacEmail({
      sender: SENDER,
      to: [{ email: to }],
      subject: `Order Delivered • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    await EmailLog.create({
      to,
      subject: `Order Delivered • #${orderId.slice(-6).toUpperCase()}`,
      orderId: order._id,
      status: "sent",
      messageId: result?.messageId || "",
      meta: result,
    });
  } catch (error) {
    console.error("Delivery Email Error:", error.message);
  }
};


// ===================== ORDER CANCELLED EMAIL =====================
const sendOrderCancelledEmail = async (to, order) => {
  try {
    if (!to) return;

    const client = Sib.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
      email: process.env.FROM_EMAIL || "onboarding@brevo.com",
      name: "MyStore",
    };

    const orderId = order._id.toString();
    const cancelReason = order.cancelReason || "No specific reason provided.";
    const total = order.totalPrice?.toLocaleString("en-IN");

    const clientUrl = process.env.CLIENT_URL || "https://tejacommerce.netlify.app";

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" 
style="background:#f8f9fa;padding:25px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;padding:25px;border:1px solid #e2e2e2;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:15px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="70" />
            <h2 style="margin:10px 0 0;font-size:24px;color:#dc3545;font-weight:700;">
              Order Cancelled
            </h2>
          </td>
        </tr>

        <!-- ICON + MESSAGE -->
        <tr>
          <td align="center" style="padding:10px 0;">
            <svg width="55" height="55" viewBox="0 0 24 24" fill="#dc3545" 
              xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 
              10 10 10-4.48 10-10S17.52 2 12 2zm5 
              13.59L15.59 17 12 13.41 8.41 17 
              7 15.59 10.59 12 7 8.41 8.41 7 
              12 10.59 15.59 7 17 8.41 
              13.41 12 17 15.59z"/>
            </svg>
            <p style="margin:15px 0 0;font-size:16px;color:#333;">
              Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been cancelled.
            </p>
            <p style="font-size:15px;color:#555;margin-top:8px;">
              <b style="color:#dc3545;">Reason:</b> ${cancelReason}
            </p>
          </td>
        </tr>

        <!-- ORDER DETAILS -->
        <tr>
          <td style="padding-top:20px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:12px;">Cancelled Items</h3>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td width="60" style="padding:10px 0;">
                    <img src="${item.image}" width="55" height="55"
                    style="border-radius:6px;object-fit:cover;border:1px solid #ddd;" />
                  </td>
                  <td style="font-size:14px;color:#333;">${item.name} × ${item.qty}</td>
                  <td align="right" style="font-size:14px;color:#333;">
                    ₹${(item.price * item.qty).toLocaleString("en-IN")}
                  </td>
                </tr>
              `
                )
                .join("")}
            </table>

            <hr style="border:0;border-top:1px solid #ddd;margin:15px 0;" />

            <table width="100%">
              <tr>
                <td style="font-size:16px;font-weight:bold;color:#000;">Order Total</td>
                <td align="right" style="font-size:16px;font-weight:bold;color:#000;">
                  ₹${total}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SHOP AGAIN BUTTON -->
        <tr>
          <td align="center" style="padding-top:25px;">
            <a href="${clientUrl}"
              style="padding:12px 26px;background:#0d6efd;color:white;
              border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
              Shop Again
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:15px 0;text-align:center;font-size:12px;color:#999;">
            © ${new Date().getFullYear()} MyStore. All rights reserved.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;

    const result = await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Cancelled • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    await EmailLog.create({
      to,
      subject: `Order Cancelled • #${orderId.slice(-6).toUpperCase()}`,
      orderId: order._id,
      status: "sent",
      messageId: result?.messageId || "",
      meta: result,
    });

    console.log(`📧 Cancel email sent successfully to ${to}`);
  } catch (error) {
    console.error("Cancel Email Error:", error.message);

    await EmailLog.create({
      to,
      subject: "Order Cancelled (FAILED)",
      orderId: order?._id,
      status: "failed",
      error: error.message,
    });
  }
};


module.exports = { sendOrderCancelledEmail, sendDeliveryEmail, sendOrderConfirmationEmail }
