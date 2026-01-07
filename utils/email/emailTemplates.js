const { wrapWithTheme } = require("./emailTheme");

const otpBox = (otp) => `
<tr>
  <td align="center" style="padding:20px 0;">
    <div style="
      font-size:28px;
      font-weight:bold;
      letter-spacing:6px;
      padding:15px 30px;
      background:#f1f5ff;
      color:#0d6efd;
      border-radius:10px;
      display:inline-block;">
      ${otp}
    </div>
    <p style="font-size:14px;color:#666;margin-top:10px;">
      This OTP is valid for <b>10 minutes</b>
    </p>
  </td>
</tr>
`;

exports.welcomeTemplate = ({ name }) => {
  const body = `
<tr>
  <td align="center">
    <h3 style="color:#0d6efd;">Welcome to MyStore!</h3>
    <p style="font-size:15px;color:#444;">
      Hi <b>${name}</b>, we're excited to have you on board.
    </p>
  </td>
</tr>
<tr>
  <td align="center">
    <p style="font-size:13px;color:#999;">
      We're here to help you with anything you need. Happy shopping!
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};  

exports.verifyOtpTemplate = ({ name, otp }) => {
  const body = `
<tr>
  <td align="center">
    <h3 style="color:#0d6efd;">Verify Your Email</h3>
    <p style="font-size:15px;color:#444;">
      Hi <b>${name}</b>, use the OTP below to verify your email address.
    </p>
  </td>
</tr>
${otpBox(otp)}
<tr>
  <td align="center">
    <p style="font-size:13px;color:#999;">
      If you didn’t create an account, you can safely ignore this email.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

exports.resendVerifyOtpTemplet = ({ name, otp }) => {
  const body = `
<tr>
  <td align="center">
    <h3 style="color:#0d6efd;">Verify Your Email</h3>
    <p style="font-size:15px;color:#444;">
      Hi <b>${name}</b>, use the OTP below to verify your email address.
    </p>
  </td>
</tr>
${otpBox(otp)}
<tr>
  <td align="center">
    <p style="font-size:13px;color:#999;">
      If you didn’t create an account, you can safely ignore this email.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

exports.resetPasswordOtpTemplate = ({ name, otp }) => {
  const body = `
<tr>
  <td align="center">
    <h3 style="color:#dc3545;">Reset Your Password</h3>
    <p style="font-size:15px;color:#444;">
      Hi <b>${name}</b>, use the OTP below to reset your password.
    </p>
  </td>
</tr>
${otpBox(otp)}
<tr>
  <td align="center">
    <p style="font-size:13px;color:#999;">
      If you didn’t request a password reset, please ignore this email.
    </p>
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

const orderItemsTable = (items) => `
<table width="100%">
  ${items
    .map(
      (item) => `
    <tr>
      <td width="60">
        <img src="${item.image}" width="55" height="55"
        style="border-radius:8px;object-fit:cover;border:1px solid #ddd;" />
      </td>
      <td style="font-size:14px;color:#333;">
        ${item.name} × ${item.qty}
      </td>
      <td align="right" style="font-size:14px;color:#333;">
        ₹${(item.price * item.qty).toLocaleString("en-IN")}
      </td>
    </tr>
  `
    )
    .join("")}
</table>
`;

exports.orderConfirmedTemplate = (order) => {
  const orderId = order._id.toString();
  const expectedDate = new Date(order.expectedDeliveryDate).toLocaleDateString(
    "en-IN"
  );

  const body = `
<tr>
  <td align="center">
    <h3 style="color:#0d6efd;">Order Confirmed</h3>
    <p>Hi <b>${order.user?.name || "Customer"}</b>, your order
    <b>#${orderId.slice(-6).toUpperCase()}</b> has been placed.</p>
    <p><b>Expected Delivery:</b> ${expectedDate}</p>
  </td>
</tr>
<tr>
  <td>
    <h4>Items Ordered</h4>
    ${orderItemsTable(order.items)}
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

exports.orderDeliveredTemplate = (order) => {
  const orderId = order._id.toString();

  const body = `
<tr>
  <td align="center">
    <h3 style="color:#28a745;">Order Delivered</h3>
    <p>Your order <b>#${orderId.slice(-6).toUpperCase()}</b> has been delivered.</p>
  </td>
</tr>
<tr>
  <td>
    <h4>Items Delivered</h4>
    ${orderItemsTable(order.items)}
  </td>
</tr>
`;

  return wrapWithTheme(body);
};

exports.orderCancelledTemplate = (order) => {
  const orderId = order._id.toString();

  const body = `
<tr>
  <td align="center">
    <h3 style="color:#dc3545;">Order Cancelled</h3>
    <p>Your order <b>#${orderId.slice(-6).toUpperCase()}</b> was cancelled.</p>
    <p><b>Reason:</b> ${order.cancelReason || "Not specified"}</p>
  </td>
</tr>
<tr>
  <td>
    <h4>Cancelled Items</h4>
    ${orderItemsTable(order.items)}
  </td>
</tr>
`;

  return wrapWithTheme(body);
};
