import { useState, useRef, useEffect, useCallback } from "react";
import { BatchPage } from "./BatchPage";
import CullPage from "./CullPage";
import { ToolsPanel } from "./components/panels/ToolsPanel";
import { AdjustPanel } from "./components/panels/AdjustPanel";
import { OverlayPanel } from "./components/panels/OverlayPanel";
import { EditPanel } from "./components/panels/EditPanel";
import { RawBatchPanel } from "./components/panels/RawBatchPanel";
import { Preview } from "./Preview";
import { Empty, SL, AB, Row, Spin, SmoothSlider } from "./components/ui/common";
import { DEFAULT_FILTERS, FB_MODES, PRESETS } from "./constants";
import {
  toCSSFilter, toTransformCSS, saveFile, canvasToBlob, loadImageFromSrc,
  renderFinal, getExportDims, applyUnsharpMask, applyNoiseReduction, applyAutoLevels, applyAutoContrast, calcBatchDims
} from "./utils";
import { createSkinMask } from "./faceMasking";
import { restoreFaceLocal } from "./faceRestore";
import { decodeRaw } from "./rawProcessor";
import { LandingPage } from "./LandingPage";
import { StripeCheckout } from "./components/ui/StripeCheckout";
import { AccountDashboard } from "./components/panels/AccountDashboard";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

export function ApertureLogo({ size = 26, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`aperture-logo ${className}`} 
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="url(#logoGlow)" strokeWidth="2.2" strokeLinecap="round" style={{ opacity: 0.95 }} />
      <g stroke="url(#logoGlow)" strokeWidth="1.6" strokeLinecap="round" opacity="0.95">
        <path d="m14.31 8 5.74 9.94" />
        <path d="M9.69 8h11.48" />
        <path d="m7.38 12 5.74-9.94" />
        <path d="M9.69 16 3.95 6.06" />
        <path d="M14.31 16H2.83" />
        <path d="m16.62 12-5.74 9.94" />
      </g>
    </svg>
  );
}

export function getTabIcon(id, isActive, dm) {
  const color = isActive ? "url(#logoGlow)" : (dm ? "#a1a1aa" : "#666677");
  const strokeWidth = 2;
  const size = 15;
  
  switch (id) {
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "edit":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          {isActive && (
            <defs>
              <linearGradient id="editTabGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#6c63ff" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          )}
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={isActive ? "url(#editTabGlow)" : color} />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={isActive ? "url(#editTabGlow)" : color} />
        </svg>
      );
    case "adjust":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
          <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
        </svg>
      );
    case "overlay":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "tools":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case "cull":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 7v8M7 11h8" strokeWidth={1.5} opacity={0.8} />
        </svg>
      );
    case "batch":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "account":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}>
          {isActive && (
            <defs>
              <linearGradient id="accountTabGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#facc15" />
              </linearGradient>
            </defs>
          )}
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={isActive ? "url(#accountTabGlow)" : color} />
          <circle cx="12" cy="7" r="4" stroke={isActive ? "url(#accountTabGlow)" : color} />
        </svg>
      );
    default:
      return null;
  }
}

async function verifyWritePermission(handle) {
  if (!handle) return false;
  if (typeof handle.queryPermission !== 'function' || typeof handle.requestPermission !== 'function') {
    return true;
  }
  try {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') {
      return true;
    }
    if ((await handle.requestPermission(opts)) === 'granted') {
      return true;
    }
  } catch (e) {
    console.error("Error checking write permission:", e);
  }
  return false;
}

export default function App() {
  const [image, setImage] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  
  // PWA INSTALL STATE & LOGIC
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      setIsInstalled(isStandalone);
    };
    checkInstalled();
    
    const mqFullscreen = window.matchMedia('(display-mode: fullscreen)');
    const mqStandalone = window.matchMedia('(display-mode: standalone)');
    mqFullscreen.addEventListener('change', checkInstalled);
    mqStandalone.addEventListener('change', checkInstalled);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      mqFullscreen.removeEventListener('change', checkInstalled);
      mqStandalone.removeEventListener('change', checkInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) {
      return;
    }
    if (isIOS) {
      setShowPwaGuide(true);
      return;
    }
    if (!deferredPrompt) {
      // Fallback: show the guide overlay if native prompt is not active
      setShowPwaGuide(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [cropAspect, setCropAspect] = useState("free");
  const [texts, setTexts] = useState([]);
  const [selText, setSelText] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [filterGroup, setFilterGroup] = useState("basic");
  const [showBefore, setShowBefore] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [isDragSplit, setIsDragSplit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState("standard");
  const [exportFmt, setExportFmt] = useState("jpg");
  const [exportQ, setExportQ] = useState(92);
  const [exportScale, setExportScale] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportInfo, setExportInfo] = useState("");
  const [fbMode, setFbMode] = useState("portrait");
  const [fbExporting, setFbExporting] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [bgStatus, setBgStatus] = useState("idle");
  const [bgProgress, setBgProgress] = useState(0);
  const [bgSubUrl, setBgSubUrl] = useState(null);
  const [bgMode, setBgMode] = useState("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgBlur, setBgBlur] = useState(14);
  const [bgResult, setBgResult] = useState(null);

  // BATCH STATE
  const [sourceHandle, setSourceHandle] = useState(null);
  const [outputHandle, setOutputHandle] = useState(null);
  const [batchImages, setBatchImages] = useState([]);
  const [batchLogo, setBatchLogo] = useState(null);
  const [batchLogoFile, setBatchLogoFile] = useState(null);
  const [batchLogoScale, setBatchLogoScale] = useState(0.15);
  const [batchLogoScalePortrait, setBatchLogoScalePortrait] = useState(0.30);
  const [batchLogoOpacity, setBatchLogoOpacity] = useState(0.7);
  const [batchLogoPos, setBatchLogoPos] = useState("bottom-right");
  const [batchLogoMargin, setBatchLogoMargin] = useState(20);
  const [batchResizeMode, setBatchResizeMode] = useState("none");
  const [batchResizePreset, setBatchResizePreset] = useState("ig_sq");
  const [batchCustomW, setBatchCustomW] = useState(1920);
  const [batchCustomH, setBatchCustomH] = useState(1080);
  const [batchKeepAspect, setBatchKeepAspect] = useState(true);
  const [batchLongEdgePx, setBatchLongEdgePx] = useState(2000);
  const [batchAutoLevels, setBatchAutoLevels] = useState(false);
  const [batchAutoContrast, setBatchAutoContrast] = useState(false);
  const [batchSharpen, setBatchSharpen] = useState(false);
  const [batchSharpenAmt, setBatchSharpenAmt] = useState(0.8);
  const [batchSharpenRad, setBatchSharpenRad] = useState(1.5);
  const [batchDenoise, setBatchDenoise] = useState(false);
  const [batchDenoiseAmt, setBatchDenoiseAmt] = useState(1.5);
  const [batchOutputFmt, setBatchOutputFmt] = useState("jpeg");
  const [batchOutputQ, setBatchOutputQ] = useState(90);
  const [batchPrefix, setBatchPrefix] = useState("");
  const [batchSuffix, setBatchSuffix] = useState("_edited");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentFile: "" });
  const [batchDone, setBatchDone] = useState(false);
  const [batchSection, setBatchSection] = useState("folders");
  const [batchFilterGroup, setBatchFilterGroup] = useState("basic");
  const [batchAiUpscale, setBatchAiUpscale] = useState(false);
  const [batchAiBeauty, setBatchAiBeauty] = useState(false);
  const [batchAiScale, setBatchAiScale] = useState(2);
  const [batchAiBeautySmooth, setBatchAiBeautySmooth] = useState(5);
  const [batchAiBeautyClarity, setBatchAiBeautyClarity] = useState(5);
  const [batchAiBeautyGlow, setBatchAiBeautyGlow] = useState(4);
  const [batchAiFaceRestore, setBatchAiFaceRestore] = useState(false);
  const [batchAiBeautyUseMask, setBatchAiBeautyUseMask] = useState(true);
  const [batchRawFiles, setBatchRawFiles] = useState([]);
  const [batchLogs, setBatchLogs] = useState([]);
  const [batchConfirmFirst, setBatchConfirmFirst] = useState(true);
  const [batchConfirmData, setBatchConfirmData] = useState(null);
  const [batchCancelRequested, setBatchCancelRequested] = useState(false);
  const batchCancelRef = useRef(false);
  const [batchStats, setBatchStats] = useState({ saved: 0, failed: 0 });

  // ─── SaaS Subscription State ───────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("admin") === "true") {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 365); // 1-year admin lease
        const adminUser = { 
          loggedIn: true, 
          email: "admin@ez-photolab.internal", 
          tier: "admin", 
          billingPeriod: "annual", 
          offlineLeaseExpires: expiry.toISOString() 
        };
        localStorage.setItem("photolab_saas_user", JSON.stringify(adminUser));
        try {
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        } catch (e) { console.error(e); }
        return adminUser;
      }
      const stored = localStorage.getItem("photolab_saas_user");
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    return { loggedIn: false, email: "", tier: "free", billingPeriod: "monthly", offlineLeaseExpires: null };
  });

  const [checkoutPlan, setCheckoutPlan] = useState(null);

  // Sync state in real time with Firebase Authentication and Firestore database
  useEffect(() => {
    let unsubscribeSnapshot = null;

    // Check if URL overrides with local admin mode
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true") return; // Keep the static admin mode

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const u = {
              loggedIn: true,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              tier: firebaseUser.email === "isidro.pascua@gmail.com" ? "admin" : (data.tier || "free"),
              billingPeriod: data.billingPeriod || "monthly",
              offlineLeaseExpires: data.offlineLeaseExpires || null
            };
            setUser(u);
            localStorage.setItem("photolab_saas_user", JSON.stringify(u));
          } else {
            const newUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              tier: "free",
              billingPeriod: "monthly",
              offlineLeaseExpires: null,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);
            const u = {
              loggedIn: true,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              tier: firebaseUser.email === "isidro.pascua@gmail.com" ? "admin" : "free",
              billingPeriod: "monthly",
              offlineLeaseExpires: null
            };
            setUser(u);
            localStorage.setItem("photolab_saas_user", JSON.stringify(u));
          }
        }, (err) => {
          console.error("Firestore sync error:", err);
        });
      } else {
        setUser({ loggedIn: false, email: "", tier: "free", billingPeriod: "monthly", offlineLeaseExpires: null });
        localStorage.removeItem("photolab_saas_user");
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login failed:", e);
      alert("Sign-In failed: " + e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      setActiveTab("home");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const handlePaymentSuccess = async ({ email, tier, billingPeriod }) => {
    if (!auth.currentUser) return;
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { 
        tier, 
        billingPeriod, 
        offlineLeaseExpires: expiry.toISOString() 
      }, { merge: true });
    } catch (e) {
      console.error("Payment success update error:", e);
    }
  };

  const handleCancelSubscription = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { tier: "free", offlineLeaseExpires: null }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeBillingPeriod = async (period) => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { billingPeriod: period }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeTier = async (tier) => {
    if (!auth.currentUser) return;
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { tier, offlineLeaseExpires: expiry.toISOString() }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenewLease = async () => {
    if (!auth.currentUser) return;
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { offlineLeaseExpires: expiry.toISOString() }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const addBatchLog = useCallback((msg, type = 'info') => {
    if (msg === "__CLEAR__") { setBatchLogs([]); return; }
    setBatchLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 100));
  }, []);

  // Deterministic memory revocation for single-image background removal
  useEffect(() => {
    return () => {
      if (bgSubUrl && bgSubUrl.startsWith('blob:')) {
        URL.revokeObjectURL(bgSubUrl);
      }
    };
  }, [bgSubUrl]);

  // Deterministic memory revocation for RAW Batch Queue file previews
  const prevRawUrlsRef = useRef([]);
  useEffect(() => {
    const currentUrls = batchRawFiles.map(f => f.previewUrl).filter(Boolean);
    // Revoke any preview URLs that were removed from the queue
    prevRawUrlsRef.current.forEach(url => {
      if (!currentUrls.includes(url)) {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    });
    prevRawUrlsRef.current = currentUrls;
  }, [batchRawFiles]);

  // AI Features state — key migration: old code stored Claid key under 'fal-api-key'
  const [falApiKey, setFalApiKey] = useState(() => localStorage.getItem('fal-ai-key') || '');
  const [claidApiKey, setClaidApiKey] = useState(() => {
    // Migrate: if claid-api-key is empty but fal-api-key has a value, it's the old Claid key
    const claid = localStorage.getItem('claid-api-key');
    if (claid) return claid;
    const old = localStorage.getItem('fal-api-key');
    if (old) { localStorage.setItem('claid-api-key', old); localStorage.removeItem('fal-api-key'); return old; }
    return '';
  });
  const saveFalKey = (k) => { setFalApiKey(k); localStorage.setItem('fal-ai-key', k); };
  const saveClaidKey = (k) => { setClaidApiKey(k); localStorage.setItem('claid-api-key', k); };
  const [aiUpscaleStatus, setAiUpscaleStatus] = useState('idle');
  const [aiUpscaleResult, setAiUpscaleResult] = useState(null);
  const [aiUpscaleLog, setAiUpscaleLog] = useState('');
  const [aiBeautyStatus, setAiBeautyStatus] = useState('idle');
  const [aiBeautyResult, setAiBeautyResult] = useState(null);
  const [aiBeautyLog, setAiBeautyLog] = useState('');
  const [aiBeautyUseMask, setAiBeautyUseMask] = useState(true);

  // AI Face Restore (fal.ai)
  const [aiFaceRestoreStatus, setAiFaceRestoreStatus] = useState('idle');
  const [aiFaceRestoreLog, setAiFaceRestoreLog] = useState('');
  const [aiFaceRestoreResult, setAiFaceRestoreResult] = useState(null);
  const [aiRemoveStatus, setAiRemoveStatus] = useState('idle');
  const [aiRemoveResult, setAiRemoveResult] = useState(null);
  const [aiRemoveLog, setAiRemoveLog] = useState('');
  const [aiRemoveBrush, setAiRemoveBrush] = useState(40);
  const [aiMaskReady, setAiMaskReady] = useState(false);

  const [aiScale, setAiScale] = useState(4);
  const [aiUpscaleProgress, setAiUpscaleProgress] = useState(0);
  const [aiUpscaleResultSize, setAiUpscaleResultSize] = useState('');
  const [aiBeautySmooth, setAiBeautySmooth] = useState(6);
  const [aiBeautyClarity, setAiBeautyClarity] = useState(5);
  const [aiBeautyGlow, setAiBeautyGlow] = useState(3);
  const [batchPreviewIdx, setBatchPreviewIdx] = useState(null);
  const [batchPreviewOrigUrl, setBatchPreviewOrigUrl] = useState(null);
  const [batchPreviewAfterUrl, setBatchPreviewAfterUrl] = useState(null);
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false);
  const [batchPreviewSplit, setBatchPreviewSplit] = useState(50);
  const [batchPreviewDragging, setBatchPreviewDragging] = useState(false);
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('photolab-dm');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('photolab-dm', darkMode);
    document.body.setAttribute('data-dark', darkMode ? 'true' : 'false');
  }, [darkMode]);

  const fileInputRef = useRef(null);
  const imgRef = useRef(null);
  const splitRef = useRef(null);
  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const maskDrawingRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onSliderInput = e => {
      const el = e.target;
      if (!el.classList.contains('sl')) return;
      const min = parseFloat(el.min) || 0;
      const max = parseFloat(el.max) || 100;
      const pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
      el.style.setProperty('--v', `${pct.toFixed(2)}%`);
    };
    document.addEventListener('input', onSliderInput, { capture: true });
    return () => document.removeEventListener('input', onSliderInput, { capture: true });
  }, []);

  useEffect(() => {
    if (bgSubUrl && bgStatus === "done") buildBgComposite(bgSubUrl, bgMode, bgColor, bgBlur);
  }, [bgMode, bgColor, bgBlur, bgSubUrl]);

  const onSplitMove = useCallback((cx) => {
    if (!splitRef.current) return;
    const r = splitRef.current.getBoundingClientRect();
    setSplitPos(Math.min(95, Math.max(5, ((cx - r.left) / r.width) * 100)));
  }, []);
  useEffect(() => {
    if (!isDragSplit) return;
    const mm = e => onSplitMove(e.clientX);
    const tm = e => { e.preventDefault(); onSplitMove(e.touches[0].clientX); };
    const up = () => setIsDragSplit(false);
    window.addEventListener("mousemove", mm); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", tm, { passive: false }); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", tm); window.removeEventListener("touchend", up); };
  }, [isDragSplit, onSplitMove]);

  const loadImage = file => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result); setFilters(DEFAULT_FILTERS); setRotation(0); setFlipH(false); setFlipV(false);
      setTexts([]); setSelText(null); setCropMode(false); setCropBox({ x: 0, y: 0, w: 100, h: 100 });
      setBgStatus("idle"); setBgSubUrl(null); setBgResult(null); setSplitPos(50); setShowBefore(false);
    };
    reader.readAsDataURL(file);
  };

  const resetAll = () => { setFilters(DEFAULT_FILTERS); setRotation(0); setFlipH(false); setFlipV(false); setTexts([]); setSelText(null); };

  const applyCrop = () => {
    const img = imgRef.current; if (!img) return;
    const W = img.naturalWidth, H = img.naturalHeight;
    const sx = cropBox.x / 100 * W, sy = cropBox.y / 100 * H;
    const sw = cropBox.w / 100 * W, sh = cropBox.h / 100 * H;
    const c = document.createElement("canvas"); c.width = sw; c.height = sh;
    const ctx = c.getContext("2d"); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    setImage(c.toDataURL("image/png")); setCropMode(false); setCropBox({ x: 0, y: 0, w: 100, h: 100 });
  };

  const addText = () => {
    const id = Date.now();
    setTexts(p => [...p, { id, content: "Tap to edit", x: 50, y: 50, fontSize: 48, color: "#ffffff", font: "System", bold: false, italic: false, stroke: true }]);
    setSelText(id);
  };
  const updateText = (id, key, val) => setTexts(p => p.map(t => t.id === id ? { ...t, [key]: val } : t));
  const deleteText = id => { setTexts(p => p.filter(t => t.id !== id)); setSelText(null); };

  const handleRemoveBg = async () => {
    if (!image || bgStatus === "loading") return;
    setBgStatus("loading"); setBgProgress(0); setBgSubUrl(null); setBgResult(null);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await (await fetch(image)).blob();
      const out = await removeBackground(blob, { progress: (k, c, t) => setBgProgress(Math.round(c / t * 100)), model: "medium" });
      const url = URL.createObjectURL(out);
      setBgSubUrl(url); setBgStatus("done");
      await buildBgComposite(url, bgMode, bgColor, bgBlur);
    } catch (e) { console.error(e); setBgStatus("error"); }
  };
  const buildBgComposite = async (subUrl, mode, color, blur) => {
    const orig = imgRef.current; if (!orig || !subUrl) return;
    const W = orig.naturalWidth, H = orig.naturalHeight;
    const sub = new Image(); sub.src = subUrl;
    await new Promise(r => { sub.onload = r; if (sub.complete) r(); });
    const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
    if (mode === "transparent") ctx.drawImage(sub, 0, 0, W, H);
    else if (mode === "color") { ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.drawImage(sub, 0, 0, W, H); }
    else if (mode === "blur") { ctx.filter = `blur(${blur}px)`; ctx.drawImage(orig, -30, -30, W + 60, H + 60); ctx.filter = "none"; ctx.drawImage(sub, 0, 0, W, H); }
    setBgResult(c.toDataURL("image/png"));
  };

  const cssFilter = toCSSFilter(filters);
  const natW = imgRef.current?.naturalWidth || 0, natH = imgRef.current?.naturalHeight || 0;
  const { W: expW, H: expH } = natW ? getExportDims(natW, natH, exportScale) : { W: 0, H: 0 };

  const handleExport = async () => {
    const src = bgResult || image;
    if (!src) { setExportInfo("No image loaded."); return; }
    setExporting(true); setExportDone(false); setExportInfo("Preparing…");
    try {
      const tmpImg = await loadImageFromSrc(src);
      const { W, H } = getExportDims(tmpImg.naturalWidth, tmpImg.naturalHeight, exportScale);
      setExportInfo(`Rendering ${W.toLocaleString()}×${H.toLocaleString()}px…`);
      const { canvas, W: rW, H: rH } = await renderFinal(src, cssFilter, filters, rotation, flipH, flipV, texts, W, H);
      const fmts = { jpg: { mime: "image/jpeg", ext: "jpg" }, png: { mime: "image/png", ext: "png" }, webp: { mime: "image/webp", ext: "webp" } };
      const { mime, ext } = fmts[exportFmt];
      const q = exportFmt === "png" ? undefined : exportQ / 100;
      const blob = await canvasToBlob(canvas, mime, q);
      if (!blob || blob.size === 0) throw new Error("Canvas produced empty blob — check image source.");
      const kb = Math.round(blob.size / 1024);
      setExportInfo(`${rW.toLocaleString()}×${rH.toLocaleString()}px · ${kb > 1024 ? (kb / 1024).toFixed(1) + "MB" : kb + "KB"}`);
      await saveFile(blob, `photolab.${ext}`);
      setExportDone(true); setTimeout(() => setExportDone(false), 4000);
    } catch (e) {
      console.error("Export error:", e);
      setExportInfo("Export failed: " + e.message);
    }
    setExporting(false);
  };
  const handleFbExport = async () => {
    const src = bgResult || image;
    if (!src) return;
    setFbExporting(true); setFbDone(false); setExportInfo("Preparing…");
    try {
      const tmpImg = await loadImageFromSrc(src);
      const mode = FB_MODES.find(m => m.id === fbMode);
      let tW = mode.w, tH = mode.h;
      if (!tH) { const sc = Math.min(1, tW / Math.max(tmpImg.naturalWidth, tmpImg.naturalHeight)); tW = Math.round(tmpImg.naturalWidth * sc); tH = Math.round(tmpImg.naturalHeight * sc); }
      const { canvas, W, H } = await renderFinal(src, cssFilter, filters, rotation, flipH, flipV, texts, tW, tH);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
      if (!blob || blob.size === 0) throw new Error("Empty blob");
      const kb = Math.round(blob.size / 1024);
      setExportInfo(`${W}×${H}px · ${kb > 1024 ? (kb / 1024).toFixed(1) + "MB" : kb + "KB"}`);
      await saveFile(blob, `facebook_${mode.id}.jpg`);
      setFbDone(true); setTimeout(() => setFbDone(false), 4000);
    } catch (e) { console.error("FB export error:", e); setExportInfo("Export failed: " + e.message); }
    setFbExporting(false);
  };

  const isEdited = Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]) || rotation !== 0 || flipH || flipV || texts.length > 0;
  const showSplit = isEdited && activeTab === "edit" && !cropMode;
  const transformCSS = toTransformCSS(rotation, flipH, flipV);

  const selectSourceFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setSourceHandle(handle);
      const files = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const file = await entry.getFile();
          files.push({ name: entry.name, file });
        }
      }
      setBatchImages(files);
      setBatchDone(false);
    } catch (err) { if (err.name !== 'AbortError') console.error(err); }
  };

  const selectRawSourceFolder = async () => {
    addBatchLog("Opening folder picker for RAW files...", "info");
    try {
      const handle = await window.showDirectoryPicker();
      setSourceHandle(handle);
      const files = [];
      const RAW_REGEX = /\.(nef|cr2|cr3|arw|dng|orf|raf|rw2|pef|x3f)$/i;
      
      addBatchLog("Scanning folder for RAW files...", "info");
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.match(RAW_REGEX)) {
          const file = await entry.getFile();
          files.push({ name: entry.name, file });
        }
      }
      
      if (files.length === 0) {
        addBatchLog("⚠️ No RAW files found in the selected folder.", "warning");
      } else {
        addBatchLog(`✅ Found ${files.length} RAW files. Ready for processing.`, "success");
      }

      const rawQueue = files.map(f => ({
        name: f.name,
        file: f.file,
        previewUrl: null,
        metadata: { model: 'RAW File', iso: '...', width: 0, height: 0 }
      }));
      
      setBatchRawFiles(rawQueue);
      setBatchDone(false);
    } catch (err) { 
      if (err.name !== 'AbortError') {
        addBatchLog(`❌ Folder Error: ${err.message}`, "error");
        console.error(err); 
      }
    }
  };

  const selectOutputFolder = async () => {
    try {
      let handle;
      try {
        handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      } catch (e) {
        handle = await window.showDirectoryPicker();
      }
      setOutputHandle(handle);
    } catch (err) { if (err.name !== 'AbortError') console.error(err); }
  };

  const handleBatchLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBatchLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => setBatchLogo(img);
    };
    reader.readAsDataURL(file);
  };

  const generateBatchPreview = useCallback(async (idx, isRawOverride) => {
    const isRaw = isRawOverride !== undefined ? isRawOverride : batchSection === 'raw';
    const queue = isRaw ? batchRawFiles : batchImages;
    if (idx === null || !queue[idx]) return;
    
    setBatchPreviewLoading(true);
    setBatchPreviewIdx(idx);
    setBatchPreviewOpen(true);
    
    const targetFile = queue[idx];
    try {
      let origUrl = null;
      let orientation = 1;

      if (isRaw) {
        if (targetFile.previewUrl) {
          origUrl = targetFile.previewUrl;
          orientation = targetFile.metadata?.orientation || 1;
        } else if (targetFile.file) {
          const buffer = await targetFile.file.arrayBuffer();
          const result = await decodeRaw(buffer, () => {});
          origUrl = result.url;
          orientation = result.orientation || 1;
          setBatchRawFiles(prev => prev.map((f, i) => i === idx ? { ...f, previewUrl: result.url, metadata: { ...f.metadata, orientation } } : f));
        }
      } else {
        origUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(targetFile.file);
        });
      }

      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = origUrl;
      });

      const PREVIEW_MAX = 1200;
      let sW = img.naturalWidth || img.width;
      let sH = img.naturalHeight || img.height;

      if (isRaw && orientation >= 5 && orientation <= 8) {
        const t = sW; sW = sH; sH = t;
      }

      const scale = Math.min(1, PREVIEW_MAX / Math.max(sW, sH));
      let W = Math.round(sW * scale);
      let H = Math.round(sH * scale);

      // Create a canvas for the "before" image with correct orientation baked in
      let beforeCanvas = document.createElement('canvas');
      beforeCanvas.width = W;
      beforeCanvas.height = H;
      let beforeCtx = beforeCanvas.getContext('2d');
      beforeCtx.save();
      beforeCtx.imageSmoothingEnabled = true;
      beforeCtx.imageSmoothingQuality = 'high';

      if (isRaw && orientation !== 1) {
        switch (orientation) {
          case 2: beforeCtx.transform(-1, 0, 0, 1, W, 0); break;
          case 3: beforeCtx.transform(-1, 0, 0, -1, W, H); break;
          case 4: beforeCtx.transform(1, 0, 0, -1, 0, H); break;
          case 5: beforeCtx.transform(0, 1, 1, 0, 0, 0); break;
          case 6: beforeCtx.transform(0, 1, -1, 0, W, 0); break;
          case 7: beforeCtx.transform(0, -1, -1, 0, W, H); break;
          case 8: beforeCtx.transform(0, -1, 1, 0, 0, H); break;
        }
      }

      if (isRaw && orientation >= 5 && orientation <= 8) {
        beforeCtx.drawImage(img, 0, 0, H, W);
      } else {
        beforeCtx.drawImage(img, 0, 0, W, H);
      }
      beforeCtx.restore();

      setBatchPreviewOrigUrl(beforeCanvas.toDataURL('image/jpeg', 0.92));

      let canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      let ctx = canvas.getContext('2d');

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (isRaw && orientation !== 1) {
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, W, 0); break;
          case 3: ctx.transform(-1, 0, 0, -1, W, H); break;
          case 4: ctx.transform(1, 0, 0, -1, 0, H); break;
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
          case 6: ctx.transform(0, 1, -1, 0, W, 0); break;
          case 7: ctx.transform(0, -1, -1, 0, W, H); break;
          case 8: ctx.transform(0, -1, 1, 0, 0, H); break;
        }
      }

      if (isRaw && orientation >= 5 && orientation <= 8) {
        ctx.drawImage(img, 0, 0, H, W);
      } else {
        ctx.drawImage(img, 0, 0, W, H);
      }
      ctx.restore();

      if (batchAutoContrast) applyAutoContrast(ctx, W, H);
      if (batchAutoLevels) applyAutoLevels(ctx, W, H);
      if (batchDenoise) applyNoiseReduction(canvas, ctx, W, H, batchDenoiseAmt);
      if (batchSharpen) applyUnsharpMask(canvas, ctx, W, H, batchSharpenAmt, batchSharpenRad);

      if (batchAiBeauty) {
        let mask = null;
        if (batchAiBeautyUseMask) {
          mask = await createSkinMask(canvas);
        }
        await applyBeautyPipeline(canvas, ctx, W, H, batchAiBeautySmooth, batchAiBeautyClarity, batchAiBeautyGlow, mask);
      }

      if (batchAiUpscale) {
        canvas = await applyUpscalePipeline(canvas, batchAiScale);
        W = canvas.width;
        H = canvas.height;
        ctx = canvas.getContext('2d');
      }

      if (batchLogo) {
        const isPortrait = H > W;
        const logoW = W * (isPortrait ? batchLogoScalePortrait : batchLogoScale);
        const logoH = (batchLogo.height / batchLogo.width) * logoW;
        const m = Math.round(batchLogoMargin * scale * (batchAiUpscale ? batchAiScale : 1));
        const positions = {
          'top-left': { x: m, y: m }, 'top-center': { x: (W - logoW) / 2, y: m }, 'top-right': { x: W - logoW - m, y: m },
          'center-left': { x: m, y: (H - logoH) / 2 }, 'center': { x: (W - logoW) / 2, y: (H - logoH) / 2 }, 'center-right': { x: W - logoW - m, y: (H - logoH) / 2 },
          'bottom-left': { x: m, y: H - logoH - m }, 'bottom-center': { x: (W - logoW) / 2, y: H - logoH - m }, 'bottom-right': { x: W - logoW - m, y: H - logoH - m },
        };
        const { x, y } = positions[batchLogoPos] || positions['bottom-right'];
        ctx.globalAlpha = batchLogoOpacity;
        ctx.drawImage(batchLogo, x, y, logoW, logoH);
        ctx.globalAlpha = 1;
      }

      setBatchPreviewAfterUrl(canvas.toDataURL('image/jpeg', 0.92));
    } catch (e) {
      console.error('Preview failed', e);
      addBatchLog(`❌ Preview failed: ${e.message || e}`, 'error');
      if (e.stack) {
        addBatchLog(`Stack: ${e.stack.split('\n').slice(0, 2).join(' ')}`, 'error');
      }
    }
    setBatchPreviewLoading(false);
  }, [batchImages, batchRawFiles, batchSection, filters, batchAutoContrast, batchAutoLevels, batchDenoise, batchDenoiseAmt,
    batchSharpen, batchSharpenAmt, batchSharpenRad, batchLogo, batchLogoScale, batchLogoScalePortrait,
    batchLogoOpacity, batchLogoPos, batchLogoMargin, batchResizeMode,
    batchAiBeauty, batchAiBeautySmooth, batchAiBeautyClarity, batchAiBeautyGlow,
    batchAiUpscale, batchAiScale, batchAiFaceRestore, batchAiBeautyUseMask]);

  const handleBatchProcess = async (startIndex = 0) => {
    if (typeof startIndex !== 'number') {
      startIndex = 0;
    }
    if (!sourceHandle || !outputHandle || batchImages.length === 0) {
      alert('Select source & output folders with at least one image.');
      return;
    }
    const hasPermission = await verifyWritePermission(outputHandle);
    if (!hasPermission) {
      addBatchLog("❌ Write permission denied for the output folder.", "error");
      alert("Write permission is required for the output folder to save processed files.");
      return;
    }
    if (startIndex === 0) {
      addBatchLog(`🚀 Starting batch process for ${batchImages.length} images...`, "info");
      setBatchProcessing(true);
      setBatchDone(false);
      setBatchCancelRequested(false);
      batchCancelRef.current = false;
      setBatchStats({ saved: 0, failed: 0 });
    }
    setBatchProgress({ current: startIndex, total: batchImages.length, currentFile: startIndex > 0 ? batchProgress.currentFile : "" });

    const cssFilterStr = toCSSFilter(filters);
    const fmtMime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const fmtExt = { jpeg: "jpg", png: "png", webp: "webp" };
    const mime = fmtMime[batchOutputFmt];
    const ext = fmtExt[batchOutputFmt];
    const quality = batchOutputFmt === "png" ? undefined : batchOutputQ / 100;

    for (let i = startIndex; i < batchImages.length; i++) {
      if (batchCancelRef.current) {
        addBatchLog("🛑 Batch processing cancelled by user.", "warning");
        setBatchProcessing(false);
        setBatchCancelRequested(false);
        setBatchConfirmData(null);
        return;
      }
      const { name, file } = batchImages[i];
      setBatchProgress({ current: i + 1, total: batchImages.length, currentFile: name });
      try {
        const img = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = e.target.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let { W, H } = calcBatchDims(
          img.naturalWidth, img.naturalHeight,
          batchResizeMode, batchResizePreset,
          batchCustomW, batchCustomH,
          batchKeepAspect, batchLongEdgePx
        );

        let canvas = canvasRef.current;
        canvas.width = W; canvas.height = H;
        let ctx = canvas.getContext('2d');

        ctx.filter = cssFilterStr;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, W, H);
        ctx.filter = 'none';

        if (filters.temperature !== 0) {
          const a = Math.abs(filters.temperature) / 300;
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = filters.temperature > 0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (filters.fade > 0) {
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255,255,255,${filters.fade / 180})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (filters.vignette > 0) {
          const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }

        if (batchAutoContrast) applyAutoContrast(ctx, W, H);
        if (batchAutoLevels) applyAutoLevels(ctx, W, H);
        if (batchDenoise) applyNoiseReduction(canvas, ctx, W, H, batchDenoiseAmt);
        if (batchSharpen) applyUnsharpMask(canvas, ctx, W, H, batchSharpenAmt, batchSharpenRad);

        if (batchAiFaceRestore) {
          try {
            const restoredUrl = await restoreFaceLocal(canvas);
            const restoredImg = await loadImageFromSrc(restoredUrl);
            ctx.drawImage(restoredImg, 0, 0, W, H);
          } catch (e) {
            console.error("Batch Face Restore Error:", e);
          }
        }

        if (batchAiBeauty) {
          let mask = null;
          if (batchAiBeautyUseMask) {
            mask = await createSkinMask(canvas);
          }
          await applyBeautyPipeline(canvas, ctx, W, H, batchAiBeautySmooth, batchAiBeautyClarity, batchAiBeautyGlow, mask);
        }

        if (batchAiUpscale) {
          canvas = await applyUpscalePipeline(canvas, batchAiScale);
          W = canvas.width;
          H = canvas.height;
          ctx = canvas.getContext('2d');
        }

        if (batchLogo) {
          const isPortrait = H > W;
          const logoW = W * (isPortrait ? batchLogoScalePortrait : batchLogoScale);
          const logoH = (batchLogo.height / batchLogo.width) * logoW;
          const m = batchLogoMargin;
          const positions = {
            'top-left': { x: m, y: m },
            'top-right': { x: W - logoW - m, y: m },
            'top-center': { x: (W - logoW) / 2, y: m },
            'bottom-left': { x: m, y: H - logoH - m },
            'bottom-right': { x: W - logoW - m, y: H - logoH - m },
            'bottom-center': { x: (W - logoW) / 2, y: H - logoH - m },
            'center': { x: (W - logoW) / 2, y: (H - logoH) / 2 },
          };
          const { x, y } = positions[batchLogoPos] || positions['bottom-right'];
          ctx.globalAlpha = batchLogoOpacity;
          ctx.drawImage(batchLogo, x, y, logoW, logoH);
          ctx.globalAlpha = 1.0;
        }

        const base = name.replace(/\.[^.]+$/, '');
        const outName = `${batchPrefix}${base}${batchSuffix}.${ext}`;

        const blob = await canvasToBlob(canvas, mime, quality);
        if (!blob) {
          addBatchLog(`❌ Error processing ${name}: Failed to generate image blob`, "error");
          setBatchStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          continue;
        }
        const newFile = await outputHandle.getFileHandle(outName, { create: true });
        const writable = await newFile.createWritable();
        await writable.write(blob);
        await writable.close();
        addBatchLog(`✅ Successfully saved: ${outName}`, "success");
        setBatchStats(prev => ({ ...prev, saved: prev.saved + 1 }));

        if (i === 0 && batchConfirmFirst && batchImages.length > 1) {
          const previewUrl = canvas.toDataURL('image/jpeg', 0.92);
          setBatchConfirmData({
            name: outName,
            url: previewUrl,
            isRaw: false,
            nextIndex: 1,
            total: batchImages.length
          });
          addBatchLog(`🔍 First image processed. Awaiting user confirmation to continue...`, "info");
          return;
        }
      } catch (err) {
        addBatchLog(`❌ Error processing ${name}: ${err.message}`, "error");
        console.error(`Failed processing ${name}`, err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          addBatchLog(`🛑 Batch process aborted: Directory write permission lost or revoked.`, "error");
          const remaining = batchImages.length - i;
          setBatchStats(prev => ({ ...prev, failed: prev.failed + remaining }));
          setBatchProcessing(false);
          setBatchDone(true);
          return;
        } else {
          setBatchStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
    }

    addBatchLog("🏁 Batch process complete.", "success");
    setBatchProcessing(false);
    setBatchDone(true);
  };

  const handleRawBatchProcess = async (startIndex = 0) => {
    if (typeof startIndex !== 'number') {
      startIndex = 0;
    }
    if (!outputHandle || batchRawFiles.length === 0) {
      addBatchLog("⚠️ Processing aborted: Missing output folder or files.", "warning");
      alert('Select output folder & add RAW files first.');
      return;
    }
    const hasPermission = await verifyWritePermission(outputHandle);
    if (!hasPermission) {
      addBatchLog("❌ Write permission denied for the output folder.", "error");
      alert("Write permission is required for the output folder to save processed files.");
      return;
    }
    
    if (startIndex === 0) {
      addBatchLog(`🚀 Starting RAW batch process for ${batchRawFiles.length} files...`, "info");
      setBatchProcessing(true);
      setBatchDone(false);
      setBatchCancelRequested(false);
      batchCancelRef.current = false;
      setBatchStats({ saved: 0, failed: 0 });
    }
    setBatchProgress({ current: startIndex, total: batchRawFiles.length, currentFile: startIndex > 0 ? batchProgress.currentFile : "" });

    const cssFilterStr = toCSSFilter(filters);
    const fmtMime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const fmtExt = { jpeg: "jpg", png: "png", webp: "webp" };
    const mime = fmtMime[batchOutputFmt];
    const ext = fmtExt[batchOutputFmt];
    const quality = batchOutputFmt === "png" ? undefined : batchOutputQ / 100;

    for (let i = startIndex; i < batchRawFiles.length; i++) {
      if (batchCancelRef.current) {
        addBatchLog("🛑 RAW Batch processing cancelled by user.", "warning");
        setBatchProcessing(false);
        setBatchCancelRequested(false);
        setBatchConfirmData(null);
        return;
      }
      const { name, previewUrl } = batchRawFiles[i];
      setBatchProgress({ current: i + 1, total: batchRawFiles.length, currentFile: name });
      
      try {
        addBatchLog(`[${i+1}/${batchRawFiles.length}] Processing ${name}...`, "info");
        
        let sourceImg = null;
        let orientation = 1;
        
        if (batchRawFiles[i].canvas) {
          addBatchLog(`  -> Using pre-rendered canvas for ${name}`, "info");
          sourceImg = batchRawFiles[i].canvas;
        } else if (previewUrl) {
          addBatchLog(`  -> Loading preview image for ${name}...`, "info");
          sourceImg = await loadImageFromSrc(previewUrl);
          orientation = batchRawFiles[i].metadata?.orientation || 1;
          addBatchLog(`  -> Preview loaded: ${sourceImg.naturalWidth}x${sourceImg.naturalHeight} (Orient: ${orientation})`, "info");
        } else if (batchRawFiles[i].file) {
          addBatchLog(`  -> JIT Decoding ${name}...`, "info");
          const buffer = await batchRawFiles[i].file.arrayBuffer();
          const result = await decodeRaw(buffer, (msg) => addBatchLog(`[${name}] ${msg}`, "info"));
          orientation = result.orientation || 1;
          addBatchLog(`  -> JIT Decode finished. Loading buffer image (Orient: ${orientation})...`, "info");
          try {
            sourceImg = await loadImageFromSrc(result.url);
          } finally {
            if (result.url && result.url.startsWith('blob:')) {
              URL.revokeObjectURL(result.url);
            }
          }
        }

        if (!sourceImg) {
          throw new Error("Could not load source image");
        }

        let sW = sourceImg.naturalWidth || sourceImg.width;
        let sH = sourceImg.naturalHeight || sourceImg.height;

        if (orientation >= 5 && orientation <= 8) {
          const t = sW; sW = sH; sH = t;
        }

        addBatchLog(`  -> Calculating output dimensions...`, "info");
        let { W, H } = calcBatchDims(
          sW, sH,
          batchResizeMode, batchResizePreset,
          batchCustomW, batchCustomH,
          batchKeepAspect, batchLongEdgePx
        );
        addBatchLog(`  -> Output size: ${W}x${H}`, "info");

        addBatchLog(`  -> Preparing canvas and context...`, "info");
        let canvas = canvasRef.current;
        if (!canvas) {
          addBatchLog(`  ⚠️ Canvas ref is missing! Creating fallback...`, "warning");
          canvas = document.createElement('canvas');
        }
        canvas.width = W; canvas.height = H;
        let ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");

        addBatchLog(`  -> Drawing and applying adjustments...`, "info");
        ctx.save();
        ctx.filter = cssFilterStr;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (orientation !== 1) {
          switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, W, 0); break;
            case 3: ctx.transform(-1, 0, 0, -1, W, H); break;
            case 4: ctx.transform(1, 0, 0, -1, 0, H); break;
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: ctx.transform(0, 1, -1, 0, W, 0); break;
            case 7: ctx.transform(0, -1, -1, 0, W, H); break;
            case 8: ctx.transform(0, -1, 1, 0, 0, H); break;
          }
        }

        if (orientation >= 5 && orientation <= 8) {
          ctx.drawImage(sourceImg, 0, 0, H, W);
        } else {
          ctx.drawImage(sourceImg, 0, 0, W, H);
        }
        
        ctx.restore();

        // Apply Temperature/Tint/Fade/Vignette/etc.
        if (filters.temperature !== 0) {
          const a = Math.abs(filters.temperature) / 300;
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = filters.temperature > 0 ? `rgba(255,140,0,${a})` : `rgba(100,149,237,${a})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (filters.fade > 0) {
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255,255,255,${filters.fade / 180})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (filters.vignette > 0) {
          const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }

        if (batchAutoContrast) {
          addBatchLog(`  -> Applying Auto Contrast...`, "info");
          applyAutoContrast(ctx, W, H);
        }
        if (batchAutoLevels) {
          addBatchLog(`  -> Applying Auto Levels...`, "info");
          applyAutoLevels(ctx, W, H);
        }
        if (batchDenoise) {
          addBatchLog(`  -> Applying Noise Reduction (${batchDenoiseAmt})...`, "info");
          applyNoiseReduction(canvas, ctx, W, H, batchDenoiseAmt);
        }
        if (batchSharpen) {
          addBatchLog(`  -> Applying Sharpening (${batchSharpenAmt})...`, "info");
          applyUnsharpMask(canvas, ctx, W, H, batchSharpenAmt, batchSharpenRad);
        }

        if (batchAiFaceRestore) {
          addBatchLog(`  -> Running AI Face Restore...`, "info");
          try {
            const restoredUrl = await restoreFaceLocal(canvas);
            const restoredImg = await loadImageFromSrc(restoredUrl);
            ctx.drawImage(restoredImg, 0, 0, W, H);
            addBatchLog(`  -> Face Restore finished.`, "success");
          } catch (e) { 
            addBatchLog(`  ⚠️ Face Restore failed: ${e.message}`, "warning");
            console.error("Batch Face Restore Error:", e); 
          }
        }

        if (batchAiBeauty) {
          addBatchLog(`  -> Running AI Beauty (Smooth:${batchAiBeautySmooth})...`, "info");
          let mask = null;
          if (batchAiBeautyUseMask) mask = await createSkinMask(canvas);
          await applyBeautyPipeline(canvas, ctx, W, H, batchAiBeautySmooth, batchAiBeautyClarity, batchAiBeautyGlow, mask);
          addBatchLog(`  -> AI Beauty finished.`, "success");
        }

        if (batchAiUpscale) {
          canvas = await applyUpscalePipeline(canvas, batchAiScale);
          W = canvas.width; H = canvas.height;
          ctx = canvas.getContext('2d');
        }

        if (batchLogo) {
          const isPortrait = H > W;
          const logoW = W * (isPortrait ? batchLogoScalePortrait : batchLogoScale);
          const logoH = (batchLogo.height / batchLogo.width) * logoW;
          const m = batchLogoMargin;
          const positions = {
            'top-left': { x: m, y: m },
            'top-right': { x: W - logoW - m, y: m },
            'top-center': { x: (W - logoW) / 2, y: m },
            'bottom-left': { x: m, y: H - logoH - m },
            'bottom-right': { x: W - logoW - m, y: H - logoH - m },
            'bottom-center': { x: (W - logoW) / 2, y: H - logoH - m },
            'center': { x: (W - logoW) / 2, y: (H - logoH) / 2 },
          };
          const { x, y } = positions[batchLogoPos] || positions['bottom-right'];
          ctx.globalAlpha = batchLogoOpacity;
          ctx.drawImage(batchLogo, x, y, logoW, logoH);
          ctx.globalAlpha = 1.0;
        }

        const base = name.replace(/\.[^.]+$/, '');
        const outName = `${batchPrefix}${base}${batchSuffix}.${ext}`;

        addBatchLog(`  -> Converting canvas to ${ext.toUpperCase()} blob...`, "info");
        const blob = await canvasToBlob(canvas, mime, quality);
        if (blob) {
          addBatchLog(`  -> Blob created (${Math.round(blob.size/1024)} KB). Writing to disk...`, "info");
          const newFile = await outputHandle.getFileHandle(outName, { create: true });
          const writable = await newFile.createWritable();
          await writable.write(blob);
          await writable.close();
          addBatchLog(`✅ Successfully saved: ${outName}`, "success");
          setBatchStats(prev => ({ ...prev, saved: prev.saved + 1 }));

          if (i === 0 && batchConfirmFirst && batchRawFiles.length > 1) {
            const previewUrl = canvas.toDataURL('image/jpeg', 0.92);
            setBatchConfirmData({
              name: outName,
              url: previewUrl,
              isRaw: true,
              nextIndex: 1,
              total: batchRawFiles.length
            });
            addBatchLog(`🔍 First RAW image processed. Awaiting user confirmation to continue...`, "info");
            return;
          }
        } else {
          addBatchLog(`❌ Error processing ${name}: Failed to generate image blob`, "error");
          setBatchStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      } catch (err) { 
        addBatchLog(`❌ Error processing ${name}: ${err.message}`, "error");
        console.error(`Failed processing ${name}`, err); 
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          addBatchLog(`🛑 RAW Batch process aborted: Directory write permission lost or revoked.`, "error");
          const remaining = batchRawFiles.length - i;
          setBatchStats(prev => ({ ...prev, failed: prev.failed + remaining }));
          setBatchProcessing(false);
          setBatchDone(true);
          return;
        } else {
          setBatchStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
    }
    addBatchLog("🏁 RAW Batch process complete.", "success");
    setBatchProcessing(false);
    setBatchDone(true);
  };

  const handleCancelBatch = () => {
    addBatchLog("🛑 Cancellation requested. Finishing current image and stopping...", "warning");
    setBatchCancelRequested(true);
    batchCancelRef.current = true;
  };

  const continueBatchProcess = () => {
    const data = batchConfirmData;
    setBatchConfirmData(null);
    if (!data) return;
    if (data.isRaw) {
      handleRawBatchProcess(data.nextIndex);
    } else {
      handleBatchProcess(data.nextIndex);
    }
  };

  const cancelBatchProcess = () => {
    addBatchLog("🛑 Batch run cancelled by user.", "warning");
    setBatchProcessing(false);
    setBatchCancelRequested(false);
    setBatchConfirmData(null);
    batchCancelRef.current = true;
  };

  const batchPreviewTimerRef = useRef(null);
  useEffect(() => {
    if (!batchPreviewOpen || batchPreviewIdx === null) return;
    clearTimeout(batchPreviewTimerRef.current);
    batchPreviewTimerRef.current = setTimeout(() => {
      generateBatchPreview(batchPreviewIdx);
    }, 300);
    return () => clearTimeout(batchPreviewTimerRef.current);
  }, [
    batchAutoContrast, batchAutoLevels,
    batchDenoise, batchDenoiseAmt,
    batchSharpen, batchSharpenAmt, batchSharpenRad,
    batchLogo, batchLogoScale, batchLogoScalePortrait, batchLogoOpacity, batchLogoPos, batchLogoMargin,
    batchPreviewOpen, batchPreviewIdx,
    generateBatchPreview,
  ]);



  const canvasToDataUrl = useCallback((canvas, quality = 0.92) => {
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(canvas.width, canvas.height));
    if (scale < 1) {
      const tmp = document.createElement('canvas');
      tmp.width = Math.round(canvas.width * scale);
      tmp.height = Math.round(canvas.height * scale);
      tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height);
      return tmp.toDataURL('image/jpeg', quality);
    }
    return canvas.toDataURL('image/jpeg', quality);
  }, []);

  const falRun = useCallback(async (modelId, input, onLog) => {
    const key = falApiKey.trim();
    const headers = { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' };

    onLog?.('Submitting to fal.ai queue…');
    const submitRes = await fetch(`https://queue.fal.run/${modelId}`, {
      method: 'POST', headers, body: JSON.stringify(input),
    });
    if (!submitRes.ok) {
      const txt = await submitRes.text();
      throw new Error(`Submit failed (${submitRes.status}): ${txt}`);
    }
    const { request_id } = await submitRes.json();

    onLog?.('Job queued — waiting for GPU…');
    const statusUrl = `https://queue.fal.run/${modelId}/requests/${request_id}/status`;
    const resultUrl = `https://queue.fal.run/${modelId}/requests/${request_id}`;

    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const sRes = await fetch(statusUrl, { headers });
      const s = await sRes.json();
      if (s.status === 'COMPLETED') {
        const rRes = await fetch(resultUrl, { headers });
        return await rRes.json();
      }
      if (s.status === 'FAILED') throw new Error(s.error || 'Job failed on fal.ai server');
      if (s.status === 'IN_QUEUE') onLog?.(`In queue — position ${s.queue_position ?? '…'}`);
      if (s.status === 'IN_PROGRESS') onLog?.('Running on GPU…');
    }
    throw new Error('Timed out after 5 minutes');
  }, [falApiKey]);

  const runFalModel = useCallback(async (modelId, extraInput, setStatus, setResult, setLog) => {
    if (!falApiKey.trim()) { alert('Enter your fal.ai API key in the Tools tab first.'); return; }
    if (!image) { alert('Upload a photo first.'); return; }
    setStatus('loading'); setResult(null); setLog('Preparing image…');
    try {
      const srcImg = imgRef.current;
      const W = srcImg.naturalWidth, H = srcImg.naturalHeight;
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const ctx = tmp.getContext('2d');
      ctx.filter = toCSSFilter(filters);
      ctx.drawImage(srcImg, 0, 0, W, H);
      ctx.filter = 'none';
      const imageUrl = canvasToDataUrl(tmp);

      const result = await falRun(
        modelId,
        { image_url: imageUrl, ...extraInput },
        msg => setLog(msg)
      );
      const outUrl = result?.image?.url
        || result?.images?.[0]?.url
        || result?.output_image_url
        || result?.output?.[0]?.url;
      if (!outUrl) throw new Error(`No image URL in response: ${JSON.stringify(result).slice(0, 300)}`);
      setResult(outUrl); setStatus('done'); setLog('');
    } catch (e) {
      console.error('fal.ai error:', e);
      setStatus('error');
      setLog(e?.message || 'Request failed. Check your API key and try again.');
    }
  }, [falApiKey, image, filters, canvasToDataUrl, falRun]);

  const applyAiResult = useCallback(async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result);
      setFilters(DEFAULT_FILTERS); setRotation(0); setFlipH(false); setFlipV(false);
      setTexts([]); setBgStatus('idle'); setBgSubUrl(null); setBgResult(null);
    };
    reader.readAsDataURL(blob);
  }, []);

  const initMaskCanvas = useCallback(() => {
    const mc = maskCanvasRef.current;
    const img = imgRef.current;
    if (!mc || !img) return;
    mc.width = img.naturalWidth;
    mc.height = img.naturalHeight;
    const ctx = mc.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, mc.width, mc.height);
    setAiMaskReady(false);
  }, []);

  const drawMask = useCallback((e, canvas) => {
    if (!maskDrawingRef.current) return;
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = mc.width / rect.width;
    const scaleY = mc.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, aiRemoveBrush * scaleX, 0, Math.PI * 2);
    ctx.fill();
    setAiMaskReady(true);
  }, [aiRemoveBrush]);

  const handleAiRemove = useCallback(async () => {
    if (!aiMaskReady) { alert('Paint over the area to remove first.'); return; }
    const mc = maskCanvasRef.current;
    if (!mc) return;
    if (!claidApiKey.trim()) { alert('Enter your Claid.ai API key first.'); return; }
    if (!image) return;
    setAiRemoveStatus('loading'); setAiRemoveResult(null); setAiRemoveLog('Preparing image…');
    try {
      const srcImg = await loadImageFromSrc(image);
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = srcImg.naturalWidth; tmpCanvas.height = srcImg.naturalHeight;
      const tCtx = tmpCanvas.getContext('2d');
      tCtx.filter = toCSSFilter(filters);
      tCtx.drawImage(srcImg, 0, 0);
      tCtx.filter = 'none';

      const [imgBlob, maskBlob] = await Promise.all([
        canvasToBlob(tmpCanvas, 'image/jpeg', 0.95),
        canvasToBlob(mc, 'image/png'),
      ]);

      setAiRemoveLog('Uploading to Claid.ai…');
      const form = new FormData();
      form.append('image', imgBlob, 'photo.jpg');
      form.append('mask', maskBlob, 'mask.png');
      form.append('operations', JSON.stringify([{ operation: 'inpaint' }]));

      const res = await fetch('https://api.claid.ai/v1-beta1/image/edit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${claidApiKey.trim()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || `Claid error ${res.status}`);
      const outUrl = data?.data?.output?.tmp_url || data?.data?.output?.url;
      if (!outUrl) throw new Error(`No URL in response: ${JSON.stringify(data).slice(0, 200)}`);
      setAiRemoveResult(outUrl); setAiRemoveStatus('done'); setAiRemoveLog('');
    } catch (e) {
      console.error(e); setAiRemoveStatus('error');
      setAiRemoveLog(e?.message || 'Failed. Check your Claid.ai API key.');
    }
  }, [aiMaskReady, claidApiKey, image, filters]);

  const applyUpscalePipeline = async (sourceCanvas, scale, onProgress) => {
    const natW = sourceCanvas.width;
    const natH = sourceCanvas.height;
    const passes = scale;
    let currentCanvas = sourceCanvas;

    for (let pass = 0; pass < passes; pass++) {
      const passW = Math.round(natW * ((pass + 1) / passes) * scale);
      const passH = Math.round(natH * ((pass + 1) / passes) * scale);
      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = passW; nextCanvas.height = passH;
      const ctx = nextCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(currentCanvas, 0, 0, passW, passH);
      if (pass < passes - 1) {
        applyUnsharpMask(nextCanvas, ctx, passW, passH, 0.6, 1.2);
      } else {
        applyUnsharpMask(nextCanvas, ctx, passW, passH, 0.9, 1.5);
      }
      currentCanvas = nextCanvas;
      if (onProgress) onProgress(pass + 1, passes);
      await new Promise(r => setTimeout(r, 10));
    }
    return currentCanvas;
  };

  const applyBeautyPipeline = async (canvas, ctx, W, H, smooth, clarity, glow, maskCanvas = null) => {
    // If mask provided, we apply effects to a separate canvas and then composite
    let targetCtx = ctx;
    let targetCanvas = canvas;

    if (maskCanvas) {
      targetCanvas = document.createElement('canvas');
      targetCanvas.width = W;
      targetCanvas.height = H;
      targetCtx = targetCanvas.getContext('2d');
      targetCtx.drawImage(canvas, 0, 0);
    }

    if (smooth > 0) applyNoiseReduction(targetCanvas, targetCtx, W, H, smooth * 0.5);
    applyAutoLevels(targetCtx, W, H);
    targetCtx.globalCompositeOperation = 'overlay';
    targetCtx.fillStyle = `rgba(255,200,150,${glow * 0.012})`;
    targetCtx.fillRect(0, 0, W, H);
    targetCtx.globalCompositeOperation = 'source-over';

    if (clarity > 0) applyUnsharpMask(targetCanvas, targetCtx, W, H, clarity * 0.15, 1.2);

    if (glow > 0) {
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = W; glowCanvas.height = H;
      const gCtx = glowCanvas.getContext('2d');
      gCtx.filter = `blur(${Math.round(glow * 3)}px) brightness(1.15)`;
      gCtx.drawImage(targetCanvas, 0, 0);
      gCtx.filter = 'none';
      targetCtx.globalCompositeOperation = 'screen';
      targetCtx.globalAlpha = glow * 0.025;
      targetCtx.drawImage(glowCanvas, 0, 0);
      targetCtx.globalAlpha = 1; targetCtx.globalCompositeOperation = 'source-over';
    }

    if (maskCanvas) {
      // Mask the targetCanvas with the face mask
      targetCtx.globalCompositeOperation = 'destination-in';
      targetCtx.drawImage(maskCanvas, 0, 0);
      targetCtx.globalCompositeOperation = 'source-over';

      // Draw the masked result back onto the original canvas
      ctx.drawImage(targetCanvas, 0, 0);
    }
  };

  const runBrowserUpscale = useCallback(async () => {
    if (!image) return;
    setAiUpscaleStatus('loading'); setAiUpscaleResult(null); setAiUpscaleLog('Loading image…'); setAiUpscaleProgress(10);
    try {
      const src = bgResult || image;
      const srcImg = await loadImageFromSrc(src);
      const natW = srcImg.naturalWidth, natH = srcImg.naturalHeight;
      const targetW = natW * aiScale, targetH = natH * aiScale;

      setAiUpscaleLog(`Upscaling ${natW}×${natH} → ${targetW}×${targetH} in ${aiScale} passes…`);

      let currentCanvas = document.createElement('canvas');
      currentCanvas.width = natW; currentCanvas.height = natH;
      const initCtx = currentCanvas.getContext('2d');
      initCtx.filter = toCSSFilter(filters);
      initCtx.drawImage(srcImg, 0, 0, natW, natH);
      initCtx.filter = 'none';

      const finalCanvas = await applyUpscalePipeline(currentCanvas, aiScale, (pass, total) => {
        setAiUpscaleProgress(Math.round((pass / total) * 90) + 5);
      });

      setAiUpscaleProgress(98); setAiUpscaleLog('Encoding result…');
      const resultUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
      const W = finalCanvas.width, H = finalCanvas.height;
      const approxKb = Math.round((resultUrl.length * 0.75) / 1024);
      setAiUpscaleResultSize(`${W.toLocaleString()}×${H.toLocaleString()}px · ~${approxKb > 1024 ? (approxKb / 1024).toFixed(1) + 'MB' : approxKb + 'KB'}`);
      setAiUpscaleResult(resultUrl);
      setAiUpscaleStatus('done'); setAiUpscaleLog(''); setAiUpscaleProgress(100);
    } catch (e) {
      console.error('Upscale error:', e);
      setAiUpscaleStatus('error'); setAiUpscaleLog(e.message || 'Upscale failed');
    }
  }, [image, bgResult, filters, aiScale]);

  const runBrowserBeauty = useCallback(async () => {
    if (!image) return;
    setAiBeautyStatus('loading'); setAiBeautyResult(null); setAiBeautyLog('Processing…');
    try {
      const src = bgResult || image;
      const srcImg = await loadImageFromSrc(src);
      const W = srcImg.naturalWidth, H = srcImg.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      ctx.filter = toCSSFilter(filters);
      ctx.drawImage(srcImg, 0, 0, W, H);
      ctx.filter = 'none';

      let mask = null;
      if (aiBeautyUseMask) {
        setAiBeautyLog('Detecting faces...');
        mask = await createSkinMask(canvas);
      }

      setAiBeautyLog('Applying beauty filters...');
      await applyBeautyPipeline(canvas, ctx, W, H, aiBeautySmooth, aiBeautyClarity, aiBeautyGlow, mask);

      setAiBeautyResult(canvas.toDataURL('image/jpeg', 0.95));
      setAiBeautyStatus('done'); setAiBeautyLog('');
    } catch (e) {
      console.error('Beauty error:', e);
      setAiBeautyStatus('error'); setAiBeautyLog(e.message || 'Beauty filter failed');
    }
  }, [image, bgResult, filters, aiBeautySmooth, aiBeautyClarity, aiBeautyGlow, aiBeautyUseMask]);

  const runFalFaceRestore = useCallback(async () => {
    if (!image) { alert('Upload a photo first.'); return; }
    setAiFaceRestoreStatus('loading'); setAiFaceRestoreResult(null); setAiFaceRestoreLog('Starting face restore…');
    try {
      const srcImg = imgRef.current;
      const W = srcImg.naturalWidth, H = srcImg.naturalHeight;
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const ctx = tmp.getContext('2d');
      ctx.drawImage(srcImg, 0, 0, W, H);

      const resultUrl = await restoreFaceLocal(tmp, msg => setAiFaceRestoreLog(msg));
      setAiFaceRestoreResult(resultUrl);
      setAiFaceRestoreStatus('done'); setAiFaceRestoreLog('');
    } catch (e) {
      console.error('Face Restore error:', e);
      setAiFaceRestoreStatus('error');
      setAiFaceRestoreLog(e.message || 'Face restoration failed');
    }
  }, [image]);

  const dm = darkMode;
  const cardBg = dm ? '#2a2a2a' : '#f8f8fd';
  const cardBdr = dm ? '#3a3a3a' : '#e8e8f0';
  const inputSt = { width: "100%", padding: "8px 10px", border: `1.5px solid ${cardBdr}`, borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", outline: "none", background: dm ? '#1e1e1e' : '#fff', color: dm ? '#ddd' : '#1a1a1a' };

  const renderPanel = (inline = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: inline ? "10px 14px 40px" : "14px", background: dm ? '#1e1e1e' : '#fff', color: dm ? '#ddd' : '#1a1a1a', transition: 'background .3s,color .3s' }}>
      {activeTab === "tools" && (
        <ToolsPanel {...{ image, handleRemoveBg, bgStatus, bgProgress, bgSubUrl, bgMode, setBgMode, cardBdr, cardBg, dm, bgColor, setBgColor, bgBlur, setBgBlur, bgResult, saveFile, falApiKey, saveFalKey, claidApiKey, saveClaidKey, aiRemoveBrush, setAiRemoveBrush, toCSSFilter, filters, initMaskCanvas, maskCanvasRef, maskDrawingRef, drawMask, aiMaskReady, handleAiRemove, aiRemoveStatus, aiRemoveLog, aiRemoveResult, applyAiResult }} />
      )}
      {activeTab === "adjust" && (
        <AdjustPanel {...{ image, setRotation, setFlipH, setFlipV, rotation, flipH, flipV, cropMode, setCropMode, setCropBox, cropAspect, setCropAspect, applyCrop, dm, cardBg, cardBdr }} />
      )}
      {activeTab === "overlay" && (
        <OverlayPanel {...{ image, texts, selText, setSelText, addText, deleteText, updateText, dm, cardBg, cardBdr, inputSt }} />
      )}
      {activeTab === "edit" && (
        <EditPanel {...{ filters, setFilters, filterGroup, setFilterGroup, isEdited, resetAll, dm, cardBdr, cardBg, image, runBrowserUpscale, aiUpscaleStatus, aiUpscaleLog, aiUpscaleProgress, aiUpscaleResult, aiUpscaleResultSize, applyAiResult, runBrowserBeauty, aiBeautyStatus, aiBeautyLog, aiBeautyResult, saveFile, aiScale, setAiScale, aiBeautySmooth, setAiBeautySmooth, aiBeautyClarity, setAiBeautyClarity, aiBeautyGlow, setAiBeautyGlow, aiBeautyUseMask, setAiBeautyUseMask, runFalFaceRestore, aiFaceRestoreStatus, aiFaceRestoreLog, aiFaceRestoreResult }} />
      )}
      {activeTab === "batch" && (
        <div style={{ padding: "16px", color: dm ? '#aaa' : '#888', fontSize: "13px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📦</div>
          Batch mode opens as a full-page view.
        </div>
      )}
      {activeTab === "cull" && (
        <div style={{ padding: "16px", color: dm ? '#aaa' : '#888', fontSize: "13px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
          Cull AI mode opens as a full-page view.
        </div>
      )}
    </div>
  );

  return (
    <div className={dm ? 'app-bg-dark text-gray-200' : 'app-bg-light text-gray-800'} style={{ minHeight: "100vh", WebkitTapHighlightColor: "transparent" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
        .aperture-logo {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .aperture-logo:hover {
          transform: rotate(60deg) scale(1.08);
        }
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;background:linear-gradient(to right,#6c63ff var(--v,50%),#e0e0e8 var(--v,50%));cursor:pointer;touch-action:none;}
        .sl:active{cursor:grabbing}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#6c63ff;border:3px solid #fff;box-shadow:0 1px 6px rgba(108,99,255,.4);cursor:grab;will-change:transform;transition:transform .1s,box-shadow .1s}
        .sl:active::-webkit-slider-thumb{cursor:grabbing;transform:scale(1.18);box-shadow:0 2px 10px rgba(108,99,255,.55)}
        .sl::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#6c63ff;border:3px solid #fff;box-shadow:0 1px 6px rgba(108,99,255,.4);cursor:grab;transition:transform .1s}
        .sl:active::-moz-range-thumb{cursor:grabbing;transform:scale(1.18)}
        .sl::-webkit-slider-runnable-track{cursor:pointer}
        .sl:active::-webkit-slider-runnable-track{cursor:grabbing}
        button{touch-action:manipulation;font-family:inherit}
        .checker{background-image:linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}
        .drop{border:2px dashed #d0d0e0;cursor:pointer;transition:all .25s;border-radius:16px}
        .drop:hover,.drop.on{border-color:#6c63ff;background:rgba(108,99,255,.03)}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
      `}</style>

      <header className="glass-panel" style={{ height: "52px", padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }} onClick={() => setActiveTab("home")}>
          <ApertureLogo size={30} />
          <div style={{ fontSize: "17px", fontWeight: 900, color: dm ? '#ffffff' : '#0f172a', letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "2px", fontFamily: "'Outfit', sans-serif" }}>
            <span>PHOTO</span>
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg, #06b6d4, #6c63ff, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 900, paddingRight: "3px" }}>LAB</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {!isInstalled && (
            <button 
              onClick={handleInstallClick}
              style={{
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(250, 204, 21, 0.12) 100%)',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#f97316',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(249, 115, 22, 0.08)',
                fontFamily: "'Outfit', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.border = '1px solid rgba(249, 115, 22, 0.5)';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(249, 115, 22, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.border = '1px solid rgba(249, 115, 22, 0.35)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(249, 115, 22, 0.08)';
              }}
            >
              <span style={{ fontSize: '14px' }}>📱</span>
              <span style={{ 
                background: 'linear-gradient(135deg, #f97316, #facc15)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800
              }}>{isMobile ? 'Install' : 'Install App'}</span>
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', color: dm ? '#ffd43b' : '#666' }} title={dm ? 'Light Mode' : 'Dark Mode'}>
            {dm ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" fill="#ffd43b" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#666" />
              </svg>
            )}
          </button>
          <div style={{ display: "flex", background: dm ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', border: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, backdropFilter: "blur(8px)", borderRadius: "12px", padding: "3px", gap: "3px", overflowX: "auto" }}>
            {[["home", "Home"], ["edit", "Edit"], ["adjust", "Adjust"], ["overlay", "Overlay"], ["tools", "Tools"], ["cull", "Cull AI"], ["batch", "Batch"], ["account", user.tier === "pro" ? "⭐ Pro" : user.tier === "team" ? "💎 Team" : user.tier === "admin" ? "⚡ Admin" : "Account"]].map(([id, lb]) => {
              const isActive = activeTab === id;
              const isPremiumAccount = id === "account" && user.tier !== "free";
              const isAdmin = user.tier === "admin";
              
              // Custom colors for admin badge or standard premium badge
              const activeBorder = isAdmin 
                ? (isActive ? "1px solid #ef4444" : "1px solid rgba(239, 68, 68, 0.3)")
                : (isActive ? "1px solid #f97316" : "1px solid rgba(249, 115, 22, 0.3)");
                
              const activeBg = isAdmin
                ? (isActive ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(236,72,153,0.10))" : "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(236,72,153,0.04))")
                : (isActive ? "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(250,204,21,0.10))" : "linear-gradient(135deg, rgba(249,115,22,0.06), rgba(250,204,21,0.04))");
                
              const activeColor = isAdmin ? "#ef4444" : "#f97316";
              
              const activeShadow = isAdmin
                ? (isActive ? "0 0 12px rgba(239, 68, 68, 0.25)" : "none")
                : (isActive ? "0 0 12px rgba(249, 115, 22, 0.25)" : "none");

              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ 
                    padding: isMobile ? "5px 10px" : "6px 12px", 
                    fontSize: "12px", 
                    fontWeight: 600, 
                    border: isPremiumAccount ? activeBorder : "none", 
                    cursor: "pointer", 
                    background: isPremiumAccount
                      ? activeBg
                      : (isActive ? (dm ? '#333' : '#fff') : 'transparent'), 
                    color: isPremiumAccount
                      ? activeColor
                      : (isActive ? (dm ? '#fff' : '#1a1a2e') : (dm ? '#a1a1aa' : '#666677')), 
                    borderRadius: "9px", 
                    boxShadow: isPremiumAccount
                      ? activeShadow
                      : (isActive ? "0 2px 8px rgba(0,0,0,.08)" : "none"), 
                    transition: "all .2s", 
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                  {getTabIcon(id, isActive, dm)}
                  {!isMobile && <span>{lb}</span>}
                </button>
              );
            })}
          </div>
          {image && (
            <button onClick={() => setShowExport(true)}
              style={{ padding: "7px 14px", background: "linear-gradient(135deg,#6c63ff,#a78bfa)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(108,99,255,.3)", flexShrink: 0 }}>
              {isMobile ? "↓" : "↓ Export"}
            </button>
          )}
        </div>
      </header>

      {!isMobile && (
        activeTab === "home" ? (
          <LandingPage {...{ dm, loadImage, setActiveTab, handleInstallClick, deferredPrompt, isIOS, isInstalled }} onSelectPlan={(plan) => setCheckoutPlan(plan)} />
        ) : activeTab === "batch" ? (
          <BatchPage {...{ dm, cardBg, cardBdr, inputSt, user, setActiveTab, sourceHandle, outputHandle, batchImages, selectSourceFolder, selectRawSourceFolder, selectOutputFolder, batchResizeMode, setBatchResizeMode, batchResizePreset, setBatchResizePreset, batchCustomW, setBatchCustomW, batchCustomH, setBatchCustomH, batchKeepAspect, setBatchKeepAspect, batchLongEdgePx, setBatchLongEdgePx, batchAutoLevels, setBatchAutoLevels, batchAutoContrast, setBatchAutoContrast, batchSharpen, setBatchSharpen, batchSharpenAmt, setBatchSharpenAmt, batchSharpenRad, setBatchSharpenRad, batchDenoise, setBatchDenoise, batchDenoiseAmt, setBatchDenoiseAmt, batchLogo, setBatchLogo, batchLogoFile, setBatchLogoFile, handleBatchLogoUpload, batchLogoScale, setBatchLogoScale, batchLogoScalePortrait, setBatchLogoScalePortrait, batchLogoOpacity, setBatchLogoOpacity, batchLogoPos, setBatchLogoPos, batchLogoMargin, setBatchLogoMargin, batchOutputFmt, setBatchOutputFmt, batchOutputQ, setBatchOutputQ, batchPrefix, setBatchPrefix, batchSuffix, setBatchSuffix, batchProcessing, batchProgress, batchDone, handleBatchProcess, batchPreviewIdx, batchPreviewOrigUrl, batchPreviewAfterUrl, batchPreviewLoading, batchPreviewSplit, setBatchPreviewSplit, batchPreviewDragging, setBatchPreviewDragging, batchPreviewOpen, setBatchPreviewOpen, generateBatchPreview, filters, setFilters, resetAll, batchFilterGroup, setBatchFilterGroup, calcBatchDims, batchAiUpscale, setBatchAiUpscale, batchAiBeauty, setBatchAiBeauty, batchAiScale, setBatchAiScale, batchAiBeautySmooth, setBatchAiBeautySmooth, batchAiBeautyClarity, setBatchAiBeautyClarity, batchAiBeautyGlow, setBatchAiBeautyGlow, batchAiFaceRestore, setBatchAiFaceRestore, batchAiBeautyUseMask, setBatchAiBeautyUseMask, batchSection, setBatchSection, batchRawFiles, setBatchRawFiles, handleRawBatchProcess, batchLogs, addBatchLog, batchConfirmFirst, setBatchConfirmFirst, batchConfirmData, batchCancelRequested, handleCancelBatch, continueBatchProcess, cancelBatchProcess, batchStats }} />
        ) : activeTab === "cull" ? (
          <CullPage {...{ dm, cardBg, cardBdr, inputSt, sourceHandle, outputHandle, batchImages, selectSourceFolder, selectRawSourceFolder, selectOutputFolder, batchLogs, addBatchLog, batchSection, setBatchSection, isMobile, user, setActiveTab }} />
        ) : activeTab === "account" ? (
          <div style={{ display: "flex", justifyContent: "center", minHeight: "calc(100vh - 52px)", overflowY: "auto", background: dm ? "#0a0e17" : "#f3f4f6" }}>
            <AccountDashboard user={user} onLogin={handleLogin} onLogout={handleLogout} onCancelSubscription={handleCancelSubscription} onChangeBillingPeriod={handleChangeBillingPeriod} onChangeTier={handleChangeTier} onRenewLease={handleRenewLease} dm={dm} />
          </div>
        ) : (
          <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
            <div className="glass-panel" style={{ width: "310px", borderRight: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, overflowY: "auto", flexShrink: 0 }}>
              {renderPanel()}
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
              <Preview {...{ image, dragging, setDragging, loadImage, fileInputRef, imgRef, splitRef, previewRef, activeTab, bgResult, bgMode, showBefore, setShowBefore, showSplit, splitPos, isDragSplit, setIsDragSplit, cssFilter, transformCSS, filters, texts, selText, setSelText, updateText, cropMode, cropBox, setCropBox, cropAspect, isEdited, setImage, setBgStatus, setBgSubUrl, setBgResult, isMobile, rotation, flipH, flipV }} />
            </div>
          </div>
        )
      )}

      {isMobile && (
        activeTab === "home" ? (
          <div style={{ height: "calc(100vh - 52px)", overflowY: "auto" }}>
            <LandingPage {...{ dm, loadImage, setActiveTab, handleInstallClick, deferredPrompt, isIOS, isInstalled }} onSelectPlan={(plan) => setCheckoutPlan(plan)} />
          </div>
        ) : activeTab === "batch" ? (
          <div style={{ height: "calc(100vh - 52px)", overflowY: "auto" }}>
            <BatchPage {...{ dm, cardBg, cardBdr, inputSt, isMobile: true, user, setActiveTab, sourceHandle, outputHandle, batchImages, selectSourceFolder, selectRawSourceFolder, selectOutputFolder, batchResizeMode, setBatchResizeMode, batchResizePreset, setBatchResizePreset, batchCustomW, setBatchCustomW, batchCustomH, setBatchCustomH, batchKeepAspect, setBatchKeepAspect, batchLongEdgePx, setBatchLongEdgePx, batchAutoLevels, setBatchAutoLevels, batchAutoContrast, setBatchAutoContrast, batchSharpen, setBatchSharpen, batchSharpenAmt, setBatchSharpenAmt, batchSharpenRad, setBatchSharpenRad, batchDenoise, setBatchDenoise, batchDenoiseAmt, setBatchDenoiseAmt, batchLogo, setBatchLogo, batchLogoFile, setBatchLogoFile, handleBatchLogoUpload, batchLogoScale, setBatchLogoScale, batchLogoScalePortrait, setBatchLogoScalePortrait, batchLogoOpacity, setBatchLogoOpacity, batchLogoPos, setBatchLogoPos, batchLogoMargin, setBatchLogoMargin, batchOutputFmt, setBatchOutputFmt, batchOutputQ, setBatchOutputQ, batchPrefix, setBatchPrefix, batchSuffix, setBatchSuffix, batchProcessing, batchProgress, batchDone, handleBatchProcess, batchPreviewIdx, batchPreviewOrigUrl, batchPreviewAfterUrl, batchPreviewLoading, batchPreviewSplit, setBatchPreviewSplit, batchPreviewDragging, setBatchPreviewDragging, batchPreviewOpen, setBatchPreviewOpen, generateBatchPreview, filters, setFilters, resetAll, batchFilterGroup, setBatchFilterGroup, calcBatchDims, batchAiUpscale, setBatchAiUpscale, batchAiBeauty, setBatchAiBeauty, batchAiScale, setBatchAiScale, batchAiBeautySmooth, setBatchAiBeautySmooth, batchAiBeautyClarity, setBatchAiBeautyClarity, batchAiBeautyGlow, setBatchAiBeautyGlow, batchAiFaceRestore, setBatchAiFaceRestore, batchAiBeautyUseMask, setBatchAiBeautyUseMask, batchSection, setBatchSection, batchRawFiles, setBatchRawFiles, handleRawBatchProcess, batchLogs, addBatchLog, batchConfirmFirst, setBatchConfirmFirst, batchConfirmData, batchCancelRequested, handleCancelBatch, continueBatchProcess, cancelBatchProcess, batchStats }} />
          </div>
        ) : activeTab === "cull" ? (
          <div style={{ height: "calc(100vh - 52px)", overflowY: "auto", padding: "16px" }}>
            <CullPage {...{ dm, cardBg, cardBdr, inputSt, sourceHandle, outputHandle, batchImages, selectSourceFolder, selectRawSourceFolder, selectOutputFolder, batchLogs, addBatchLog, batchSection, setBatchSection, isMobile: true, user, setActiveTab }} />
          </div>
        ) : activeTab === "account" ? (
          <div style={{ display: "flex", justifyContent: "center", minHeight: "calc(100vh - 52px)", overflowY: "auto", background: dm ? "#0a0e17" : "#f3f4f6" }}>
            <AccountDashboard user={user} onLogin={handleLogin} onLogout={handleLogout} onCancelSubscription={handleCancelSubscription} onChangeBillingPeriod={handleChangeBillingPeriod} onChangeTier={handleChangeTier} onRenewLease={handleRenewLease} dm={dm} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", overflow: "hidden" }}>
            <div style={{ height: "42vh", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
              <Preview {...{ image, dragging, setDragging, loadImage, fileInputRef, imgRef, splitRef, previewRef, activeTab, bgResult, bgMode, showBefore, setShowBefore, showSplit, splitPos, isDragSplit, setIsDragSplit, cssFilter, transformCSS, filters, texts, selText, setSelText, updateText, cropMode, cropBox, setCropBox, cropAspect, isEdited, setImage, setBgStatus, setBgSubUrl, setBgResult, isMobile, rotation, flipH, flipV }} />
            </div>
            <div className="glass-panel" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", borderTop: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
              {image && activeTab === "edit" && (
                <div className="glass-panel" style={{ display: "flex", gap: "6px", padding: "10px 12px", flexWrap: "wrap", borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, position: "sticky", top: 0, zIndex: 10 }}>
                  {PRESETS.map(p => (
                    <button key={p.name} onClick={() => setFilters({ ...DEFAULT_FILTERS, ...p.values })}
                      style={{ flexShrink: 0, padding: "7px 10px", border: `1.5px solid ${dm ? '#333' : '#e8e8f0'}`, background: dm ? '#2a2a2a' : '#fff', borderRadius: "9px", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: dm ? '#ccc' : '#555', fontFamily: "inherit" }}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                  <button onClick={resetAll} style={{ flexShrink: 0, padding: "7px 10px", background: dm ? '#333' : '#f2f2f8', border: "none", borderRadius: "9px", fontSize: "11px", fontWeight: 600, color: "#888", cursor: "pointer" }}>↺</button>
                </div>
              )}
              {renderPanel(true)}
            </div>
          </div>
        )
      )}

      {showExport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: isMobile ? "0" : "20px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowExport(false); }}>
          <div style={{ background: dm ? '#1e1e1e' : '#fff', borderRadius: isMobile ? "16px 16px 0 0" : "16px", width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto", padding: "22px", animation: "slideup .25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: dm ? '#f0f0f0' : '#1a1a2e' }}>Export Photo</div>
                <div style={{ fontSize: "12px", color: "#bbb", marginTop: "2px" }}>High quality · All platforms</div>
              </div>
              <button onClick={() => setShowExport(false)} style={{ background: dm ? '#333' : '#f2f2f8', border: "none", width: "34px", height: "34px", borderRadius: "8px", cursor: "pointer", fontSize: "18px", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: "3px", marginBottom: "18px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "3px", borderRadius: "10px" }}>
              {[["standard", "Standard"], ["facebook", "📘 Social"]].map(([id, lb]) => (
                <button key={id} onClick={() => setExportTab(id)}
                  style={{ flex: 1, padding: "9px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", background: exportTab === id ? (id === "facebook" ? "#1877f2" : (dm ? '#444' : '#fff')) : "transparent", color: exportTab === id ? (id === "facebook" ? "#fff" : "#6c63ff") : "#999", borderRadius: "8px", boxShadow: exportTab === id ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .18s" }}>
                  {lb}
                </button>
              ))}
            </div>
            {exportTab === "standard" && (<>
              <SL>Format</SL>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                {[{ id: "jpg", l: "JPEG", d: "Best for photos" }, { id: "png", l: "PNG", d: "Lossless" }, { id: "webp", l: "WebP", d: "Smallest size" }].map(f => (
                  <button key={f.id} onClick={() => setExportFmt(f.id)}
                    style={{ padding: "10px 14px", border: `1.5px solid ${exportFmt === f.id ? "#6c63ff" : dm ? '#333' : '#eee'}`, background: exportFmt === f.id ? (dm ? '#2a2a3a' : '#faf9ff') : dm ? '#1e1e1e' : '#fff', borderRadius: "10px", textAlign: "left", cursor: "pointer", transition: "all .18s", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" }}>
                    <div><span style={{ fontSize: "13px", fontWeight: 600, color: exportFmt === f.id ? "#6c63ff" : dm ? '#ccc' : '#444' }}>{f.l}</span><span style={{ fontSize: "11px", color: "#bbb", marginLeft: "10px" }}>{f.d}</span></div>
                    {exportFmt === f.id && <span style={{ color: "#6c63ff", fontSize: "18px" }}>✓</span>}
                  </button>
                ))}
              </div>
              {exportFmt !== "png" && (<>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><SL>Quality</SL><span style={{ fontSize: "13px", fontWeight: 700, color: "#6c63ff" }}>{exportQ}%</span></div>
                <SmoothSlider min={70} max={100} step={1} value={exportQ} defaultValue={92} onChange={setExportQ} style={{ marginBottom: "16px" }} />
              </>)}
              <SL>Resolution</SL>
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                {[{ v: 1, l: "1×", d: "Original" }, { v: 2, l: "2×", d: "Double" }, { v: 3, l: "3×", d: "Triple" }, { v: 4, l: "4×", d: "Ultra HD" }, { v: "8k", l: "8K", d: "7680px" }].map(s => (
                  <button key={s.v} onClick={() => setExportScale(s.v)}
                    style={{ flex: "1 1 56px", padding: "9px 4px", border: `1.5px solid ${exportScale === s.v ? "#6c63ff" : s.v === "8k" ? "#e0d8ff" : dm ? '#333' : '#eee'}`, background: exportScale === s.v ? (dm ? '#2a2a3a' : '#faf9ff') : s.v === "8k" ? (dm ? '#1e1a2e' : '#faf8ff') : dm ? '#1e1e1e' : '#fff', borderRadius: "10px", textAlign: "center", cursor: "pointer", transition: "all .18s", fontFamily: "inherit" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: exportScale === s.v ? "#6c63ff" : s.v === "8k" ? "#a78bfa" : dm ? '#ccc' : '#555', marginBottom: "1px" }}>{s.l}</div>
                    <div style={{ fontSize: "9px", color: "#bbb" }}>{s.d}</div>
                  </button>
                ))}
              </div>
              {natW > 0 && <div style={{ padding: "10px 14px", background: dm ? '#2a2a2a' : '#f8f8fd', borderRadius: "8px", display: "flex", justifyContent: "space-between", marginBottom: "16px" }}><span style={{ fontSize: "12px", color: "#bbb" }}>Output</span><span style={{ fontSize: "13px", fontWeight: 600, color: "#6c63ff" }}>{expW.toLocaleString()} × {expH.toLocaleString()}px</span></div>}
              {exportInfo && <div style={{ padding: "10px 14px", background: exportDone ? "#f0fff4" : "#fff8e7", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", color: exportDone ? "#16a34a" : "#92400e", fontWeight: 500 }}>{exportDone ? `✓ Saved — ${exportInfo}` : exportInfo}</div>}
              <AB onClick={handleExport} disabled={exporting} color={exportDone ? "#f0fff4" : "purple"} textColor={exportDone ? "#16a34a" : "#fff"} style={{ width: "100%", padding: "14px", fontSize: "14px", fontWeight: 700 }}>
                {exporting ? <Row><Spin />Processing...</Row> : exportDone ? "✓ Saved!" : `↓ Download ${({ jpg: "JPEG", png: "PNG", webp: "WebP" })[exportFmt]} · ${typeof exportScale === "string" ? exportScale.toUpperCase() : exportScale + "×"}`}
              </AB>
              <p style={{ fontSize: "11px", color: "#bbb", textAlign: "center", marginTop: "8px" }}>iOS/Android: tap "Save Image" in the share sheet</p>
            </>)}
            {exportTab === "facebook" && (<>
              <div style={{ padding: "12px", background: dm ? '#1e2a3a' : '#eff6ff', border: "1.5px solid #bfdbfe", borderRadius: "10px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#1d4ed8", marginBottom: "4px" }}>Optimised for Social Media</div>
                <div style={{ fontSize: "12px", color: "#3b82f6", lineHeight: 1.6 }}>Exact dimensions + JPEG 82% — bypasses compression on Facebook, Instagram &amp; more.</div>
              </div>
              <SL>Platform / Format</SL>
              {FB_MODES.map(m => (
                <button key={m.id} onClick={() => setFbMode(m.id)}
                  style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${fbMode === m.id ? "#1877f2" : dm ? '#333' : '#eee'}`, background: fbMode === m.id ? (dm ? '#1e2a3a' : '#eff6ff') : dm ? '#1e1e1e' : '#fff', borderRadius: "10px", textAlign: "left", cursor: "pointer", transition: "all .18s", marginBottom: "7px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" }}>
                  <div><div style={{ fontSize: "13px", fontWeight: 600, color: fbMode === m.id ? "#1877f2" : dm ? '#ccc' : '#444', marginBottom: "2px" }}>{m.label}</div><div style={{ fontSize: "12px", color: "#bbb" }}>{m.desc}</div></div>
                  {fbMode === m.id && <span style={{ color: "#1877f2", fontSize: "18px" }}>✓</span>}
                </button>
              ))}
              {exportInfo && fbDone && <div style={{ padding: "10px 14px", background: "#f0fff4", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", color: "#16a34a", fontWeight: 500 }}>✓ Saved — {exportInfo}</div>}
              <AB onClick={handleFbExport} disabled={fbExporting} color={fbDone ? "#f0fff4" : "#1877f2"} textColor={fbDone ? "#16a34a" : "#fff"} style={{ width: "100%", padding: "14px", fontSize: "14px", fontWeight: 700 }}>
                {fbExporting ? <Row><Spin color="rgba(255,255,255,.7)" />Exporting...</Row> : fbDone ? "✓ Saved!" : `↓ Export · ${FB_MODES.find(m => m.id === fbMode)?.desc}`}
              </AB>
            </>)}
          </div>
        </div>
      )}
      {showPwaGuide && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 5, 10, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadein 0.25s ease'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPwaGuide(false); }}
        >
          <div 
            style={{
              background: dm ? '#0f172a' : '#ffffff',
              border: `1px solid ${dm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: '24px',
              width: '100%',
              maxWidth: '500px',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              position: 'relative',
              animation: 'slideup 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowPwaGuide(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: dm ? '#9ca3af' : '#4b5563',
                fontSize: '14px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = dm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 800, 
                color: dm ? '#ffffff' : '#0f172a',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.5px'
              }}>
                Install PHOTOlab Professional
              </h3>
              <p style={{ fontSize: '13px', color: dm ? '#94a3b8' : '#64748b', marginTop: '4px' }}>
                Run standalone fullscreen offline with high-performance storage decoders.
              </p>
            </div>

            {/* Content split by platform */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Apple iOS/iPadOS Column */}
              <div 
                style={{
                  background: dm ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🍎</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: dm ? '#f8fafc' : '#0f172a' }}>Apple iPad / iPhone (Safari)</span>
                </div>
                <ol style={{ fontSize: '13px', color: dm ? '#cbd5e1' : '#334155', paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li style={{ marginBottom: '6px' }}>
                    Tap the <strong>Share</strong> button <span style={{ fontSize: '14px', verticalAlign: 'middle' }}>📤</span> in Safari.
                  </li>
                  <li>
                    Scroll down and select <strong style={{ color: dm ? '#f8fafc' : '#0f172a' }}>Add to Home Screen</strong> <span style={{ fontSize: '14px', verticalAlign: 'middle' }}>➕</span>.
                  </li>
                </ol>
              </div>

              {/* Android / Chrome Column */}
              <div 
                style={{
                  background: dm ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: dm ? '#f8fafc' : '#0f172a' }}>Android / Chrome / Desktop</span>
                </div>
                <ol style={{ fontSize: '13px', color: dm ? '#cbd5e1' : '#334155', paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li style={{ marginBottom: '6px' }}>
                    Tap <strong style={{ 
                      background: 'linear-gradient(135deg, #f97316, #facc15)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 800
                    }}>📱 Install App</strong> in the header bar.
                  </li>
                  <li>
                    Confirm the installation prompt when prompted by your browser.
                  </li>
                </ol>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                onClick={() => setShowPwaGuide(false)}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg,#6c63ff,#8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(108,99,255,.3)'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {checkoutPlan && (
        <StripeCheckout isOpen={!!checkoutPlan} onClose={() => setCheckoutPlan(null)} plan={checkoutPlan} dm={dm} onPaymentSuccess={handlePaymentSuccess} />
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
