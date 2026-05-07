import React, { useState, useRef, useEffect } from "react";
import qz from "qz-tray";

function App() {
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

  const [driver, setDriver] = useState({
    name: "",
    idNumber: "",
    issueDate: formatDate(new Date()),
    photo: null,
    logo: null,
  });

  const [pasteTarget, setPasteTarget] = useState("photo");
  const canvasRef = useRef(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const item = Array.from(e.clipboardData.items).find(
        (x) => x.type.indexOf("image") !== -1,
      );
      if (item) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) =>
          setDriver((prev) => ({
            ...prev,
            [pasteTarget]: event.target.result,
          }));
        reader.readAsDataURL(blob);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [pasteTarget]);

  useEffect(() => {
    drawCard();
  }, [driver]);

  const loadImage = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });

  const drawCard = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bg = await loadImage("/card-bg-front.jpg");

    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0, 1012, 638);

    // Text Labels
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

    // 1. Profile Photo - "TRANSPARENT ASPECT FIT"
    if (driver.photo) {
      const img = await loadImage(driver.photo);
      const boxW = 230;
      const boxH = 290;
      const boxX = 55;
      const boxY = 20;

      // Calculate proportional size
      const ratio = Math.min(boxW / img.width, boxH / img.height);
      const renderW = img.width * ratio;
      const renderH = img.height * ratio;

      // Align to the BOTTOM of the photo box so it touches the "Wave"
      const x = boxX + (boxW - renderW) / 2;
      const y = boxY + (boxH - renderH);

      ctx.save();
      // Create a rounded clipping path
      // ctx.beginPath();
      // ctx.roundRect(boxX, boxY, boxW, boxH, 15);
      // ctx.clip();

      // We NO LONGER fill with white here.
      // The background wave will now show in the gaps.
      ctx.drawImage(img, x, y, renderW, renderH);

      ctx.restore();
    }

    // 2. Logo - "SMART ADJUST" (Centers in Logo Area)
    if (driver.logo) {
      const logoImg = await loadImage(driver.logo);
      const maxW = 280;
      const maxH = 140;
      const anchorX = 920;
      const anchorY = 70; // Top Right target

      const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
      const w = logoImg.width * ratio;
      const h = logoImg.height * ratio;

      // Right-aligned drawing
      ctx.drawImage(logoImg, anchorX - w, anchorY, w, h);
    }
  };

  const handlePrint = async () => {
    try {
      if (!qz.websocket.isActive()) await qz.websocket.connect();

      await drawCard();

      // IMPORTANT: Explicit configuration for 300 DPI Matica
      const config = qz.configs.create("Microsoft Print to PDF", {
        duplex: true,
        density: 300,
        units: "in",
        size: { width: 3.375, height: 2.125 }, // Physical card size
        interpolation: "bicubic",
        reconfigure: true, // Forces driver settings refresh
      });

      const data = [
        {
          type: "pixel",
          format: "image",
          flavor: "base64",
          data: canvasRef.current.toDataURL("image/jpg", 1.0).split(",")[1],
        },
        {
          type: "pixel",
          format: "image",
          flavor: "file",
          data: "/card-back.jpg",
        },
      ];

      await qz.print(config, data);
    } catch (e) {
      alert("Print Error: " + e);
    }
  };

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
            setDriver({ ...driver, name: toProperCase(e.target.value) })
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
          onChange={(e) => setDriver({ ...driver, idNumber: e.target.value })}
          style={{
            width: "400px",
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />
        <input
          type="text"
          placeholder="Expiry Date"
          value={driver.issueDate}
          onChange={(e) => setDriver({ ...driver, issueDate: e.target.value })}
          style={{
            width: "400px",
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

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
            }}
          >
            Reset
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "12px 60px",
              borderRadius: "5px",
              border: "none",
              background: "#28a745",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🖨️ PRINT ID CARD
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
