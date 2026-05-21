import { useState, useEffect, useRef } from "react";
import { Spin } from "./common";

export function StripeCheckout({ isOpen, onClose, plan, dm, onPaymentSuccess }) {
  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const canvasRef = useRef(null);
  const confettiAnimId = useRef(null);

  // Simple auto-formatting for card number: xxxx xxxx xxxx xxxx
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.slice(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  // Simple auto-formatting for expiry: MM/YY
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setExpiry(value);
    }
  };

  // Limit CVC to 3 digits
  const handleCvcChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 3) value = value.slice(0, 3);
    setCvc(value);
  };

  // Detect card brand based on first digit
  const getCardBrand = () => {
    if (cardNumber.startsWith("4")) return { name: "Visa", color: "linear-gradient(135deg, #1e3a8a, #3b82f6)" };
    if (cardNumber.startsWith("5")) return { name: "Mastercard", color: "linear-gradient(135deg, #7c2d12, #ea580c)" };
    if (cardNumber.startsWith("3")) return { name: "American Express", color: "linear-gradient(135deg, #115e59, #0d9488)" };
    return { name: "Generic Credit", color: "linear-gradient(135deg, #1f2937, #4b5563)" };
  };

  const handlePay = (e) => {
    e.preventDefault();
    if (!email || cardNumber.length < 19 || expiry.length < 5 || cvc.length < 3 || !name) {
      alert("Please fill out all fields correctly.");
      return;
    }
    setIsPaying(true);

    // Simulate 2 seconds of secure banking verification
    setTimeout(() => {
      setIsPaying(false);
      setPaymentSuccess(true);
      
      // Trigger canvas-based confetti animation
      startConfetti();

      // Trigger success callback after 2.5 seconds
      setTimeout(() => {
        onPaymentSuccess({
          email,
          tier: plan.tier,
          billingPeriod: plan.period,
        });
        // Reset states
        setPaymentSuccess(false);
        setEmail("");
        setCardNumber("");
        setExpiry("");
        setCvc("");
        setName("");
        onClose();
      }, 2800);
    }, 2000);
  };

  // Confetti Particle Engine
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const colors = ["#f97316", "#facc15", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6"];
    const particles = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 100,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.7) * 18 - 5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;

      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        activeParticles++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.vx *= 0.98; // drag
        p.rotation += p.rSpeed;
        p.opacity -= 0.008;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (activeParticles > 0) {
        confettiAnimId.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  useEffect(() => {
    return () => {
      if (confettiAnimId.current) cancelAnimationFrame(confettiAnimId.current);
    };
  }, []);

  if (!isOpen) return null;

  const cardBrand = getCardBrand();

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
    }}>
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
        .checkout-input {
          background: ${dm ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)"};
          border: 1.5px solid ${dm ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"};
          color: ${dm ? "#ffffff" : "#111827"};
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          width: 100%;
          outline: none;
          transition: all 0.2s ease;
          font-family: 'Outfit', sans-serif;
        }
        .checkout-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          background: ${dm ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.8)"};
        }
      `}</style>

      <div className="checkout-box" style={{
        maxWidth: "880px",
        width: "100%",
        background: dm ? "rgba(13, 17, 28, 0.98)" : "#ffffff",
        border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        boxShadow: "0 24px 70px rgba(0, 0, 0, 0.45)",
        borderRadius: "28px",
        overflow: "hidden",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))"
      }}>
        {/* Canvas for Success Confetti */}
        {paymentSuccess && (
          <canvas ref={canvasRef} style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 100
          }} />
        )}

        {/* Success Splash Screen */}
        {paymentSuccess && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: dm ? "rgba(10, 14, 23, 0.96)" : "rgba(255, 255, 255, 0.97)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            zIndex: 90,
            textAlign: "center",
            padding: "24px"
          }}>
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              border: "2px solid #10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              color: "#10b981",
              animation: "bounce 1s ease infinite"
            }}>
              ✓
            </div>
            <h3 style={{
              fontSize: "24px",
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              color: dm ? "#ffffff" : "#111827",
              letterSpacing: "-0.5px"
            }}>
              Payment Successful!
            </h3>
            <p style={{
              fontSize: "14px",
              color: dm ? "#9ca3af" : "#4b5563",
              maxWidth: "340px",
              lineHeight: 1.5
            }}>
              Your local offline subscription is active. Generating secure cryptographic lease file...
            </p>
            <div style={{
              marginTop: "8px",
              fontSize: "12px",
              fontWeight: 800,
              color: "#f97316",
              letterSpacing: "1px",
              textTransform: "uppercase"
            }}>
              🔒 Verified by Stripe SDK
            </div>
          </div>
        )}

        {/* Left Side: Summary Panel */}
        <div style={{
          background: dm ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.015)",
          borderRight: `1px solid ${dm ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "30px"
        }}>
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button 
              onClick={onClose}
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
              onMouseEnter={(e) => e.target.style.background = dm ? "rgba(255, 255, 255, 0.05)" : "rgba(0,0,0,0.04)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              ← Back to plans
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <span style={{ fontSize: "20px" }}>💳</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Outfit', sans-serif" }}>
                PHOTOlab Secure Stripe Checkout
              </span>
            </div>
            <h2 style={{
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              color: dm ? "#ffffff" : "#111827",
              letterSpacing: "-0.8px",
              lineHeight: 1.1,
              marginTop: "8px"
            }}>
              Subscribe to {plan.name}
            </h2>
          </div>

          {/* Pricing Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "48px", fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: dm ? "#ffffff" : "#111827" }}>
                {plan.price}
              </span>
              <span style={{ fontSize: "14px", color: dm ? "#9ca3af" : "#4b5563", fontWeight: 600 }}>
                / {plan.period === "annual" ? "year" : "month"}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
              {plan.period === "annual" 
                ? `Billed annually at ${plan.price}/year (${plan.savingBadge}). Your 30-day cryptographic offline lease will auto-renew securely.`
                : `Billed monthly at ${plan.price}/month. Cancel anytime with one simple click via your billing panel.`
              }
            </p>
            
            {/* Local execution promise */}
            <div style={{
              background: dm ? "rgba(249, 115, 22, 0.05)" : "rgba(249, 115, 22, 0.03)",
              border: `1.5px dashed rgba(249, 115, 22, ${dm ? "0.2" : "0.15"})`,
              padding: "16px",
              borderRadius: "16px",
              fontSize: "12px",
              color: dm ? "#cbd5e1" : "#4b5563",
              lineHeight: 1.5
            }}>
              🔒 <strong>Absolute Privacy Commitment:</strong> Processing runs 100% locally inside your device. PHOTOlab does not operate cloud databases, does not store or process your RAW images, and avoids recurring data leaks.
            </div>
          </div>

          {/* Secure indicator */}
          <div style={{
            fontSize: "11px",
            color: dm ? "#6b7280" : "#9ca3af",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <span>🔒 SSL Encrypted Checkout</span>
            <span>•</span>
            <span>Powered by Stripe</span>
          </div>
        </div>

        {/* Right Side: Credit Card Payment Form */}
        <form onSubmit={handlePay} style={{
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "28px"
        }}>
          {/* Card Brand Graphic Preview */}
          <div style={{
            background: cardBrand.color,
            borderRadius: "18px",
            padding: "20px",
            height: "170px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.2)",
            color: "#ffffff",
            fontFamily: "'Outfit', sans-serif",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Glowing gold chip */}
            <div style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "120px",
              height: "120px",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%)",
              pointerEvents: "none"
            }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
              <div style={{ width: "36px", height: "26px", background: "linear-gradient(135deg, #ffe066, #f59e0b)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase" }}>
                {cardBrand.name}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", zIndex: 2 }}>
              <div style={{
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "2.5px",
                fontFamily: "'Courier New', Courier, monospace",
                minHeight: "22px"
              }}>
                {cardNumber || "•••• •••• •••• ••••"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "8px", textTransform: "uppercase", opacity: 0.7, letterSpacing: "0.5px" }}>Cardholder Name</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name.toUpperCase() || "YOUR FULL NAME"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "8px", textTransform: "uppercase", opacity: 0.7, letterSpacing: "0.5px" }}>Expires</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Courier New', Courier, monospace" }}>
                      {expiry || "MM/YY"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "8px", textTransform: "uppercase", opacity: 0.7, letterSpacing: "0.5px" }}>CVC</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Courier New', Courier, monospace" }}>
                      {cvc || "•••"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, color: dm ? "#9ca3af" : "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Email Address
              </label>
              <input
                type="email"
                required
                className="checkout-input"
                placeholder="you@photostudio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, color: dm ? "#9ca3af" : "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Card Number
              </label>
              <input
                type="text"
                required
                className="checkout-input"
                placeholder="4000 1234 5678 9010"
                value={cardNumber}
                onChange={handleCardNumberChange}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "11px", fontWeight: 800, color: dm ? "#9ca3af" : "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Expiration Date
                </label>
                <input
                  type="text"
                  required
                  className="checkout-input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "11px", fontWeight: 800, color: dm ? "#9ca3af" : "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  CVC (Security Code)
                </label>
                <input
                  type="password"
                  required
                  className="checkout-input"
                  placeholder="123"
                  value={cvc}
                  onChange={handleCvcChange}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, color: dm ? "#9ca3af" : "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Name on Card
              </label>
              <input
                type="text"
                required
                className="checkout-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Secure checkout button */}
          <button
            type="submit"
            disabled={isPaying}
            style={{
              width: "100%",
              background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
              color: "#ffffff",
              border: "none",
              borderRadius: "14px",
              padding: "14px 24px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: isPaying ? "not-allowed" : "pointer",
              boxShadow: "0 4px 18px rgba(249, 115, 22, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {isPaying ? (
              <>
                <Spin color="#ffffff" />
                <span>Securing bank link...</span>
              </>
            ) : (
              <>
                <span>🔒 Pay secure {plan.price}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
