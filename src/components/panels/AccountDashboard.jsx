import { useState } from "react";
import { Spin } from "../ui/common";

export function AccountDashboard({ user, onLogin, onLogout, onCancelSubscription, onChangeBillingPeriod, onChangeTier, onRenewLease, dm }) {
  const [isRenewing, setIsRenewing] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);

  if (!user || !user.loggedIn) {
    return (
      <div style={{
        width: "100%",
        maxWidth: "460px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "40px 32px",
        margin: "auto",
        background: dm ? "rgba(13, 17, 28, 0.98)" : "#ffffff",
        border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
        borderRadius: "28px",
        fontFamily: "'Outfit', sans-serif",
        textAlign: "center"
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          boxShadow: "0 8px 24px rgba(249, 115, 22, 0.25)"
        }}>
          📸
        </div>

        <div>
          <h2 style={{
            fontSize: "24px",
            fontWeight: 900,
            color: dm ? "#ffffff" : "#111827",
            letterSpacing: "-0.5px",
            margin: "0 0 8px 0"
          }}>
            Welcome to ez-photolab
          </h2>
          <p style={{
            fontSize: "13.5px",
            color: dm ? "#9ca3af" : "#4b5563",
            lineHeight: 1.5,
            margin: 0
          }}>
            Sign in to sync your local offline leases, manage watermarks, and access premium tools on any device.
          </p>
        </div>

        <button 
          onClick={onLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: dm ? "#ffffff" : "#111827",
            color: dm ? "#111827" : "#ffffff",
            border: "none",
            borderRadius: "14px",
            padding: "14px 24px",
            fontSize: "14px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(0,0,0,0.1)",
            transition: "all 0.2s",
            fontFamily: "inherit"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: "block" }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.57 2.69-3.87 2.69-6.57z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.33-1.58-5.04-3.71H.94v2.32C2.42 15.98 5.48 18 9 18z"/>
            <path fill="#FBBC05" d="M3.96 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V4.98H.94C.34 6.18 0 7.55 0 9s.34 2.82.94 4.02l3.02-2.32z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4C13.46.98 11.42 0 9 0 5.48 0 2.42 2.02.94 4.98l3.02 2.32c.71-2.13 2.69-3.71 5.04-3.71z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "11px",
          color: dm ? "#4b5563" : "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          <span>⚡ Secure OAuth 2.0</span>
          <span>•</span>
          <span>🔒 Direct Google Auth</span>
        </div>
      </div>
    );
  }

  const handleRenew = () => {
    setIsRenewing(true);
    setTimeout(() => {
      setIsRenewing(false);
      onRenewLease();
    }, 1200);
  };

  const getTierTheme = (tier) => {
    switch (tier) {
      case "admin":
        return {
          title: "System Administrator",
          badge: "⚡ Super Admin",
          glow: "linear-gradient(135deg, #ef4444 0%, #ec4899 50%, #f43f5e 100%)",
          color: "#ef4444"
        };
      case "team":
        return {
          title: "Studio Team",
          badge: "💎 Team Scale",
          glow: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 50%, #ec4899 100%)",
          color: "#ec4899"
        };
      case "pro":
        return {
          title: "Creator Pro",
          badge: "⭐ Studio Pro",
          glow: "linear-gradient(135deg, #f97316 0%, #facc15 100%)",
          color: "#f97316"
        };
      default:
        return {
          title: "Hobbyist",
          badge: "🌱 Free Sandbox",
          glow: dm ? "linear-gradient(135deg, #374151 0%, #4b5563 100%)" : "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
          color: dm ? "#9ca3af" : "#6b7280"
        };
    }
  };

  const theme = getTierTheme(user.tier);
  const formattedExpiry = user.offlineLeaseExpires 
    ? new Date(user.offlineLeaseExpires).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : "N/A";

  // Dummy JWT lease signature
  const mockJwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
    uid: "usr_photo982",
    email: user.email || "guest@sandbox.local",
    tier: user.tier,
    exp: Math.floor(new Date(user.offlineLeaseExpires || Date.now()).getTime() / 1000),
    device_id: "mac_aperture_wa_99a"
  })).replace(/=/g, "")}.ez_cryptosig_f97316_6c63ff_ec4899_wa_engine_auth`;

  return (
    <div style={{
      width: "100%",
      maxWidth: "960px",
      display: "flex",
      flexDirection: "column",
      gap: "28px",
      padding: "20px",
      animation: "slideup 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      fontFamily: "'Outfit', sans-serif"
    }}>
      <style>{`
        @keyframes slideup {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .account-card {
          backdrop-filter: blur(12px);
          WebkitBackdropFilter: blur(12px);
          background: ${dm ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.8)"};
          border: 1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: ${dm ? "0 10px 40px rgba(0, 0, 0, 0.2)" : "0 10px 40px rgba(0, 0, 0, 0.02)"};
          transition: transform 0.3s ease;
        }
        .portal-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(8px);
          WebkitBackdropFilter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 11000;
          padding: 16px;
        }
        .portal-box {
          max-width: 520px;
          width: 100%;
          background: ${dm ? "#0e1320" : "#ffffff"};
          border: 1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};
          border-radius: 24px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          animation: slideup 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .portal-btn {
          border: none;
          border-radius: 12px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: 'Outfit', sans-serif;
        }
      `}</style>

      {/* Profile and Tier Title */}
      <div className="account-card" style={{
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow corner background */}
        <div style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "200px",
          height: "200px",
          background: theme.glow,
          filter: "blur(60px)",
          opacity: dm ? 0.15 : 0.08,
          pointerEvents: "none"
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              👤 Developer Account Console
            </span>
            <h2 style={{
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 900,
              color: dm ? "#ffffff" : "#111827",
              letterSpacing: "-0.6px"
            }}>
              {user.loggedIn ? user.email : "Guest Local Sandbox"}
            </h2>
            {user.loggedIn && (
              <button 
                onClick={onLogout}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: dm ? "#ef4444" : "#dc2626",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 0",
                  textDecoration: "underline"
                }}
              >
                Sign out of account
              </button>
            )}
          </div>
          <div style={{
            background: theme.glow,
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: "50px",
            fontSize: "13px",
            fontWeight: 900,
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
            letterSpacing: "0.5px"
          }}>
            {theme.badge}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }} />

        {/* Active plan status or Upgrade Panel */}
        {user.tier === "free" ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: dm ? "rgba(249, 115, 22, 0.03)" : "rgba(249, 115, 22, 0.01)",
            border: `1.5px dashed rgba(249, 115, 22, ${dm ? "0.2" : "0.15"})`,
            padding: "20px",
            borderRadius: "18px",
            textAlign: "center",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "28px" }}>🌱</span>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: dm ? "#ffffff" : "#111827" }}>
              Active Tier: Hobbyist (Free Sandbox)
            </h3>
            <p style={{ fontSize: "12.5px", color: dm ? "#cbd5e1" : "#4b5563", maxWidth: "480px", lineHeight: 1.5 }}>
              You are currently utilizing our zero-cost offline sandbox. Standard camera culling is capped at 10 batch images, and RAW developer file decodes utilize standard limits.
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <span style={{ fontSize: "11px", background: dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", padding: "4px 10px", borderRadius: "20px", fontWeight: 600, color: dm ? "#a1a1aa" : "#4b5563" }}>
                🔒 Zero Cloud Uploads
              </span>
              <span style={{ fontSize: "11px", background: dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", padding: "4px 10px", borderRadius: "20px", fontWeight: 600, color: dm ? "#a1a1aa" : "#4b5563" }}>
                📱 Offline Installed
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px"
          }}>
            {/* Subscription Card */}
            <div style={{
              background: dm ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.005)",
              border: `1px solid ${dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px"
            }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? "#9ca3af" : "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Stripe Subscription
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: theme.color, marginTop: "4px" }}>
                  {theme.title}
                </h3>
                <p style={{ fontSize: "12.5px", color: dm ? "#cbd5e1" : "#4b5563", marginTop: "6px", lineHeight: 1.5 }}>
                  Billed <strong>{user.billingPeriod === "annual" ? "Annually" : "Monthly"}</strong> via secure card payment. Auto-renews unless cancelled.
                </p>
              </div>

              <button 
                onClick={() => setShowPortalModal(true)}
                className="portal-btn"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
                  color: '#ffffff',
                  alignSelf: "flex-start",
                  boxShadow: "0 4px 12px rgba(249, 115, 22, 0.2)"
                }}
              >
                ⚙ Manage Stripe Billing Portal
              </button>
            </div>

            {/* Offline Lease Signature Verification Card */}
            <div style={{
              background: dm ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.005)",
              border: `1px solid ${dm ? "rgba(255,255,255,0.05)" : "rgba(0, 0, 0, 0.04)"}`,
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px"
            }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? "#9ca3af" : "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Cryptographic Offline Lease
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                    boxShadow: "0 0 8px #10b981",
                    animation: "pulse-soft 1.5s infinite"
                  }} />
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#10b981" }}>
                    100% Offline Active
                  </h3>
                </div>
                <div style={{ fontSize: "11.5px", color: dm ? "#a1a1aa" : "#4b5563", marginTop: "8px", lineHeight: 1.4 }}>
                  <div><strong>Expires:</strong> {formattedExpiry}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                    <strong>Signature Token (JWT):</strong>
                    <div style={{
                      fontFamily: "monospace",
                      fontSize: "9px",
                      background: dm ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)",
                      padding: "6px",
                      borderRadius: "6px",
                      wordBreak: "break-all",
                      maxHeight: "36px",
                      overflowY: "auto",
                      color: dm ? "#8b9bb4" : "#4b5563"
                    }}>
                      {mockJwt}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleRenew}
                disabled={isRenewing}
                className="portal-btn"
                style={{
                  background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                  color: dm ? "#ffffff" : "#111827",
                  alignSelf: "flex-start",
                  border: `1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                }}
              >
                {isRenewing ? (
                  <>
                    <Spin color={dm ? "#ffffff" : "#111827"} />
                    <span>Renewing signature...</span>
                  </>
                ) : (
                  <>
                    <span>🔄 Refresh Lease Signature</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature Access Matrix Card */}
      <div className="account-card">
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6c63ff", textTransform: "uppercase", letterSpacing: "1.5px" }}>
          📋 Global Plan Feature Matrix
        </span>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", color: dm ? "#cbd5e1" : "#374151" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}>
                {["Feature Capability", "Free Sandbox", "Creator Pro", "Studio Team"].map((h, i) => (
                  <th key={h} style={{
                    padding: "10px",
                    fontWeight: 800,
                    textAlign: i === 0 ? "left" : "center",
                    color: i === 0 ? (dm ? "#ffffff" : "#111827") : (i === 1 && user.tier === "free" ? "#10b981" : i === 2 && user.tier === "pro" ? "#f97316" : i === 3 && (user.tier === "team" || user.tier === "admin") ? "#ec4899" : (dm ? "#9ca3af" : "#6b7280")),
                    background: (i === 1 && user.tier === "free") || (i === 2 && user.tier === "pro") || (i === 3 && (user.tier === "team" || user.tier === "admin"))
                      ? dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
                      : "transparent"
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Local Image Editing", "✅ JPEG/PNG Only", "✅ RAW + JPEG/PNG", "✅ RAW + JPEG/PNG"],
                ["Batch AI Focus Culling", "⚠️ Max 10 Photos", "✅ Unlimited Batching", "✅ Unlimited Batching"],
                ["C++ WASM Engine", "⚠️ Standard speed", "✅ High-Perf WASM", "✅ High-Perf WASM"],
                ["Logo / Brand Watermarks", "❌ Standard Logo", "❌ Standard Logo", "✅ Custom Designer"],
                ["Offline PWA Lease Expiry", "❌ Online only", "✅ 30 Days Cryptographic", "✅ 30 Days Cryptographic"],
                ["Multi-Device Cloud Syncing", "❌ No", "❌ No", "✅ Local Sync + Sidecars"]
              ].map((row, ri) => (
                <tr key={ri} style={{ borderBottom: ri < 5 ? `1px solid ${dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` : "none" }}>
                  <td style={{ padding: "10px", fontWeight: 700, color: dm ? "#e2e8f0" : "#111827" }}>{row[0]}</td>
                  {[1, 2, 3].map((colIdx) => {
                    const isUserCol = (colIdx === 1 && user.tier === "free") || (colIdx === 2 && user.tier === "pro") || (colIdx === 3 && (user.tier === "team" || user.tier === "admin"));
                    return (
                      <td key={colIdx} style={{
                        padding: "10px",
                        textAlign: "center",
                        background: isUserCol ? (dm ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)") : "transparent",
                        fontWeight: isUserCol ? 700 : 400
                      }}>
                        {row[colIdx]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Stripe Billing Portal Modal */}
      {showPortalModal && (
        <div className="portal-modal">
          <div className="portal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>⚙</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Stripe Customer Portal
                </span>
              </div>
              <button 
                onClick={() => setShowPortalModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dm ? "#9ca3af" : "#4b5563",
                  fontSize: "20px",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", letterSpacing: "-0.5px" }}>
                Manage Subscription Details
              </h3>
              <p style={{ fontSize: "13px", color: dm ? "#cbd5e1" : "#4b5563", lineHeight: 1.5 }}>
                Welcome to your Stripe billing credentials panel. You can update payment cards, toggle billing cycles, change tiers, or cancel your renewal.
              </p>

              {/* Card info */}
              <div style={{
                background: dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                padding: "16px",
                borderRadius: "14px",
                border: `1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                fontSize: "13px",
                color: dm ? "#cbd5e1" : "#4b5563"
              }}>
                💳 <strong>Visa ending in 4242</strong> (Expires 12/2030)
              </div>

              {/* Subscription actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                
                {/* Switch Period Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? "#ffffff" : "#111827" }}>
                    Billing Cycle: {user.billingPeriod === "annual" ? "Annually" : "Monthly"}
                  </span>
                  <button 
                    onClick={() => {
                      const nextPeriod = user.billingPeriod === "annual" ? "monthly" : "annual";
                      onChangeBillingPeriod(nextPeriod);
                      alert(`Billing cycle successfully updated in Stripe! Changed from ${user.billingPeriod} to ${nextPeriod}.`);
                    }}
                    className="portal-btn"
                    style={{
                      background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                      color: dm ? "#ffffff" : "#111827",
                      padding: "8px 14px",
                      fontSize: "12px"
                    }}
                  >
                    Switch to {user.billingPeriod === "annual" ? "Monthly" : "Annually"}
                  </button>
                </div>

                <div style={{ height: "1px", background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }} />

                {/* Plan Toggle (Pro ⇆ Team) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? "#ffffff" : "#111827" }}>
                    Current Tier: {theme.title}
                  </span>
                  <button 
                    onClick={() => {
                      const nextTier = user.tier === "pro" ? "team" : "pro";
                      onChangeTier(nextTier);
                      alert(`Subscription tier successfully updated in Stripe! Changed from ${theme.title} to ${getTierTheme(nextTier).title}.`);
                    }}
                    className="portal-btn"
                    style={{
                      background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                      color: dm ? "#ffffff" : "#111827",
                      padding: "8px 14px",
                      fontSize: "12px"
                    }}
                  >
                    Change to {user.tier === "pro" ? "Studio Team" : "Creator Pro"}
                  </button>
                </div>

                <div style={{ height: "1px", background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }} />

                {/* Cancel Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? "#ffffff" : "#111827", display: "block" }}>
                      Cancel Auto-Renewal
                    </span>
                    <span style={{ fontSize: "11px", color: dm ? "#9ca3af" : "#6b7280" }}>
                      Instantly downgrade back to Hobbyist Free.
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel your secure Stripe subscription? All Premium limits will be locked at the end of the billing period.")) {
                        onCancelSubscription();
                        setShowPortalModal(false);
                        alert("Subscription cancelled successfully. You have been downgraded back to the Free Hobbyist Sandbox.");
                      }
                    }}
                    className="portal-btn"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      border: "1.5px solid rgba(239, 68, 68, 0.2)",
                      padding: "8px 14px",
                      fontSize: "12px"
                    }}
                  >
                    Cancel Subscription
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
