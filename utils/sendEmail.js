// utils/sendEmail.js
const SibApiV3Sdk = require("sib-api-v3-sdk");
const EmailLog = require("../models/EmailLog"); 

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

async function sendDeliveryEmail(to, order, attempt = 1) {
  const maxAttempts = 3;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  try {
    if (!to) throw new Error("Missing recipient email");

    console.log(`[Attempt ${attempt}] Sending delivery email via Brevo to: ${to}`);

    const htmlBody = `
      <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:#333;background:#f6f9fc;padding:30px">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:25px">
          <h2 style="color:#28a745;text-align:center;">Order Delivered Successfully</h2>
          <p>Hi <b>${order.user?.name || "Customer"}</b>,</p>
          <p>Your order <b>#${order._id}</b> has been delivered successfully.</p>
          <h3>Order Summary:</h3>
          <ul style="list-style:none;padding:0">
            ${order.items
              .map(
                (item) =>
                  `<li>${item.name} × ${item.qty} — ₹${(
                    item.price * item.qty
                  ).toLocaleString("en-IN")}</li>`
              )
              .join("")}
          </ul>
          <p><b>Total Paid:</b> ₹${order.totalPrice.toLocaleString("en-IN")}</p>
          <hr style="border:none;border-top:1px solid #ddd" />
          <p style="font-size:13px;color:#666;">Thank you for shopping with <b>MyStore</b>!</p>
        </div>
      </div>
    `;

    const emailData = {
      sender: { name: "MyStore", email: process.env.FROM_EMAIL },
      to: [{ email: to }],
      subject: `Your Order #${order._id.slice(-6).toUpperCase()} Has Been Delivered!`,
      htmlContent: htmlBody,
    };

    const response = await apiInstance.sendTransacEmail(emailData);

    console.log("Email sent successfully via Brevo:", response.messageId || response);

    // Log success to MongoDB
    await EmailLog.create({
      to,
      subject: emailData.subject,
      orderId: order._id,
      messageId: response.messageId || null,
      status: "sent",
      meta: response,
    });

    return response;
  } catch (err) {
    console.error(`❌ Email send failed (attempt ${attempt}):`, err.message);

    // Log failure
    await EmailLog.create({
      to,
      subject: `Your Order #${order._id.slice(-6).toUpperCase()} Has Been Delivered!`,
      orderId: order._id,
      status: "failed",
      error: err.message,
    });

    // Retry logic with exponential backoff
    if (attempt < maxAttempts) {
      const delay = 1000 * Math.pow(2, attempt); // 1s → 2s → 4s
      console.warn(`⏳ Retrying in ${delay / 1000}s...`);
      await wait(delay);
      return sendDeliveryEmail(to, order, attempt + 1);
    }

    console.error("❌ Max retry attempts reached. Email not sent.");
  }
}

module.exports = { sendDeliveryEmail };
