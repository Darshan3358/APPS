/**
 * Centralized Toast Messages Dictionary for GigDial Customer App
 */
export const TOAST = {
  AUTH: {
    LOGIN_SUCCESS: "✅ Welcome back! Login successful.",
    LOGIN_FAILED: "❌ Invalid email or password.",
    EMAIL_REQUIRED: "⚠️ Please enter your email.",
    PASSWORD_REQUIRED: "⚠️ Please enter your password.",
    ACCOUNT_BLOCKED: "❌ Your account is blocked. Contact support.",
    NETWORK_ERROR: "🌐 Unable to connect to the server.",
    REGISTER_SUCCESS: "✅ Account created successfully.",
    OTP_SENT: "📧 OTP sent to your email.",
    OTP_VERIFIED: "✅ Email verified successfully.",
    OTP_INVALID: "❌ Invalid OTP.",
    OTP_EXPIRED: "⌛ OTP expired. Request a new one.",
    OTP_RESENT: "📧 OTP resent successfully.",
    LOGOUT_SUCCESS: "👋 Logged out successfully."
  },
  SEARCH: {
    SEARCHING: "🔍 Searching nearby workers...",
    LOADED: "✅ Workers loaded successfully.",
    NO_WORKERS: "❌ No workers found in your area.",
    LOAD_FAILED: "🌐 Failed to load workers."
  },
  BOOKING: {
    CREATED: "✅ Booking created successfully.",
    WORKER_NOTIFIED: "🎉 Worker has been notified.",
    CREATE_FAILED: "❌ Failed to create booking.",
    SELECT_WORKER: "⚠️ Please select a worker.",
    SELECT_DATE: "⚠️ Please select a date.",
    SELECT_TIME: "⚠️ Please select a time slot.",
    ENTER_ADDRESS: "⚠️ Please enter your address.",
    WAITING_RESPONSE: "📨 Waiting for worker response...",
    WORKER_ACCEPTED: "🎉 Worker accepted your booking.",
    WORKER_DECLINED: "❌ Worker declined the booking.",
    WORKER_ON_THE_WAY: "🚗 Worker is on the way.",
    WORK_STARTED: "🛠️ Work has started.",
    JOB_COMPLETED: "🎉 Job completed successfully."
  },
  OTP: {
    GENERATED: "🔐 Completion OTP generated.",
    SENT_TO_EMAIL: "📧 OTP sent to your registered email.",
    GENERATE_FAILED: "❌ Failed to generate OTP."
  },
  CHAT: {
    SENT: "✅ Message sent.",
    FAILED: "❌ Message failed to send.",
    RECEIVED: "💬 New message received."
  },
  REVIEWS: {
    SUBMITTED: "⭐ Review submitted successfully.",
    SUBMIT_FAILED: "❌ Failed to submit review.",
    PROVIDE_RATING: "⚠️ Please provide a rating."
  },
  PROFILE: {
    UPDATED: "✅ Profile updated successfully.",
    UPDATE_FAILED: "❌ Failed to update profile."
  },
  GLOBAL: {
    LOADING: "ℹ️ Loading... Please wait.",
    SAVING: "ℹ️ Saving changes...",
    SOMETHING_WENT_WRONG: "❌ Something went wrong.",
    SESSION_EXPIRED: "⌛ Session expired. Please login again.",
    ACCESS_DENIED: "❌ Access denied."
  }
};
