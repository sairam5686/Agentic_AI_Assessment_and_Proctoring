import React from "react";
import { Outlet } from "react-router";
import AgoraProctoringWrapper from "./AgoraProctoringWrapper";
import ProctoringWrapper from "./ProctoringWrapper";
import ChatInterface from "./ChatInterface";
import { useAntiCheat } from "../hooks/useAntiCheat";

const AgoraProctoringLayout: React.FC = () => {
  useAntiCheat(); // Blocks copy-paste, devtools, right-click, new tab, view source

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
