import AnalysisThreadClient from "./AnalysisThreadClient";

export default async function AnalysisThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  return <AnalysisThreadClient threadId={threadId} />;
}