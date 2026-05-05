import { createFileRoute } from "@tanstack/react-router";
import UncorkApp from "../UncorkApp.jsx";

export const Route = createFileRoute("/")({
  component: UncorkApp,
});
