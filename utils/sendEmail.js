// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendDeliveryEmail = async (to, order) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Use icon URLs (you can host your own or use CDN)
    const icons = {
      delivered: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
      cart: "https://cdn-icons-png.flaticon.com/512/1170/1170678.png",
      package: "https://cdn-icons-png.flaticon.com/512/679/679922.png",
      money: "https://cdn-icons-png.flaticon.com/512/992/992700.png",
      check: "https://cdn-icons-png.flaticon.com/512/845/845646.png",
    };

    const htmlBody = `
    <div style="background-color:#f6f9fc;padding:40px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:30px;">
        <div style="text-align:center;border-bottom:1px solid #eaeaea;padding-bottom:20px;">
          <img src="${icons.cart}" alt="MyStore" width="60" style="margin-bottom:10px;"/>
          <h1 style="color:#0d6efd;margin:0;">MyStore</h1>
          <p style="margin:4px 0 0;color:#777;font-size:14px;">Your trusted online shopping destination</p>
        </div>

        <div style="padding:25px 0 10px;">
          <div style="text-align:center;">
            <img src="${icons.delivered}" width="70" alt="Delivered" />
          </div>
          <h2 style="color:#28a745;text-align:center;margin-top:15px;">Your Order Has Been Delivered</h2>
          <p style="font-size:16px;color:#333;text-align:center;">
            Hi <b>${order.user?.name || "Customer"}</b>, your order 
            <b>#${order._id.slice(-6).toUpperCase()}</b> has been successfully delivered.
          </p>
        </div>

        <div style="margin:25px 0;padding:20px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin-top:0;color:#333;display:flex;align-items:center;gap:8px;">
            <img src="${icons.package}" width="22" alt="package"/> Order Summary
          </h3>
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
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <hr style="border:none;border-top:1px solid #ddd;margin:10px 0;" />
          <table width="100%">
            <tr>
              <td style="font-size:16px;color:#000;font-weight:600;display:flex;align-items:center;gap:8px;">
                <img src="${icons.money}" width="20" alt="money"/> Total Paid:
              </td>
              <td style="font-size:16px;color:#000;font-weight:600;text-align:right;">
                ₹${order.totalPrice.toLocaleString("en-IN")}
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align:center;margin-top:25px;">
          <a href="${process.env.CLIENT_URL || "https://mystore.com"}"
             style="display:inline-block;padding:12px 28px;background-color:#0d6efd;color:#fff;
             text-decoration:none;border-radius:6px;font-weight:600;letter-spacing:0.3px;">
             Shop Again
          </a>
        </div>

        <div style="margin-top:30px;font-size:14px;color:#555;line-height:1.6;">
          <p>We hope you enjoy your purchase. Thank you for shopping with <b>MyStore</b>!</p>
          <p style="margin-top:10px;">Need help? <a href="mailto:ravitejakandul@gmail.com" style="color:#0d6efd;text-decoration:none;">Contact Support</a></p>
        </div>

        <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />

        <footer style="text-align:center;font-size:12px;color:#999;">
          <p>© ${new Date().getFullYear()} MyStore. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </footer>
      </div>
    </div>
    `;

    const mailOptions = {
      from: `"MyStore" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Order #${order._id.slice(-6).toUpperCase()} Has Been Delivered!`,
      text: `Hi ${order.user?.name || "Customer"}, your order ${order._id} has been successfully delivered. Total paid: ₹${order.totalPrice.toLocaleString(
        "en-IN"
      )}. Thank you for shopping with MyStore.`,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Delivery email sent to ${to}`);
  } catch (err) {
    console.error("Error sending delivery email:", err.message);
  }
};

module.exports = { sendDeliveryEmail };
