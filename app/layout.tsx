import React from "react";
import "./globals.css";

export default function RootLayout(props: { children: React.ReactNode }) {
  return React.createElement("html", { lang: "en" }, React.createElement("body", null, props.children));
}
