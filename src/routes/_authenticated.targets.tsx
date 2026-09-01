import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/targets")({
  component: RemovedTargets,
});

// Preserve old bookmarks without retaining a Sales Targets screen.
function RemovedTargets() {
  return <Navigate to="/dashboard" replace />;
}
