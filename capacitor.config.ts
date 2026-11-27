import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "space.manus.neonvelocity",
  appName: "NEON VELOCITY",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
};

export default config;
