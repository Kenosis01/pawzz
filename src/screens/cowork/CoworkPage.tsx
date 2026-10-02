"use client";

import { ChatHeader } from "../../components/chat/ChatHeader";
import { Page } from "../../components/layout/Page";
import { CoworkEmpty } from "./CoworkEmpty";

export function CoworkPage() {
  return (
    <Page pinned>
      <ChatHeader />
      <CoworkEmpty />
    </Page>
  );
}
