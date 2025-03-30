"use client";
import { MainLayout } from "@/components/main-layout";
import DocumentPage from "@/components/document-page";

export default function PageContent() {
  return (
    <MainLayout>
      <DocumentPage fileName="document.md" />
    </MainLayout>
  );
}
