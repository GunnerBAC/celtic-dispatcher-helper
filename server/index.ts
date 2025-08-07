import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduler } from "./scheduler";

// Set NODE_ENV to production if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Validate required environment variables
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  log(`Environment: ${process.env.NODE_ENV}`);
  log('All required environment variables are present');
}

const app = express();

// Add health check endpoint before any other middleware
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Add readiness check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Test database connection
    const { pool } = await import('./db.js');
    await pool.query('SELECT 1');
    
    res.status(200).json({ 
      status: 'ready', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({ 
      status: 'not ready', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Enhanced error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

(async () => {
  try {
    log('Starting Dispatcher Helper server...');
    
    // Validate environment before proceeding
    validateEnvironment();
    
    // Test database connection early
    log('Testing database connection...');
    const { pool } = await import('./db.js');
    await pool.query('SELECT 1');
    log('Database connection successful');
    
    // Start scheduled tasks
    scheduler.start();
    
    // Debug: Log when API routes are being registered
    log('Registering API routes...');
    const server = await registerRoutes(app);
    log('API routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Server error:', err);
      res.status(status).json({ message });
      // Don't throw - this would crash the server
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT environment variable if available (Cloud Run compatibility)
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
    
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`Dispatcher Helper server started successfully`);
      log(`Environment: ${process.env.NODE_ENV}`);
      log(`Server listening on ${host}:${port}`);
      log(`Health check available at: http://${host}:${port}/health`);
      log(`Readiness check available at: http://${host}:${port}/ready`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
})();
