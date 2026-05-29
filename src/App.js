import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { cardTemplates } from "./cardTemplates";

function App() {
  // =============================================
  // CONFIG
  // =============================================

  // CHANGE THIS AFTER VERCEL DEPLOY
  const API_URL = "https://fms-cards-server.onrender.com/api/print-job";

  // Optional security token
  const API_TOKEN = "my-secret-token";

  // =============================================
  // RESPONSIVE STATE
  // =============================================

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // =============================================
  // HELPERS
  // =============================================

  const isMobile = windowWidth < 768;
  // const isTablet = windowWidth >= 768 && windowWidth < 1024;
  
  // const getCanvasWidth = () => {
  //   if (isMobile) return Math.min(windowWidth - 30, 320);
  //   if (isTablet) return 500;
  //   return 800;
  // };

  const getButtonGap = () => {
    if (isMobile) return "8px";
    return "15px";
  };

  const formatDate = (date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const toProperCase = (str) =>
    str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());

  const getDefaultExpirationDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return formatDate(date);
  };

  // const getInputWidth = () => {
  //   if (isMobile) return "100%";
  //   if (isTablet) return "90%";
  //   return 400;
  // };

  // =============================================
  // STATE
  // =============================================

  const [template, setTemplate] = useState(cardTemplates[0].id);
  const activeTemplate =
    cardTemplates.find((item) => item.id === template) || cardTemplates[0];

  const [driver, setDriver] = useState({
    name: "",
    idNumber: "",
    issueDate: formatDate(new Date()),
    expirationDate: getDefaultExpirationDate(),
    photo: null,
    logo: null,
  });

  const [pasteTarget, setPasteTarget] = useState("photo");

  const [loading, setLoading] = useState(false);

  const canvasRef = useRef(null);

  // =============================================
  // IMAGE PASTE HANDLER
  // =============================================

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handlePaste = (e) => {
      const item = Array.from(e.clipboardData.items).find(
        (x) => x.type.indexOf("image") !== -1,
      );

      if (item) {
        const blob = item.getAsFile();

        const reader = new FileReader();

        reader.onload = (event) => {
          setDriver((prev) => ({
            ...prev,
            [pasteTarget]: event.target.result,
          }));
        };

        reader.readAsDataURL(blob);
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, [pasteTarget]);

  // =============================================
  // LOAD IMAGE
  // =============================================

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();

      img.crossOrigin = "anonymous";

      img.onload = () => resolve(img);

      img.onerror = reject;

      img.src = src;
    });

  // =============================================
  // DRAW CARD
  // =============================================

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;

    const ctx = canvas.getContext("2d");

    // Load background
    const bg = await loadImage("/card-bg-front.jpg");

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.drawImage(bg, 0, 0, 1012, 638);

    // =============================================
    // TEXT
    // =============================================

    ctx.fillStyle = "#002060";
    ctx.font = "bold 32px Arial";

    activeTemplate.fields.forEach((field) => {
      const labelX = field.labelX ?? 55;
      const lineY = field.y;
      ctx.fillText(`${field.label}:`, labelX, lineY);
    });

    ctx.fillStyle = "black";
    ctx.font = "32px Arial";

    activeTemplate.fields.forEach((field) => {
      const valueX = field.valueX ?? 265;
      const lineY = field.y;
      const value = driver[field.id] || "";
      ctx.fillText(value, valueX, lineY);
    });

    // =============================================
    // DRIVER PHOTO
    // =============================================

    if (driver.photo) {
      const img = await loadImage(driver.photo);

      const boxW = 200;
      const boxH = 250;

      const boxX = 55;
      const boxY = 90;

      const ratio = Math.min(boxW / img.width, boxH / img.height);

      const renderW = img.width * ratio;
      const renderH = img.height * ratio;

      const x = boxX + (boxW - renderW) / 2;
      const y = boxY + (boxH - renderH);

      ctx.drawImage(img, x, y, renderW, renderH);
    }

    // =============================================
    // COMPANY LOGO
    // =============================================

    if (driver.logo) {
      const logoImg = await loadImage(driver.logo);

      const maxW = 280;
      const maxH = 140;

      const anchorX = 920;
      const anchorY = 70;

      const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);

      const w = logoImg.width * ratio;
      const h = logoImg.height * ratio;

      ctx.drawImage(logoImg, anchorX - w, anchorY, w, h);
    }
  }, [driver, activeTemplate]);

  // =============================================
  // AUTO REDRAW
  // =============================================

  useEffect(() => {
    drawCard();
  }, [drawCard]);

  // =============================================
  // SEND PRINT JOB TO SERVER
  // =============================================

  const handlePrint = async () => {
    try {
      setLoading(true);

      // Redraw latest card
      await drawCard();

      // Front image
      const frontImage = canvasRef.current.toDataURL("image/jpeg", 1.0);

      // Back image
      const backImage = "https://res.cloudinary.com/dxeqrhxvt/image/upload/v1778347577/card-back_xqisr9.jpg";

      // Send to server
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },

        body: JSON.stringify({
          frontImage,
          backImage,
          driver: {
            name: driver.name,
            idNumber: driver.idNumber,
            issueDate: driver.issueDate,
          },
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send print job");
      }

      const result = await response.json();

      alert(`Print job queued successfully!\nJob ID: ${result.jobId}`);
    } catch (e) {
      console.error(e);

      alert("Print Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // UI
  // =============================================

  return (
    <div className="app-container">
      <div className="app-content">
        {/* HEADER */}
        <div className="header-section">
          <p className="app-subtitle">RFID Card Generator</p>
        </div>

        {/* MAIN CONTENT - TWO COLUMN LAYOUT */}
        <div className="main-layout">
          {/* LEFT SIDE - FORM */}
          <div className="form-column">
            {/* TARGET BUTTONS */}
            <div className="target-buttons" style={{ gap: getButtonGap() }}>
              <button
                onClick={() => setPasteTarget("photo")}
                className={`target-btn ${pasteTarget === "photo" ? "active" : "inactive"}`}
              >
                <span className="btn-icon">🎯</span>
                <span className="btn-text">Driver Photo</span>
              </button>

              <button
                onClick={() => setPasteTarget("logo")}
                className={`target-btn ${pasteTarget === "logo" ? "active" : "inactive"}`}
              >
                <span className="btn-icon">🏢</span>
                <span className="btn-text">Company Logo</span>
              </button>
            </div>

            {/* FORM SECTION */}
            <div className="form-section">
              <div className="form-group">
                <label className="input-label">Card design</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="input-field"
                >
                  {cardTemplates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {activeTemplate.fields.map((field) => (
                <div className="form-group" key={field.id}>
                  <label className="input-label">{field.label}</label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={driver[field.id] || ""}
                    onChange={(e) =>
                      setDriver({
                        ...driver,
                        [field.id]:
                          field.id === "name"
                            ? toProperCase(e.target.value)
                            : e.target.value,
                      })
                    }
                    className="input-field"
                  />
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="action-buttons">
              <button
                onClick={() =>
                  setDriver({
                    ...driver,
                    name: "",
                    idNumber: "",
                    issueDate: formatDate(new Date()),
                    expirationDate: getDefaultExpirationDate(),
                    photo: null,
                    logo: null,
                  })
                }
                className="btn-reset"
              >
                🔄 Reset
              </button>

              <button
                onClick={handlePrint}
                disabled={loading}
                className="btn-print"
              >
                {loading ? "⏳ Sending..." : "🖨️ SEND TO PRINT"}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE - PREVIEW */}
          <div className="preview-column">
            <div className="canvas-wrapper">
              <p className="canvas-label">Live Preview</p>
              <canvas
                ref={canvasRef}
                width="1012"
                height="638"
                className="canvas-element"
              />
              <p className="paste-hint">💡 Paste images while a target is selected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
