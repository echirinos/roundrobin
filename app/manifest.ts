import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlaySync",
    short_name: "PlaySync",
    description:
      "Create a live pickleball session, share a QR code, post the next game, and collect courtside scores from one mobile-friendly link.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fbef",
    theme_color: "#162119",
    icons: [
      {
        src: "/playsync-logo-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/playsync-logo-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
