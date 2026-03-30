import React from "react";
import { Outlet } from "react-router";
import AgoraProctoringWrapper from "./AgoraProctoringWrapper";
import ProctoringWrapper from "./ProctoringWrapper";
import ChatInterface from "./ChatInterface";

const AgoraProctoringLayout: React.FC = () => {
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
