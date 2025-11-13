const Sib = require("sib-api-v3-sdk");

const sendDeliveryEmail = async (to, order) => {
  try {
    if (!to) return console.warn("⚠️ No recipient email provided.");

    const Sib = require("sib-api-v3-sdk");
    const client = Sib.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
      email: process.env.FROM_EMAIL || "onboarding@brevo.com",
      name: "MyStore",
    };

    const orderId = order._id.toString();

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:25px;">
        
        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <img src="https://cdn-icons-png.flaticon.com/512/1170/1170678.png" width="60" />
            <h1 style="margin:10px 0 0;font-size:24px;color:#0d6efd;">MyStore</h1>
            <p style="margin:4px 0;font-size:14px;color:#666;">Delivery Confirmation</p>
          </td>
        </tr>

        <!-- MESSAGE -->
        <tr>
          <td style="padding:10px 0;text-align:center;font-size:16px;color:#333;">
            <strong>Your order has been delivered!</strong><br/>
            Order ID: <b>#${orderId.slice(-6).toUpperCase()}</b>
          </td>
        </tr>

        <!-- ORDER ITEMS -->
        <tr>
          <td style="padding-top:25px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:10px;">Order Items</h3>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td width="60" style="padding:10px 0;">
                    <img src="${item.image}" width="55" height="55" style="border-radius:6px;object-fit:cover;" />
                  </td>
                  <td style="font-size:14px;color:#333;">${item.name} × ${
                    item.qty
                  }</td>
                  <td align="right" style="font-size:14px;color:#333;">₹${(
                    item.price * item.qty
                  ).toLocaleString("en-IN")}</td>
                </tr>`
                )
                .join("")}
            </table>

            <hr style="border:0;border-top:1px solid #ddd;margin:15px 0;" />

            <table width="100%">
              <tr>
                <td style="font-size:16px;color:#000;font-weight:bold;">Total Paid</td>
                <td align="right" style="font-size:16px;color:#000;font-weight:bold;">
                  ₹${order.totalPrice.toLocaleString("en-IN")}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="text-align:center;font-size:12px;color:#999;padding-top:20px;">
            © ${new Date().getFullYear()} MyStore. All rights reserved.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`;

    await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Delivered! #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    console.log("📧 Delivery Email Sent");
  } catch (error) {
    console.error("❌ Delivery Email Error:", error.message);
  }
};

// ORDER CONFIRMATION EMAIL 
const sendOrderConfirmationEmail = async (to, order) => {
  try {
    if (!to) return console.warn("⚠️ No recipient email provided.");

    const Sib = require("sib-api-v3-sdk");
    const client = Sib.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
      email: process.env.FROM_EMAIL || "onboarding@brevo.com",
      name: "MyStore",
    };

    const orderId = order._id.toString();
    const expectedDate = order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN")
      : "N/A";

    const trackingUrl =
      (process.env.CLIENT_URL || "https://tejacommerce.netlify.app") +
      `/order-success/${orderId}`;

    // ============== MINI PROGRESS BAR (STAGE 1 OF 4) ==============
    const progressHTML = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:15px 0;">
        <tr>
          <td style="text-align:center;font-size:14px;color:#0d6efd;font-weight:bold;">Order Placed</td>
          <td style="text-align:center;font-size:14px;color:#999;">Packed</td>
          <td style="text-align:center;font-size:14px;color:#999;">Out for Delivery</td>
          <td style="text-align:center;font-size:14px;color:#999;">Delivered</td>
        </tr>

        <!-- PROGRESS BAR -->
        <tr>
          <td colspan="4" style="padding-top:8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" style="height:6px;background:#0d6efd;border-radius:6px 0 0 6px;"></td>
                <td width="25%" style="height:6px;background:#e0e0e0;"></td>
                <td width="25%" style="height:6px;background:#e0e0e0;"></td>
                <td width="25%" style="height:6px;background:#e0e0e0;border-radius:0 6px 6px 0;"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    // ============== EMAIL BODY ==============
    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:25px;">

        <!-- LOGO + TITLE -->
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="64" style="margin-bottom:10px;" />
            <h1 style="margin:0;font-size:24px;color:#0d6efd;">MyStore</h1>
            <p style="margin:4px 0;font-size:14px;color:#666;">Order Confirmation</p>
          </td>
        </tr>

        <!-- TEXT -->
        <tr>
          <td style="padding:10px 0;text-align:center;font-size:16px;color:#333;">
            <strong>Hello ${order.user?.name || "Customer"},</strong><br/>
            Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been placed successfully!
          </td>
        </tr>

        <tr>
          <td style="padding:5px 0;text-align:center;font-size:14px;color:#555;">
            Expected Delivery: <b>${expectedDate}</b>
          </td>
        </tr>

        <!-- MINI PROGRESS BAR -->
        <tr>
          <td>${progressHTML}</td>
        </tr>

        <!-- ORDER ITEMS -->
        <tr>
          <td style="padding-top:20px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:10px;">Items Ordered</h3>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td width="60" style="padding:10px 0;">
                    <img src="${item.image}" width="55" height="55" style="border-radius:6px;object-fit:cover;" />
                  </td>
                  <td style="font-size:14px;color:#333;">${item.name} × ${item.qty}</td>
                  <td align="right" style="font-size:14px;color:#333;">
                    ₹${(item.price * item.qty).toLocaleString("en-IN")}
                  </td>
                </tr>`
                )
                .join("")}
            </table>

            <hr style="border:0;border-top:1px solid #ddd;margin:15px 0;" />

            <table width="100%">
              <tr>
                <td style="font-size:16px;color:#000;font-weight:bold;">Total</td>
                <td align="right" style="font-size:16px;color:#000;font-weight:bold;">
                  ₹${order.totalPrice.toLocaleString("en-IN")}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BUTTON -->
        <tr>
          <td align="center" style="padding:30px 0;">
            <a href="${trackingUrl}"
              style="padding:12px 28px;background:#0d6efd;color:#ffffff;text-decoration:none;
              border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">
              Track Your Order
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="text-align:center;font-size:12px;color:#999;padding-top:15px;">
            © ${new Date().getFullYear()} MyStore. All rights reserved.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`;

    await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Confirmed! #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    console.log("📧 Order Confirmation Email Sent");
  } catch (error) {
    console.error("❌ Order Confirmation Email Error:", error.message);
  }
};

module.exports = { sendOrderConfirmationEmail, sendDeliveryEmail };
