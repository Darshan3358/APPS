/**
 * Centralized Toast Messages Dictionary for GigDial Worker App
 */
export const TOAST = {
  REGISTRATION: {
    STEP1_SAVED: "✅ Basic information saved.",
    ENTER_NAME: "⚠️ Please enter your full name.",
    ENTER_EMAIL: "⚠️ Please enter a valid email.",
    ENTER_PHONE: "⚠️ Please enter your phone number.",
    PASS_MIN_LENGTH: "⚠️ Password must be at least 6 characters.",
    STEP2_SAVED: "✅ Professional details saved.",
    SELECT_PROFESSION: "⚠️ Please select your profession.",
    SELECT_SKILL: "⚠️ Please select at least one skill.",
    UPLOADING_AADHAAR: "📤 Uploading Aadhaar...",
    UPLOADING_PAN: "📤 Uploading PAN Card...",
    DOCS_UPLOADED: "✅ Documents uploaded successfully.",
    AADHAAR_FAILED: "❌ Aadhaar upload failed.",
    PAN_FAILED: "❌ PAN upload failed.",
    REQ_AADHAAR: "⚠️ Please upload Aadhaar Card.",
    REQ_PAN: "⚠️ Please upload PAN Card.",
    OTP_SENT: "📧 OTP sent successfully.",
    REGISTRATION_COMPLETE: "✅ Registration completed.",
    INVALID_OTP: "❌ Invalid OTP.",
    OTP_EXPIRED: "⌛ OTP expired.",
    OTP_RESENT: "📧 OTP resent successfully."
  },
  AUTH: {
    WELCOME: "✅ Welcome back!",
    APPROVAL_PENDING: "⌛ Your account is awaiting admin approval.",
    ACCOUNT_REJECTED: "❌ Your account has been rejected.",
    INVALID_CREDENTIALS: "❌ Invalid email or password.",
    SERVER_UNAVAILABLE: "🌐 Server unavailable."
  },
  DASHBOARD: {
    LOADED: "📊 Dashboard loaded successfully.",
    LOAD_FAILED: "❌ Failed to load dashboard.",
    NO_LEADS: "📭 No leads assigned to you."
  },
  LEADS: {
    NEW_LEAD: "🎉 New lead received.",
    LIST_UPDATED: "📋 Lead list updated.",
    LOAD_FAILED: "❌ Failed to load leads.",
    ASSIGNED: "🔔 New booking assigned to you.",
    CUSTOMER_BOOKED: "📍 Customer booked your service.",
    ACCEPTED: "✅ Booking accepted.",
    ACCEPT_FAILED: "❌ Failed to accept booking.",
    DECLINED: "❌ Booking declined."
  },
  STATUS: {
    ON_THE_WAY: "🚗 Status updated to On The Way.",
    IN_PROGRESS: "🛠️ Status updated to In Progress.",
    COMPLETED: "🎉 Job marked as Completed.",
    UPDATE_FAILED: "❌ Failed to update booking status."
  },
  OTP: {
    GENERATED: "🔐 Completion OTP generated.",
    SENT_TO_CUSTOMER: "📧 OTP sent to customer.",
    GENERATE_FAILED: "❌ Failed to generate OTP.",
    VERIFIED: "✅ OTP verified successfully.",
    JOB_COMPLETED: "🎉 Job completed.",
    INVALID_OTP: "❌ Invalid OTP.",
    OTP_EXPIRED: "⌛ OTP expired."
  },
  EARNINGS: {
    UPDATED: "💰 Earnings updated.",
    PAYMENT_RECEIVED: "💳 Payment received."
  },
  SUBSCRIPTION: {
    ACTIVATED: "✅ Subscription activated.",
    PAYMENT_SUCCESS: "💳 Payment successful.",
    PAYMENT_FAILED: "❌ Payment failed.",
    EXPIRED: "⌛ Subscription expired."
  },
  CHAT: {
    SENT: "✅ Message sent.",
    FAILED: "❌ Failed to send message.",
    NEW_MSG: "💬 New message received."
  },
  PROFILE: {
    UPDATED: "✅ Profile updated.",
    UPDATE_FAILED: "❌ Failed to update profile."
  },
  GLOBAL: {
    LOADING: "ℹ️ Loading...",
    SAVING: "ℹ️ Saving changes...",
    SOMETHING_WENT_WRONG: "❌ Something went wrong.",
    SESSION_EXPIRED: "⌛ Session expired. Please login again.",
    ACCESS_DENIED: "❌ Access denied."
  }
};
