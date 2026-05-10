import jsPDF from "jspdf";
import React, { useState, useRef, useEffect, useCallback } from "react";

function App() {
  // =============================================
  // CONFIG
  // =============================================

  // CHANGE THIS AFTER VERCEL DEPLOY
  const API_URL = "https://fms-cards-server.onrender.com/api/print-job";

  // Optional security token
  const API_TOKEN = "my-secret-token";

  // =============================================
  // HELPERS
  // =============================================

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

  // =============================================
  // STATE
  // =============================================

  const [driver, setDriver] = useState({
    name: "",
    idNumber: "",
    issueDate: formatDate(new Date()),
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

    ctx.fillText("NAME:", 55, 450);
    ctx.fillText("ID NUMBER:", 55, 510);
    ctx.fillText("ISSUE DATE:", 55, 570);

    ctx.fillStyle = "black";
    ctx.font = "32px Arial";

    ctx.fillText(driver.name, 175, 450);
    ctx.fillText(driver.idNumber, 265, 510);
    ctx.fillText(driver.issueDate, 265, 570);

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
  }, [driver]);

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

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [3.375, 2.125],
      });

      const frontImage = canvasRef.current.toDataURL(
        "image/jpeg",
        1.0
      );

      pdf.addImage(
        frontImage,
        "JPEG",
        0,
        0,
        3.375,
        2.125
      );

      // Back image
      const backImage = "https://res.cloudinary.com/dxeqrhxvt/image/upload/v1778347577/card-back_xqisr9.jpg";
      
      pdf.addPage([3.375, 2.125], "landscape");

      pdf.addImage(
        backImage,
        "JPEG",
        0,
        0,
        3.375,
        2.125
      );

      const pdfBase64 = pdf.output("datauristring");

      // Send to server
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },

        body: JSON.stringify({
          pdf: pdfBase64,
          driver: {
            name: driver.name,
            idNumber: driver.idNumber,
            issueDate: driver.issueDate,
          },
          createdAt: new Date().toISOString(),
        })
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
    <div
      style={{
        padding: "30px",
        textAlign: "center",
        backgroundColor: "#f4f4f9",
        minHeight: "100vh",
      }}
    >
      <h2>Matica XID 8300 - ID Generator</h2>

      {/* ============================================= */}
      {/* TARGET BUTTONS */}
      {/* ============================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => setPasteTarget("photo")}
          style={{
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            border: "none",
            background: pasteTarget === "photo" ? "#002060" : "#888",
            color: "white",
          }}
        >
          🎯 Target: Driver Photo
        </button>

        <button
          onClick={() => setPasteTarget("logo")}
          style={{
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            border: "none",
            background: pasteTarget === "logo" ? "#002060" : "#888",
            color: "white",
          }}
        >
          🏢 Target: Company Logo
        </button>
      </div>

      {/* ============================================= */}
      {/* CANVAS */}
      {/* ============================================= */}

      <canvas
        ref={canvasRef}
        width="1012"
        height="638"
        style={{
          border: "4px solid #fff",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          borderRadius: "15px",
          background: "#fff",
          width: "800px",
        }}
      />

      {/* ============================================= */}
      {/* FORM */}
      {/* ============================================= */}

      <div
        style={{
          marginTop: "30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <input
          type="text"
          placeholder="Driver Full Name"
          value={driver.name}
          onChange={(e) =>
            setDriver({
              ...driver,
              name: toProperCase(e.target.value),
            })
          }
          style={{
            width: "400px",
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="text"
          placeholder="ID Number"
          value={driver.idNumber}
          onChange={(e) =>
            setDriver({
              ...driver,
              idNumber: e.target.value,
            })
          }
          style={{
            width: "400px",
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="text"
          placeholder="Issue Date"
          value={driver.issueDate}
          onChange={(e) =>
            setDriver({
              ...driver,
              issueDate: e.target.value,
            })
          }
          style={{
            width: "400px",
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        {/* ============================================= */}
        {/* ACTION BUTTONS */}
        {/* ============================================= */}

        <div style={{ marginTop: "10px" }}>
          <button
            onClick={() =>
              setDriver({
                ...driver,
                name: "",
                idNumber: "",
                photo: null,
                logo: null,
              })
            }
            style={{
              marginRight: "15px",
              padding: "12px 25px",
              borderRadius: "5px",
              border: "1px solid #888",
              background: "white",
              cursor: "pointer",
            }}
          >
            Reset
          </button>

          <button
            onClick={handlePrint}
            disabled={loading}
            style={{
              padding: "12px 60px",
              borderRadius: "5px",
              border: "none",
              background: loading ? "#999" : "#28a745",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "⏳ Sending..." : "🖨️ SEND TO PRINT SERVER"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
