const EmailLog = require("../models/EmailLog");
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
            <svg width="45" height="45" viewBox="0 0 24 24" 
              fill="#28a745" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17l-3.88-3.88-1.41 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
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

    const result = await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Delivered • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    // Log successful delivery email
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

    // Log failure
    await EmailLog.create({
      to,
      subject: "Order Delivered (FAILED)",
      orderId: order?._id,
      status: "failed",
      error: error.message,
    });
  }
};

// ORDER CONFIRMATION EMAIL
const sendOrderConfirmationEmail = async (to, order) => {
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

     const result = await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Confirmed! #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    // Log sent email
    await EmailLog.create({
      to,
      subject: `Order Confirmed! #${orderId.slice(-6).toUpperCase()}`,
      orderId: order._id,
      messageId: result?.messageId || "",
      status: "sent",
      meta: result,
    });

  } catch (err) {
    console.error("Order Confirmation Error:", err.message);

    // Log failed email
    await EmailLog.create({
      to,
      subject: "Order Confirmation (FAILED)",
      orderId: order?._id,
      status: "failed",
      error: err.message,
    });
  }
};

const sendWelcomeEmail = async (to, user) => {
  try {
    if (!to) return;

    const client = Sib.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
      email: process.env.FROM_EMAIL || "onboarding@brevo.com",
      name: "MyStore",
    };

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f5f7fa;padding:25px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0"
        style="
          background:#ffffff;
          border-radius:14px;
          padding:30px;
          border:1px solid #e2e2e2;
          box-shadow:0 4px 12px rgba(0,0,0,0.08);
        ">

        <!-- LOGO + TITLE -->
        <tr>
          <td align="center" style="padding-bottom:5px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png"
              width="65" style="margin-bottom:10px;" />
            <h2 style="margin:5px 0 0;font-size:26px;color:#0d6efd;font-weight:700;">
              Welcome to MyStore!
            </h2>
          </td>
        </tr>

        <!-- PROFILE ICON -->
        <tr>
          <td align="center" style="padding:10px 0;">
            <div style="
              width:95px;
              height:95px;
              border-radius:50%;
              background:#e7f4ff;
              display:flex;
              align-items:center;
              justify-content:center;
              margin:auto;
            ">
              <svg width="50" height="50" viewBox="0 0 24 24" 
                fill="#6c757d" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 
                2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
              </svg>
            </div>
          </td>
        </tr>

        <!-- TEXT CONTENT -->
        <tr>
          <td align="center" style="padding:20px 10px;">

            <p style="
              font-size:17px;
              color:#444;
              line-height:1.6;
              margin:0;
              font-weight:500;
            ">
              Hi <strong>${user.name}</strong>,
            </p>

            <p style="
              font-size:15px;
              color:#555;
              margin-top:12px;
              line-height:1.7;
            ">
              We're thrilled to welcome you to <strong>MyStore</strong>!  
              Your account has been created successfully and you're now a part of our shopping community.
            </p>

            <p style="
              font-size:15px;
              color:#555;
              line-height:1.7;
              margin-top:12px;
            ">
              Enjoy browsing products, placing orders, and tracking everything in real-time — all from one place.
            </p>

          </td>
        </tr>

        <!-- BUTTON -->
        <tr>
          <td align="center" style="padding-top:25px;">
            <a href="${process.env.CLIENT_URL || "https://tejacommerce.netlify.app"}"
              style="
                padding:13px 32px;
                background:#0d6efd;
                color:white;
                border-radius:8px;
                text-decoration:none;
                font-size:15px;
                font-weight:600;
                letter-spacing:0.3px;
                display:inline-block;
              ">
              Start Shopping
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="font-size:12px;color:#888;padding-top:25px;">
            © ${new Date().getFullYear()} MyStore • All rights reserved.
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
      subject: `Welcome to MyStore, ${user.name}!`,
      htmlContent,
    });

  } catch (error) {
    console.error("Welcome Email Error:", error.message);
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
    const cancelReason =
      order.cancelReason || "No specific reason provided by user.";

    //Inline SVG for Red Cancel Icon (perfectly centered)
    const CANCEL_ICON = `
      <svg width="50" height="50" viewBox="0 0 24 24" fill="#dc3545" 
        xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
          10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 
          17 12 13.41 8.41 17 7 15.59 10.59 12 
          7 8.41 8.41 7 12 10.59 15.59 7 
          17 8.41 13.41 12 17 15.59z"/>
      </svg>
    `;

    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f8f9fa;padding:20px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;padding:25px;border:1px solid #e2e2e2;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:15px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="70" />
            <h2 style="margin:10px 0 0;font-size:24px;color:#dc3545;">Order Cancelled</h2>
          </td>
        </tr>

        <!-- CANCEL ICON -->
        <tr>
          <td align="center" style="padding:10px 0;">
            ${CANCEL_ICON}
            <p style="margin:15px 0 0;font-size:15px;color:#333;">
              Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been cancelled.
            </p>
          </td>
        </tr>

        <!-- CANCELLATION REASON -->
        <tr>
          <td style="padding:15px 0;">
            <div style="
              background:#fcebea;
              border-left:4px solid #dc3545;
              padding:12px 16px;
              border-radius:8px;
              font-size:14px;
              color:#721c24;
            ">
              <strong>Reason:</strong> ${cancelReason}
            </div>
          </td>
        </tr>

        <!-- ORDER SUMMARY -->
        <tr>
          <td style="padding-top:15px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:12px;">Order Summary</h3>
            <table width="100%">
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td width="60" style="padding:10px 0;">
                    <img src="${item.image}" width="55" height="55"
                      style="border-radius:6px;object-fit:cover;border:1px solid #ddd;" />
                  </td>
                  <td style="font-size:14px;color:#333;">${item.name} × ${
                    item.qty
                  }</td>
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
                  ₹${order.totalPrice.toLocaleString("en-IN")}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SUPPORT MESSAGE -->
        <tr>
          <td align="center" style="padding-top:20px;">
            <p style="font-size:14px;color:#555;max-width:500px;margin:auto;line-height:1.6;">
              If you didn’t cancel this order or need help, please contact our support team.
            </p>
            <a href="${process.env.CLIENT_URL || "https://tejacommerce.netlify.app"}/contact"
              style="padding:10px 25px;background:#dc3545;color:white;
              text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">
              Contact Support
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
</table>
`;

    // Send email
    const result = await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Cancelled • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });

    // Log success
    await EmailLog.create({
      to,
      subject: `Order Cancelled • #${orderId.slice(-6).toUpperCase()}`,
      orderId: order._id,
      status: "sent",
      messageId: result?.messageId || "",
      meta: result,
    });
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

module.exports = { sendOrderConfirmationEmail, sendDeliveryEmail, sendWelcomeEmail, sendOrderCancelledEmail };
