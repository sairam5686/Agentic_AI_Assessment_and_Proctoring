import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import AgoraProctoringWrapper from "./AgoraProctoringWrapper";
import ProctoringWrapper from "./ProctoringWrapper";
import ChatInterface from "./ChatInterface";
import { useAntiCheat } from "../hooks/useAntiCheat";

const AgoraProctoringLayout: React.FC = () => {
  useAntiCheat(); // Blocks copy-paste, devtools, right-click, new tab, view source

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <AgoraProctoringWrapper>
      <ProctoringWrapper>
        <Outlet />
        <ChatInterface />
      </ProctoringWrapper>
    </AgoraProctoringWrapper>
  );
};

export default AgoraProctoringLayout;
