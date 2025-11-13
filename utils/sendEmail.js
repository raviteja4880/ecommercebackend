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

    //      EMAIL HTML TEMPLATE
    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:25px;">
        
        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <img src="https://cdn-icons-png.flaticon.com/512/1170/1170678.png" width="60" alt="Store Logo" />
            <h1 style="margin:10px 0 0;font-size:24px;color:#0d6efd;">MyStore</h1>
            <p style="margin:4px 0;font-size:14px;color:#666;">Delivery Confirmation</p>
          </td>
        </tr>

        <!-- MESSAGE -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <div style="display:inline-block;text-align:center;">
              <div style="
                background:#e8f9ee;
                border-radius:50%;
                width:80px;
                height:80px;
                display:flex;
                align-items:center;
                justify-content:center;
                margin:0 auto 15px auto;">
                <img src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
                     width="45" height="45" alt="Delivered Icon"
                     style="display:block;margin:auto;" />
              </div>

              <h2 style="color:#28a745;margin:0;font-size:26px;">Order Delivered</h2>

              <p style="margin:10px 0;font-size:15px;color:#333;">
                Your order has been delivered successfully!<br/>
                Order ID: <b>#${orderId.slice(-6).toUpperCase()}</b>
              </p>
            </div>
          </td>
        </tr>

        <!-- ORDER ITEMS -->
        <tr>
          <td style="padding-top:25px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:10px;">Items in Your Order</h3>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td width="60" style="padding:10px 0;">
                    <img src="${item.image}" width="55" height="55" 
                         style="border-radius:6px;object-fit:cover;" />
                  </td>

                  <td style="font-size:14px;color:#333;">
                    ${item.name} × ${item.qty}
                  </td>

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

    // SEND EMAIL
    await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject: `Order Delivered • #${orderId.slice(-6).toUpperCase()}`,
      htmlContent,
    });
  } catch (error) {
    console.error("Email Error:", error.message);
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
      ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    const trackingUrl =
      (process.env.CLIENT_URL || "https://tejacommerce.netlify.app") +
      `/order-success/${orderId}`;

    // ================= ICONS USED IN PROGRESS BAR =================
    const ICON_CART =
      "https://cdn-icons-png.flaticon.com/512/126/126515.png"; 
    const ICON_BOX =
      "https://cdn-icons-png.flaticon.com/512/679/679922.png"; 
    const ICON_MAP =
      "https://cdn-icons-png.flaticon.com/512/684/684908.png";
    const ICON_CHECK =
      "https://cdn-icons-png.flaticon.com/512/845/845646.png"; 

    // ================= BEAUTIFUL FRONTEND-STYLE PROGRESS BAR =================
    const progressHTML = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td align="center" style="position:relative;padding:20px 0;">

            <!-- Horizontal connecting line -->
            <div style="width:80%;height:3px;background:#dcdcdc;position:absolute;top:36px;left:10%;"></div>

            <!-- Icons row -->
            <table width="100%" style="table-layout:fixed;">
              <tr>
                <!-- STEP 1 ACTIVE -->
                <td align="center">
                  <div style="
                    width:48px;height:48px;border-radius:50%;
                    background:#0d6efd;display:flex;align-items:center;
                    justify-content:center;box-shadow:0 0 10px rgba(0,0,0,0.15);
                  ">
                    <img src="${ICON_CART}" width="22" height="22" />
                  </div>
                  <div style="font-size:14px;color:#0d6efd;margin-top:8px;font-weight:bold;">
                    Order Placed
                  </div>
                </td>

                <!-- STEP 2 INACTIVE -->
                <td align="center">
                  <div style="
                    width:48px;height:48px;border-radius:50%;
                    background:#e6e6e6;display:flex;align-items:center;
                    justify-content:center;
                  ">
                    <img src="${ICON_BOX}" width="22" height="22" style="opacity:0.6;" />
                  </div>
                  <div style="font-size:14px;color:#999;margin-top:8px;font-weight:600;">
                    Packed
                  </div>
                </td>

                <!-- STEP 3 INACTIVE -->
                <td align="center">
                  <div style="
                    width:48px;height:48px;border-radius:50%;
                    background:#e6e6e6;display:flex;align-items:center;
                    justify-content:center;
                  ">
                    <img src="${ICON_MAP}" width="22" height="22" style="opacity:0.6;" />
                  </div>
                  <div style="font-size:14px;color:#999;margin-top:8px;font-weight:600;">
                    Out for Delivery
                  </div>
                </td>

                <!-- STEP 4 INACTIVE -->
                <td align="center">
                  <div style="
                    width:48px;height:48px;border-radius:50%;
                    background:#e6e6e6;display:flex;align-items:center;
                    justify-content:center;
                  ">
                    <img src="${ICON_CHECK}" width="22" height="22" style="opacity:0.6;" />
                  </div>
                  <div style="font-size:14px;color:#999;margin-top:8px;font-weight:600;">
                    Delivered
                  </div>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    `;

    // ================= EMAIL BODY =================
    const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:25px;border:1px solid #e2e2e2;">

        <!-- LOGO -->
        <tr>
          <td align="center" style="padding-bottom:15px;">
            <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png"
              width="70" style="margin-bottom:10px;" />
            <h2 style="margin:0;font-size:24px;color:#0d6efd;">Order Confirmation</h2>
          </td>
        </tr>

        <!-- TEXT -->
        <tr>
          <td style="text-align:center;font-size:16px;color:#333;padding:10px;">
            Hello <strong>${order.user?.name || "Customer"}</strong>,<br/>
            Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been placed successfully!
          </td>
        </tr>

        <tr>
          <td style="text-align:center;font-size:14px;color:#666;">
            Expected Delivery: <b>${expectedDate}</b>
          </td>
        </tr>

        <!-- PROGRESS BAR -->
        <tr><td>${progressHTML}</td></tr>

        <!-- ORDER ITEMS LIST -->
        <tr>
          <td style="padding-top:15px;">
            <h3 style="font-size:18px;color:#333;margin-bottom:10px;">Items Ordered</h3>

            <table width="100%">
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

        <!-- TRACK ORDER BUTTON -->
        <tr>
          <td align="center" style="padding:25px 0;">
            <a href="${trackingUrl}"
               style="padding:12px 26px;background:#0d6efd;color:white;text-decoration:none;
                border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">
              Track Order Status
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="text-align:center;font-size:12px;color:#999;">
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
