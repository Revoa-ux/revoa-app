// vite.config.ts
import { defineConfig, loadEnv } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "https://api.revoa.app",
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              proxyReq.setHeader("origin", env.VITE_APP_URL || "https://members.revoa.app");
            });
          }
        }
      },
      cors: {
        origin: [
          "https://members.revoa.app",
          "http://localhost:5173",
          "https://*.myshopify.com",
          "https://*.shopify.com",
          "https://*.supabase.co"
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "apikey",
          "X-Client-Info",
          "X-Shopify-Access-Token",
          "X-Shopify-Shop-Domain"
        ],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204
      }
    },
    build: {
      target: "es2020",
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: mode === "development",
      minify: mode === "production",
      chunkSizeWarningLimit: 1e3,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": ["lucide-react", "@supabase/supabase-js", "sonner"],
            "chart-vendor": ["recharts"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gTG9hZCBlbnYgZmlsZSBiYXNlZCBvbiBtb2RlXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW3JlYWN0KCldLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiB0cnVlLFxuICAgICAgcG9ydDogNTE3MyxcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQSV9VUkwgfHwgJ2h0dHBzOi8vYXBpLnJldm9hLmFwcCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgICAvLyBBZGQgb3JpZ2luIHRvIHByb3hpZWQgcmVxdWVzdFxuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ29yaWdpbicsIGVudi5WSVRFX0FQUF9VUkwgfHwgJ2h0dHBzOi8vbWVtYmVycy5yZXZvYS5hcHAnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNvcnM6IHtcbiAgICAgICAgb3JpZ2luOiBbXG4gICAgICAgICAgJ2h0dHBzOi8vbWVtYmVycy5yZXZvYS5hcHAnLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLFxuICAgICAgICAgICdodHRwczovLyoubXlzaG9waWZ5LmNvbScsXG4gICAgICAgICAgJ2h0dHBzOi8vKi5zaG9waWZ5LmNvbScsXG4gICAgICAgICAgJ2h0dHBzOi8vKi5zdXBhYmFzZS5jbydcbiAgICAgICAgXSxcbiAgICAgICAgbWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJywgJ09QVElPTlMnXSxcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnLFxuICAgICAgICAgICdhcGlrZXknLFxuICAgICAgICAgICdYLUNsaWVudC1JbmZvJyxcbiAgICAgICAgICAnWC1TaG9waWZ5LUFjY2Vzcy1Ub2tlbicsXG4gICAgICAgICAgJ1gtU2hvcGlmeS1TaG9wLURvbWFpbidcbiAgICAgICAgXSxcbiAgICAgICAgY3JlZGVudGlhbHM6IHRydWUsXG4gICAgICAgIHByZWZsaWdodENvbnRpbnVlOiBmYWxzZSxcbiAgICAgICAgb3B0aW9uc1N1Y2Nlc3NTdGF0dXM6IDIwNFxuICAgICAgfVxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAgIGFzc2V0c0RpcjogJ2Fzc2V0cycsXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgICBtaW5pZnk6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyxcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICAgJ3VpLXZlbmRvcic6IFsnbHVjaWRlLXJlYWN0JywgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycsICdzb25uZXInXSxcbiAgICAgICAgICAgICdjaGFydC12ZW5kb3InOiBbJ3JlY2hhcnRzJ11cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsY0FBYyxlQUFlO0FBQy9QLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFFeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRTNDLFNBQU87QUFBQSxJQUNMLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUNqQixTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRLElBQUksZ0JBQWdCO0FBQUEsVUFDNUIsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFVBQ1IsV0FBVyxDQUFDLE9BQU8sYUFBYTtBQUM5QixrQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssU0FBUztBQUU1Qyx1QkFBUyxVQUFVLFVBQVUsSUFBSSxnQkFBZ0IsMkJBQTJCO0FBQUEsWUFDOUUsQ0FBQztBQUFBLFVBQ0g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsTUFBTTtBQUFBLFFBQ0osUUFBUTtBQUFBLFVBQ047QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUFBLFFBQ0EsU0FBUyxDQUFDLE9BQU8sUUFBUSxPQUFPLFVBQVUsU0FBUztBQUFBLFFBQ25ELGdCQUFnQjtBQUFBLFVBQ2Q7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNGO0FBQUEsUUFDQSxhQUFhO0FBQUEsUUFDYixtQkFBbUI7QUFBQSxRQUNuQixzQkFBc0I7QUFBQSxNQUN4QjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxNQUNYLFdBQVcsU0FBUztBQUFBLE1BQ3BCLFFBQVEsU0FBUztBQUFBLE1BQ2pCLHVCQUF1QjtBQUFBLE1BQ3ZCLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxZQUN6RCxhQUFhLENBQUMsZ0JBQWdCLHlCQUF5QixRQUFRO0FBQUEsWUFDL0QsZ0JBQWdCLENBQUMsVUFBVTtBQUFBLFVBQzdCO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
