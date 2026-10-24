import { useState } from "react";
import { Spin } from "./common";
import { apiRequest, openBilling, serviceOrigin } from '../../platform/services';

export function StripeCheckout({ isOpen, onClose, plan, dm, user, onLogin }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !plan) return null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!user?.loggedIn || !user?.uid) {
      setErrorMsg("Please sign in with Google first so your subscription can be linked to your account.");
      return;
    }

    setIsRedirecting(true);
    try {
      const origin = serviceOrigin();
      const res = await apiRequest("/api/create-checkout-session", {
          priceId: resolveClientPriceId(plan),
          tier: plan.tier,
          billingPeriod: plan.period || "monthly",
          userId: user.uid,
          customerEmail: user.email,
          successUrl: `${origin}/?checkout=success`,
          cancelUrl: `${origin}/?checkout=canceled`,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || `Failed to create Stripe Checkout session (HTTP ${res.status}).`);
      }

      await openBilling(data.url);
      setIsRedirecting(false);
    } catch (err) {
      console.error("Stripe Checkout error:", err);
      setErrorMsg(err.message || "Could not start Stripe Checkout. Verify your Stripe API keys and price IDs.");
      setIsRedirecting(false);
    }
  };

  const features = plan.tier === "team"
    ? [
        "Everything in Creator Pro + Studio Team Scale",
        "Custom PNG Logo & Brand Watermark Designer",
        "5-Device Cryptographic Offline Lease Sync",
        "Unlimited AI Focus Culling & C++ LibRaw Batching",
      ]
    : [
        "C++ WebAssembly LibRaw Developer Engine",
        "Unlimited AI Focus Culling & Batch Processing",
        "PhotoLab AI Studio (Sky, Depth Relight, Structure, Accent)",
        "30-Day Cryptographic Offline PWA Lease",
      ];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: "16px",
      animation: "fadein 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}
    onClick={(e) => { if (e.target === e.currentTarget && !isRedirecting) onClose(); }}
    >
      <style>{`
        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes checkout-slideup {
          from { transform: translateY(30px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .checkout-box {
          animation: checkout-slideup 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="checkout-box" style={{
        maxWidth: "820px",
        width: "100%",
        background: dm ? "rgba(13, 17, 28, 0.98)" : "#ffffff",
        border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        boxShadow: "0 24px 70px rgba(0, 0, 0, 0.45)",
        borderRadius: "28px",
        overflow: "hidden",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))"
      }}>
        {/* Left Side: Summary Panel */}
        <div style={{
          background: dm ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.015)",
          borderRight: `1px solid ${dm ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
          padding: "36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "24px"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={onClose}
              disabled={isRedirecting}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                color: dm ? "#9ca3af" : "#4b5563",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "6px",
                transition: "all 0.2s"
              }}
            >
              ← Back to plans
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "20px" }}>💳</span>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Outfit', sans-serif" }}>
                PHOTOlab Secure Stripe Checkout
              </span>
            </div>
            <h2 style={{
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              color: dm ? "#ffffff" : "#111827",
              letterSpacing: "-0.8px",
              lineHeight: 1.15,
              marginTop: "4px"
            }}>
              Subscribe to {plan.name}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "44px", fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: dm ? "#ffffff" : "#111827" }}>
                {plan.price}
              </span>
              <span style={{ fontSize: "14px", color: dm ? "#9ca3af" : "#4b5563", fontWeight: 600 }}>
                / {plan.period === "annual" ? "year" : "month"}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
              {plan.period === "annual"
                ? `Billed annually at ${plan.price}/year (${plan.savingBadge || "Save 27%"}). Includes automatic offline lease renewal.`
                : `Billed monthly at ${plan.price}/month. Cancel or switch plans anytime in one click via the Stripe Customer Portal.`
              }
            </p>

            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "12.5px",
              color: dm ? "#cbd5e1" : "#374151"
            }}>
              {features.map((item, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            fontSize: "11px",
            color: dm ? "#6b7280" : "#9ca3af",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <span>🔒 256-Bit TLS Encrypted</span>
            <span>•</span>
            <span>Hosted by Stripe</span>
          </div>
        </div>

        {/* Right Side: Account Link & Stripe Hosted Redirect */}
        <div style={{
          padding: "36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "24px"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{
              fontSize: "12px",
              fontWeight: 800,
              color: dm ? "#9ca3af" : "#4b5563",
              textTransform: "uppercase",
              letterSpacing: "0.8px"
            }}>
              Step 1 · Link Account
            </div>

            {user?.loggedIn ? (
              <div style={{
                background: dm ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.06)",
                border: "1.5px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "14px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>
                    ✓ Signed In with Google
                  </span>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: dm ? "#ffffff" : "#111827", wordBreak: "break-all" }}>
                    {user.email}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                background: dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: `1.5px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: "16px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <p style={{ fontSize: "12.5px", color: dm ? "#cbd5e1" : "#4b5563", lineHeight: 1.5, margin: 0 }}>
                  Sign in with your Google account so your subscription and 30-day offline lease are automatically synced across your devices.
                </p>
                <button
                  type="button"
                  onClick={onLogin}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: dm ? "#ffffff" : "#111827",
                    color: dm ? "#111827" : "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 18px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}

            <div style={{
              fontSize: "12px",
              fontWeight: 800,
              color: dm ? "#9ca3af" : "#4b5563",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginTop: "6px"
            }}>
              Step 2 · Complete Payment on Stripe
            </div>

            <div style={{
              background: dm ? "rgba(249, 115, 22, 0.05)" : "rgba(249, 115, 22, 0.03)",
              border: `1.5px dashed rgba(249, 115, 22, ${dm ? "0.2" : "0.15"})`,
              padding: "16px",
              borderRadius: "16px",
              fontSize: "12px",
              color: dm ? "#cbd5e1" : "#4b5563",
              lineHeight: 1.55
            }}>
              🔒 <strong>PCI-DSS Level 1 Security:</strong> Clicking below redirects you to Stripe&apos;s official hosted checkout page supporting Cards, Apple Pay, Google Pay, and Link. PHOTOlab never sees or stores your card details.
            </div>

            {errorMsg && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                padding: "12px 14px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.45
              }}>
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          <form onSubmit={handleCheckout}>
            <button
              type="submit"
              disabled={isRedirecting || !user?.loggedIn}
              style={{
                width: "100%",
                background: user?.loggedIn
                  ? "linear-gradient(135deg, #f97316 0%, #facc15 100%)"
                  : (dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                color: user?.loggedIn ? "#ffffff" : (dm ? "#6b7280" : "#9ca3af"),
                border: "none",
                borderRadius: "14px",
                padding: "15px 24px",
                fontSize: "14px",
                fontWeight: 800,
                cursor: (isRedirecting || !user?.loggedIn) ? "not-allowed" : "pointer",
                boxShadow: user?.loggedIn ? "0 4px 18px rgba(249, 115, 22, 0.3)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s",
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {isRedirecting ? (
                <>
                  <Spin color="#ffffff" />
                  <span>Redirecting to Stripe Checkout...</span>
                </>
              ) : (
                <span>🔒 Continue to Stripe ({plan.price}/{plan.period === "annual" ? "yr" : "mo"}) →</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
