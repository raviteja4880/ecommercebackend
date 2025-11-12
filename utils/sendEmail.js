const Sib = require("sib-api-v3-sdk");

const sendDeliveryEmail = async (to, order) => {
  try {
    if (!to) return;

    const client = Sib.ApiClient.instance;
    const apiKey = client.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
      email: process.env.FROM_EMAIL || "onboarding@brevo.com",
      name: "MyStore",
    };

    const orderId =
      typeof order._id === "string" ? order._id : order._id.toString();

    const subject = `Your Order #${orderId.slice(-6).toUpperCase()} Has Been Delivered!`;

    const htmlContent = `
      <div style="background-color:#f6f9fc;padding:40px 0;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:30px;">
          <div style="text-align:center;border-bottom:1px solid #eaeaea;padding-bottom:20px;">
            <img src="https://cdn-icons-png.flaticon.com/512/1170/1170678.png" alt="MyStore" width="60" style="margin-bottom:10px;" />
            <h1 style="color:#0d6efd;margin:0;">MyStore</h1>
          </div>

          <div style="padding:25px 0;text-align:center;">
            <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" width="70" alt="Delivered" />
            <h2 style="color:#28a745;margin-top:15px;">Your Order Has Been Delivered!</h2>
            <p style="font-size:16px;color:#333;">
              Hi <b>${order.user?.name || "Customer"}</b>, your order 
              <b>#${orderId.slice(-6).toUpperCase()}</b> has been successfully delivered.
            </p>
          </div>

          <div style="margin:25px 0;padding:20px;background:#f9fafb;border-radius:10px;">
            <h3 style="margin-top:0;color:#333;">Order Summary</h3>
            <table width="100%" style="border-collapse:collapse;">
              <tbody>
                ${order.items
                  .map(
                    (item) => `
                    <tr>
                      <td style="padding:8px 0;font-size:15px;color:#444;">
                        ${item.name} × ${item.qty}
                      </td>
                      <td style="padding:8px 0;text-align:right;font-size:15px;color:#444;">
                        ₹${(item.price * item.qty).toLocaleString("en-IN")}
                      </td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
            <hr style="border:none;border-top:1px solid #ddd;margin:10px 0;" />
            <table width="100%">
              <tr>
                <td style="font-size:16px;color:#000;font-weight:600;">
                  Total Paid:
                </td>
                <td style="font-size:16px;color:#000;font-weight:600;text-align:right;">
                  ₹${order.totalPrice.toLocaleString("en-IN")}
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align:center;margin-top:30px;">
            <a href="${
              process.env.CLIENT_URL
                ? `${process.env.CLIENT_URL}/orders/${orderId}`
                : "https://tejacommerce.netlify.app/my-orders"
            }"
              style="display:inline-block;padding:12px 28px;background-color:#0d6efd;color:#fff;
              text-decoration:none;border-radius:6px;font-weight:600;letter-spacing:0.3px;">
              View Order
            </a>
          </div>

          <div style="margin-top:30px;font-size:14px;color:#555;line-height:1.6;">
            <p>We hope you enjoy your purchase. Thank you for shopping with <b>MyStore</b>!</p>
            <p style="margin-top:10px;">Need help? <a href="mailto:${
              process.env.FROM_EMAIL || "support@mystore.com"
            }" style="color:#0d6efd;text-decoration:none;">Contact Support</a></p>
          </div>

          <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />

          <footer style="text-align:center;font-size:12px;color:#999;">
            <p>© ${new Date().getFullYear()} MyStore. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </footer>

        </div>
      </div>
    `;

    await transEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent,
    });
  } catch (err) {
    // Keep minimal logging in case of API or SMTP issues
    console.error("❌ Email send failed:", err.response?.text || err.message);
  }
};

module.exports = { sendDeliveryEmail };
