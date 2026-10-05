import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import PrizeScreen from "./components/PrizeScreen";
import Admin from "./components/Admin";
import { PRIZES } from "./data/prizes";
import "./App.css";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

function PrizeRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentPrize = id ? parseInt(id, 10) - 1 : 0;

  if (isNaN(currentPrize) || currentPrize < 0 || currentPrize >= PRIZES.length) {
    return <Navigate to="/1" replace />;
  }

  const handleNext = () => { if (currentPrize < PRIZES.length - 1) navigate(`/${currentPrize + 2}`); };
  const handleBack = () => { if (currentPrize > 0) navigate(`/${currentPrize}`); };

  return (
    <PrizeScreen
      key={currentPrize}
      prize={PRIZES[currentPrize]}
      prizeIndex={currentPrize}
      totalPrizes={PRIZES.length}
      onBack={handleBack}
      onNext={handleNext}
      isFirst={currentPrize === 0}
      isLast={currentPrize === PRIZES.length - 1}
    />
  );
}

function App() {
  const [scale, setScale] = useState({ x: 1, y: 1 });

  useEffect(() => {
    const handleResize = () => {
      setScale({
        x: window.innerWidth / DESIGN_W,
        y: window.innerHeight / DESIGN_H,
      });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { pathname } = useLocation();

  /* Admin: halaman responsif biasa, di luar kanvas 1920×1080 */
  if (pathname === "/admin") {
    return <div className="admin-root h-screen w-screen overflow-auto"><Admin /></div>;
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      {/* 1920×1080 canvas, stretched to fill screen */}
      <div
        className="absolute top-0 left-0 overflow-hidden"
        style={{
          width:  DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale.x}, ${scale.y})`,
          transformOrigin: "top left",
        }}
      >
        <Routes>
          <Route path="/:id" element={<PrizeRoute />} />
          <Route path="*" element={<Navigate to="/1" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
