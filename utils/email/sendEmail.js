const Sib = require("sib-api-v3-sdk");
const EmailLog = require("../../models/EmailLog");
const {
  orderConfirmedTemplate,
  orderDeliveredTemplate,
  orderCancelledTemplate,
  verifyOtpTemplate,
  resendVerifyOtpTemplate,
  resetPasswordOtpTemplate,
  welcomeTemplate,
  deliveryWelcomeTemplate,
} = require("./emailTemplates");


// BREVO SETUP
const client = Sib.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
const transEmailApi = new Sib.TransactionalEmailsApi();

const SENDER = {
  email: process.env.FROM_EMAIL || "onboarding@brevo.com",
  name: "MyStorX",
};

exports.sendWelcomeEmail = async (to, data) => {
  if (!to) return;

  await sendEmail({
    to,
    subject: "Welcome to MyStore",
    html: welcomeTemplate(data),
  });
};

const sendEmail = async ({ to, subject, html, orderId }) => {
  const result = await transEmailApi.sendTransacEmail({
    sender: SENDER,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });

  await EmailLog.create({
    to,
    subject,
    orderId,
    status: "sent",
    messageId: result?.messageId,
    meta: result,
  });
};

// ================= PUBLIC APIS =================

exports.sendOrderConfirmationEmail = async (to, order) => {
  if (!to) return;
  await sendEmail({
    to,
    subject: `Order Confirmed • #${order._id.toString().slice(-6)}`,
    html: orderConfirmedTemplate(order),
    orderId: order._id,
  });
};

exports.sendDeliveryEmail = async (to, order) => {
  if (!to) return;
  await sendEmail({
    to,
    subject: `Order Delivered • #${order._id.toString().slice(-6)}`,
    html: orderDeliveredTemplate(order),
    orderId: order._id,
  });
};

exports.sendOrderCancelledEmail = async (to, order) => {
  if (!to) return;
  await sendEmail({
    to,
    subject: `Order Cancelled • #${order._id.toString().slice(-6)}`,
    html: orderCancelledTemplate(order),
    orderId: order._id,
  });
};

exports.sendVerifyOtpEmail = async (to, data) => {
  if (!to) return;

  await sendEmail({
    to,
    subject: "Verify your email • MyStorX",
    html: verifyOtpTemplate(data),
  });
};

exports.resendVerifyOtpEmail = async (to, data) => {
  if (!to) return;

  await sendEmail({
    to,
    subject: "Resend: Verify your email • MyStorX",
    html: resendVerifyOtpTemplate(data),
  });
};

exports.sendDeliveryWelcomeEmail = async (email, data) => {
  const html = deliveryWelcomeTemplate(data);

  await sendEmail({
    to: email,
    subject: "Welcome to MyStorX Delivery Team",
    html,
  });
};

exports.sendResetPasswordOtpEmail = async (to, data) => {
  if (!to) return;

  await sendEmail({
    to,
    subject: "Reset password OTP • MyStorX",
    html: resetPasswordOtpTemplate(data),
  });
};

