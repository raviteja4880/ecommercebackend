const Sib = require("sib-api-v3-sdk");

const Sib = require("sib-api-v3-sdk");

const sendDeliveryEmail = async (to, order) => {
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

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:20px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;padding:25px;border:1px solid #e2e2e2;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:15px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="70" />
            <h2 style="margin:10px 0 0;font-size:24px;color:#0d6efd;">Order Delivered</h2>
          </td>
        </tr>

        <!-- DELIVERED ICON -->
        <tr>
          <td align="center" style="padding:10px 0;">
            <div style="
              width:85px;height:85px;border-radius:50%;
              background:#e7f8ed;margin:auto;
              display:flex;align-items:center;justify-content:center;">
              <img src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
                width="45" height="45" />
            </div>
            <p style="margin:15px 0 0;font-size:15px;color:#333;">
              Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been delivered successfully!
            </p>
          </td>
        </tr>

        <!-- ORDER ITEMS -->
        <tr>
          <td style="padding-top:20px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:12px;">Items Delivered</h3>

            <table width="100%">
              ${order.items.map(item => `
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
              `).join("")}
            </table>

            <hr style="border:0;border-top:1px solid #ddd;margin:15px 0;" />

            <table width="100%">
              <tr>
                <td style="font-size:16px;font-weight:bold;color:#000;">Total Paid</td>
                <td align="right" style="font-size:16px;font-weight:bold;color:#000;">
                  ₹${order.totalPrice.toLocaleString("en-IN")}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:10px 0;text-align:center;font-size:12px;color:#999;">
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
      subject: `Order Delivered • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

  } catch (error) {
    console.error("Delivery Email Error:", error.message);
  }
};

// ORDER CONFIRMATION EMAIL
const sendOrderConfirmationEmail = async (to, order) => {
  try {
    if (!to) return;

    const Sib = require("sib-api-v3-sdk");
    const client = Sib.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
      email: process.env.FROM_EMAIL || "onboarding@brevo.com",
      name: "MyStore",
    };

    const orderId = order._id.toString();

    const expectedDate = new Date(order.expectedDeliveryDate).toLocaleDateString(
      "en-IN",
      { day: "numeric", month: "short", year: "numeric" }
    );

    const trackingUrl =
      (process.env.CLIENT_URL || "https://tejacommerce.netlify.app") +
      `/order-success/${orderId}`;

    // ICONS
    const ICON_CART = "https://cdn-icons-png.flaticon.com/512/126/126515.png";
    const ICON_BOX = "https://cdn-icons-png.flaticon.com/512/679/679922.png";
    const ICON_MAP = "https://cdn-icons-png.flaticon.com/512/684/684908.png";
    const ICON_CHECK = "https://cdn-icons-png.flaticon.com/512/845/845646.png";

    // PROGRESS BAR (stage 1)
    const progressHTML = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0;">
        <tr>

          <td align="center" width="25%">
            <img src="${ICON_CART}" width="28"
              style="background:#0d6efd;padding:10px;border-radius:50%;" />
            <div style="font-size:13px;color:#0d6efd;margin-top:6px;font-weight:bold;">
              Order Placed
            </div>
          </td>

          <td align="center" width="25%">
            <img src="${ICON_BOX}" width="28"
              style="background:#e6e6e6;padding:10px;border-radius:50%;" />
            <div style="font-size:13px;color:#999;margin-top:6px;">Packed</div>
          </td>

          <td align="center" width="25%">
            <img src="${ICON_MAP}" width="28"
              style="background:#e6e6e6;padding:10px;border-radius:50%;" />
            <div style="font-size:13px;color:#999;margin-top:6px;">Out for Delivery</div>
          </td>

          <td align="center" width="25%">
            <img src="${ICON_CHECK}" width="28"
              style="background:#e6e6e6;padding:10px;border-radius:50%;" />
            <div style="font-size:13px;color:#999;margin-top:6px;">Delivered</div>
          </td>

        </tr>

        <tr>
          <td colspan="4" style="padding-top:12px;">
            <div style="width:100%;height:4px;background:#0d6efd;"></div>
          </td>
        </tr>

      </table>
    `;

    // EMAIL BODY
    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f5f7fa;padding:20px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:12px;padding:25px;
       border:1px solid #e2e2e2;">

        <!-- LOGO + TITLE -->
        <tr>
          <td align="center" style="padding-bottom:10px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png"
              width="70" />
            <h2 style="margin:8px 0 0;font-size:24px;color:#0d6efd;">Order Confirmation</h2>
          </td>
        </tr>

        <!-- TEXT -->
        <tr>
          <td align="center" style="font-size:16px;color:#333;padding:10px 0;">
            Hello <strong>${order.user?.name || "Customer"}</strong>,<br/>
            Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been placed successfully!
          </td>
        </tr>

        <tr>
          <td align="center" style="font-size:14px;color:#666;">
            Expected Delivery: <b>${expectedDate}</b>
          </td>
        </tr>

        <!-- PROGRESS -->
        <tr><td>${progressHTML}</td></tr>

        <!-- ORDER ITEMS -->
        <tr>
          <td style="padding-top:10px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:12px;">Items Ordered</h3>

            <table width="100%">
              ${order.items.map(item => `
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
              `).join("")}
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

        <!-- TRACK ORDER BUTTON -->
        <tr>
          <td align="center" style="padding:25px 0;">
            <a href="${trackingUrl}"
              style="padding:12px 26px;background:#0d6efd;color:white;
              border-radius:8px;text-decoration:none;font-weight:bold;">
              Track Order Status
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:10px 0;text-align:center;font-size:12px;color:#999;">
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

  } catch (err) {
    console.error("Order Confirmation Error:", err.message);
  }
};

module.exports = { sendOrderConfirmationEmail, sendDeliveryEmail };
