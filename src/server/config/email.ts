import "server-only";
import nodemailer from "nodemailer";
import config from "./config";

export const ensureEmailConfigured = () => {
  if (!config.email.user || !config.email.pass) {
    throw new Error("Email service is not configured. Set EMAIL_USER and EMAIL_PASS to enable email sending.");
  }
};

export const createTransporter = () => {
  ensureEmailConfigured();

  return nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};
